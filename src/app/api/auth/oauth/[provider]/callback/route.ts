import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientIp } from "@/lib/api";
import { createSession, safeEqual } from "@/lib/auth";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";
import {
  decodeIdToken,
  displayNameFrom,
  emailIsVerified,
  exchangeCode,
  getProvider,
  isConfigured,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAuthError,
  redirectUri,
  type ProviderId,
} from "@/lib/oauth";

export const runtime = "nodejs";

function fail(req: Request, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
}

/**
 * Completes sign-in.
 *
 * Resolution order is deliberate:
 *   1. a known (provider, sub) pair signs straight in;
 *   2. otherwise a *verified* email matching an existing account links to it;
 *   3. otherwise a new account is created.
 *
 * Step 2 is the dangerous one. Linking on an unverified address would let
 * anyone who can set an arbitrary email at a provider walk into an existing
 * account here, so it is refused and the visitor is sent back to the password
 * form instead.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: id } = await ctx.params;
  const provider = getProvider(id);
  if (!provider || !isConfigured(id as ProviderId)) {
    return fail(req, "provider_unavailable");
  }

  const url = new URL(req.url);
  const jar = await cookies();

  // Clear the handshake cookies whatever happens next; they are single-use.
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = jar.get(OAUTH_VERIFIER_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);
  jar.delete(OAUTH_VERIFIER_COOKIE);

  if (url.searchParams.get("error")) {
    // The visitor pressed cancel on the provider's consent screen.
    return fail(req, "cancelled");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !expectedState || !verifier) {
    return fail(req, "bad_callback");
  }
  if (!safeEqual(state, expectedState)) {
    return fail(req, "bad_state");
  }

  let claims;
  try {
    const { idToken } = await exchangeCode(provider, {
      code,
      verifier,
      redirectUri: redirectUri(req, provider.id),
    });
    claims = decodeIdToken(idToken, provider);
  } catch (err) {
    if (err instanceof OAuthError) return fail(req, err.code);
    console.error("OAuth callback failed:", err);
    return fail(req, "oauth_failed");
  }

  const email = claims.email?.trim().toLowerCase() || null;

  const existingAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: provider.dbValue,
        providerAccountId: claims.sub,
      },
    },
    select: { id: true, userId: true },
  });

  let userId: string;
  let isNewUser = false;

  if (existingAccount) {
    userId = existingAccount.userId;
    await db.account.update({
      where: { id: existingAccount.id },
      data: { lastLoginAt: new Date(), email },
    });
  } else {
    const byEmail = email
      ? await db.user.findUnique({ where: { email }, select: { id: true } })
      : null;

    if (byEmail) {
      if (!emailIsVerified(claims)) {
        return fail(req, "email_unverified");
      }
      userId = byEmail.id;
      await db.account.create({
        data: {
          userId,
          provider: provider.dbValue,
          providerAccountId: claims.sub,
          email,
        },
      });
    } else {
      if (!email) return fail(req, "no_email");

      /*
       * Same owner bootstrap as the password register route: the first account
       * on a fresh deployment, or whoever matches OWNER_EMAIL, gets the role.
       */
      const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
      const userCount = await db.user.count();
      const isOwner = userCount === 0 || (!!ownerEmail && ownerEmail === email);

      const created = await db.user.create({
        data: {
          email,
          displayName: displayNameFrom(claims),
          // No password: this account can only ever be reached through OIDC
          // until the owner adds one.
          passwordHash: null,
          role: isOwner ? "OWNER" : "USER",
          accounts: {
            create: {
              provider: provider.dbValue,
              providerAccountId: claims.sub,
              email,
            },
          },
        },
        select: { id: true },
      });
      userId = created.id;
      isNewUser = true;
    }
  }

  await createSession(userId, {
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  });

  await track(isNewUser ? "signup" : "login", {
    userId,
    meta: { method: provider.id },
  });

  return NextResponse.redirect(new URL("/studio", req.url));
}
