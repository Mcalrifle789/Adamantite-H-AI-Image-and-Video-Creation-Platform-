import { NextResponse } from "next/server";
import { clientIp, HttpError, route } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * A bcrypt hash of a throwaway value. Verified against when no account matches
 * so a miss costs the same time as a wrong password, which stops the response
 * time from revealing whether an email is registered.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9zFpr1V0mrPQ2b0Y2VLQ7VbFqTVZ7Aq";

export const POST = route(async (req: Request) => {
  const { email, password } = loginSchema.parse(await req.json());

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true,
    },
  });

  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    throw new HttpError(401, "That email and password do not match");
  }

  await createSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  });

  await track("login", { userId: user.id, meta: { method: "password" } });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });
});
