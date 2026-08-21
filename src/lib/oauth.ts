import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { AuthProvider } from "@/generated/prisma/enums";

/**
 * OIDC authorization-code flow with PKCE, for Google and Microsoft.
 *
 * Hand-rolled rather than pulled from Auth.js because the session model here is
 * already database-backed and load-bearing: it drives the one-hour idle logout
 * and the owner console's live activity dot. Adopting a library's session
 * handling would mean rewriting both. This module only proves who the visitor
 * is; issuing the session stays with src/lib/auth.ts.
 *
 * Providers are configured entirely from the environment, so a deployment
 * without credentials simply does not offer the buttons - the same pattern the
 * Higgsfield and Stripe integrations already use.
 */

export type ProviderId = "google" | "microsoft";

export const PROVIDER_IDS: ProviderId[] = ["google", "microsoft"];

interface ProviderDef {
  id: ProviderId;
  /** The enum the Account row is stored under. */
  dbValue: AuthProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  /** Accepted `iss` values in the returned id_token. */
  issuers: string[];
  clientId: string | undefined;
  clientSecret: string | undefined;
}

/*
 * Microsoft's tenant segment. "common" accepts both work/school and personal
 * accounts; a single-tenant app should set MICROSOFT_TENANT_ID to its own
 * directory id instead, which also tightens the accepted issuer.
 */
const MS_TENANT = process.env.MICROSOFT_TENANT_ID?.trim() || "common";

function defs(): Record<ProviderId, ProviderDef> {
  return {
    google: {
      id: "google",
      dbValue: "GOOGLE",
      label: "Google",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      issuers: ["https://accounts.google.com", "accounts.google.com"],
      clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
    },
    microsoft: {
      id: "microsoft",
      dbValue: "MICROSOFT",
      label: "Microsoft",
      authorizeUrl: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
      scope: "openid email profile",
      // Microsoft mints a per-tenant issuer, so the tenant id inside the token
      // is not knowable up front on "common". Checked by prefix below.
      issuers: ["https://login.microsoftonline.com/"],
      clientId: process.env.MICROSOFT_CLIENT_ID?.trim(),
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET?.trim(),
    },
  };
}

export function getProvider(id: string): ProviderDef | null {
  if (!PROVIDER_IDS.includes(id as ProviderId)) return null;
  return defs()[id as ProviderId];
}

export function isConfigured(id: ProviderId): boolean {
  const p = defs()[id];
  return Boolean(p.clientId && p.clientSecret);
}

/** Which buttons the sign-in pages should render. */
export function configuredProviders(): { id: ProviderId; label: string }[] {
  return PROVIDER_IDS.filter(isConfigured).map((id) => ({
    id,
    label: defs()[id].label,
  }));
}

export class OAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

/** Origin used to build the redirect_uri. Must match the provider console. */
export function appOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  // Vercel sets this on every deployment, including previews.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return new URL(req.url).origin;
}

export function redirectUri(req: Request, id: ProviderId): string {
  return `${appOrigin(req)}/api/auth/oauth/${id}/callback`;
}

// --- PKCE ------------------------------------------------------------------

export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

// --- id_token --------------------------------------------------------------

export interface IdTokenClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  preferred_username?: string;
}

/**
 * Decodes and checks an id_token.
 *
 * The signature is deliberately not verified against JWKS. OIDC Core 3.1.3.7
 * permits exactly that when the token was fetched directly from the token
 * endpoint over TLS, which is the case here - there is no browser in the middle
 * of that request to tamper with it, and TLS already authenticates the issuer.
 * Skipping it avoids a JWKS fetch, cache and rotation story for no real gain.
 *
 * `iss`, `aud` and `exp` are still checked, because those defend against a
 * token that is genuine but issued for somebody else's application.
 */
export function decodeIdToken(
  idToken: string,
  provider: ProviderDef,
): IdTokenClaims {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new OAuthError("bad_token", "Malformed id_token");
  }

  let claims: IdTokenClaims;
  try {
    claims = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    ) as IdTokenClaims;
  } catch {
    throw new OAuthError("bad_token", "Unreadable id_token payload");
  }

  const issuerOk = provider.issuers.some((i) =>
    i.endsWith("/") ? claims.iss?.startsWith(i) : claims.iss === i,
  );
  if (!issuerOk) {
    throw new OAuthError("bad_issuer", "id_token came from the wrong issuer");
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(provider.clientId!)) {
    throw new OAuthError(
      "bad_audience",
      "id_token was issued for a different application",
    );
  }

  if (!claims.exp || claims.exp * 1000 <= Date.now()) {
    throw new OAuthError("expired", "id_token has expired");
  }

  if (!claims.sub) {
    throw new OAuthError("bad_token", "id_token has no subject");
  }

  return claims;
}

/**
 * Whether the provider asserts the address actually belongs to this person.
 *
 * This gates linking an OIDC identity onto an existing password account. If it
 * were not checked, anyone able to set an arbitrary unverified address at a
 * provider could sign in as an existing user of this site.
 */
export function emailIsVerified(claims: IdTokenClaims): boolean {
  const v = claims.email_verified;
  return v === true || v === "true";
}

export function displayNameFrom(claims: IdTokenClaims): string {
  const candidate =
    claims.name?.trim() ||
    claims.given_name?.trim() ||
    claims.email?.split("@")[0] ||
    "New user";
  return candidate.slice(0, 60);
}

// --- token exchange --------------------------------------------------------

export async function exchangeCode(
  provider: ProviderDef,
  params: { code: string; verifier: string; redirectUri: string },
): Promise<{ idToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: provider.clientId!,
    client_secret: provider.clientSecret!,
    code_verifier: params.verifier,
  });

  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    // Provider error bodies routinely echo the request; keep them out of logs.
    throw new OAuthError(
      "exchange_failed",
      `${provider.label} rejected the sign-in (${res.status})`,
    );
  }

  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) {
    throw new OAuthError(
      "no_id_token",
      `${provider.label} returned no id_token`,
    );
  }

  return { idToken: json.id_token };
}

export function authorizeUrlFor(
  provider: ProviderDef,
  args: { redirectUri: string; state: string; challenge: string },
): string {
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", provider.clientId!);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scope);
  url.searchParams.set("state", args.state);
  url.searchParams.set("code_challenge", args.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Ask for an account chooser rather than silently reusing whichever account
  // the browser happens to be signed into.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export const OAUTH_STATE_COOKIE = "adm_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "adm_oauth_verifier";
/** Long enough to actually sign in with, short enough to be useless if leaked. */
export const OAUTH_COOKIE_MAX_AGE_S = 10 * 60;
