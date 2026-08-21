import "server-only";

import { createHash } from "node:crypto";

/**
 * Higgsfield does not sign its webhook deliveries, so the callback URL carries
 * a shared secret derived from WEBHOOK_SECRET. That only proves the caller has
 * seen a URL we issued; it is not proof of origin, which is why the webhook
 * handler still re-reads every result from the authenticated status endpoint
 * before trusting it. The token is a hash rather than the raw secret so the
 * secret itself never travels to a third party.
 */
export function webhookToken(providerId: string): string | null {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return null;
  return createHash("sha256")
    .update(`${secret}:${providerId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Public base URL of this deployment, used to build absolute callback URLs. */
export function appUrl(): string | null {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  // Vercel injects this for preview and production deployments.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : null;
}

/**
 * Returns undefined when the deployment has no public URL - localhost cannot
 * receive a callback - in which case the studio falls back to polling.
 */
export function webhookUrlFor(providerId: string): string | undefined {
  const base = appUrl();
  const token = webhookToken(providerId);
  if (!base || !token) return undefined;
  if (!base.startsWith("https://")) return undefined;
  return `${base}/api/webhooks/${providerId}?token=${token}`;
}
