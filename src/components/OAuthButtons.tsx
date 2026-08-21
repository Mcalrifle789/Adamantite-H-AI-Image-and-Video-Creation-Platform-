import { configuredProviders } from "@/lib/oauth";

/**
 * Google and Microsoft sign-in.
 *
 * Plain links, not fetch calls: OIDC needs a full top-level navigation to the
 * provider, and an XHR cannot produce one. Rendered on the server so an
 * unconfigured provider never reaches the browser at all - the same
 * degrade-quietly rule the generation and billing integrations follow.
 */
export default function OAuthButtons({
  mode,
}: {
  mode: "login" | "register";
}) {
  const providers = configuredProviders();
  if (providers.length === 0) return null;

  const verb = mode === "register" ? "Sign up" : "Sign in";

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2.5">
        {providers.map((p) => (
          <a
            key={p.id}
            href={`/api/auth/oauth/${p.id}`}
            className="btn-ghost flex items-center justify-center gap-3 rounded-md px-4 py-2.5 text-sm font-semibold"
          >
            {p.id === "google" ? <GoogleMark /> : <MicrosoftMark />}
            {verb} with {p.label}
          </a>
        ))}
      </div>

      <div
        className="text-chrome-faint font-label my-6 flex items-center gap-3 text-xs tracking-[0.2em] uppercase"
        aria-hidden="true"
      >
        <span className="bg-edge h-px flex-1" />
        or
        <span className="bg-edge h-px flex-1" />
      </div>
    </div>
  );
}

/* Brand marks are inlined so a blocked CDN cannot leave an unlabelled button. */

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path fill="#F25022" d="M0 0h8.55v8.55H0z" />
      <path fill="#7FBA00" d="M9.45 0H18v8.55H9.45z" />
      <path fill="#00A4EF" d="M0 9.45h8.55V18H0z" />
      <path fill="#FFB900" d="M9.45 9.45H18V18H9.45z" />
    </svg>
  );
}
