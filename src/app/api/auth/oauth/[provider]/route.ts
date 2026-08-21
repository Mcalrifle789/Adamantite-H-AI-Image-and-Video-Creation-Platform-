import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  authorizeUrlFor,
  codeChallenge,
  getProvider,
  isConfigured,
  OAUTH_COOKIE_MAX_AGE_S,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  randomUrlSafe,
  redirectUri,
  type ProviderId,
} from "@/lib/oauth";

export const runtime = "nodejs";

/**
 * Kicks off sign-in: mints PKCE + CSRF state, parks them in short-lived
 * cookies, and bounces the visitor to the provider.
 *
 * A GET that redirects offsite rather than a POST, because it is reached from a
 * plain link. The `state` cookie is what stops a forged callback from
 * completing, so it is the security boundary here rather than the method.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: id } = await ctx.params;
  const provider = getProvider(id);

  if (!provider || !isConfigured(id as ProviderId)) {
    return NextResponse.redirect(
      new URL("/login?error=provider_unavailable", req.url),
    );
  }

  const state = randomUrlSafe();
  const verifier = randomUrlSafe(48);

  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    // The provider redirects back as a top-level GET, which lax allows. Strict
    // would drop the cookie on exactly the request that needs it.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_S,
  };
  jar.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  jar.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOpts);

  const url = authorizeUrlFor(provider, {
    redirectUri: redirectUri(req, provider.id),
    state,
    challenge: codeChallenge(verifier),
  });

  return NextResponse.redirect(url);
}
