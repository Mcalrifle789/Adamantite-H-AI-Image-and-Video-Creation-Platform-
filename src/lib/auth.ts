import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { Role } from "@/generated/prisma/enums";

/**
 * Session handling.
 *
 * Sessions are rows in Postgres rather than stateless JWTs. Two requirements in
 * the spec force that choice:
 *   - "if an account has been idle for more than 1 hour it signs them out",
 *     which needs server-side last-activity tracking that cannot be forged;
 *   - the owner console shows a live green dot for accounts currently active,
 *     which needs a queryable set of live sessions.
 *
 * The cookie carries a 32-byte random token. Only its SHA-256 is stored, so a
 * database leak does not hand out usable sessions.
 */

export const SESSION_COOKIE = "adm_session";

/** Sign out after this much inactivity. */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

/** Hard cap regardless of activity, so a session cannot live forever. */
export const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * `lastSeenAt` is only written when it is at least this stale, so an active
 * browsing session does not issue a write on every single request.
 */
const TOUCH_INTERVAL_MS = 60 * 1000;

const BCRYPT_ROUNDS = 12;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Constant-time compare for opaque tokens. Used where a lookup is not by
 * primary key, to keep timing from leaking a prefix match.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Issues a session and sets the cookie. Returns the raw token. */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<string> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + ABSOLUTE_TIMEOUT_MS);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

/**
 * Resolves the current user, enforcing both timeouts and refreshing activity.
 * Returns null for anonymous, expired or revoked sessions.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, email: true, displayName: true, role: true },
      },
    },
  });

  if (!session || session.revokedAt) return null;

  const now = Date.now();
  const idleFor = now - session.lastSeenAt.getTime();

  if (session.expiresAt.getTime() <= now || idleFor > IDLE_TIMEOUT_MS) {
    // Revoke rather than delete so the owner console keeps an audit trail.
    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  if (idleFor > TOUCH_INTERVAL_MS) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return session.user;
}

/** Same as getCurrentUser but throws, for use inside API routes. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER") throw new ForbiddenError();
  return user;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * A session counts as "active" for the owner console when it is unrevoked,
 * unexpired, and has been seen within the idle window.
 */
export function activeSessionWhere() {
  const now = new Date();
  return {
    revokedAt: null,
    expiresAt: { gt: now },
    lastSeenAt: { gt: new Date(now.getTime() - IDLE_TIMEOUT_MS) },
  };
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor() {
    super("Not allowed");
    this.name = "ForbiddenError";
  }
}
