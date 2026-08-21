/**
 * Site-level constants that are not derived from the credit model or the
 * database: contact routes, legal entity, jurisdiction.
 *
 * These are the values to change at launch. They live here rather than being
 * typed into each page so there is exactly one place to edit when the real
 * domain, mailbox and company name exist.
 */
export const SITE = {
  name: "Adamantite H",
  /** Overridable per-environment so staging never advertises the live mailbox. */
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@adamantite.example",
  billingEmail: process.env.BILLING_EMAIL ?? "billing@adamantite.example",
  privacyEmail: process.env.PRIVACY_EMAIL ?? "privacy@adamantite.example",
  /** Named in the terms; replace with the registered entity before launch. */
  legalEntity: "Adamantite H",
  jurisdiction: "the State of Texas, United States",
  repoUrl:
    "https://github.com/Mcalrifle789/Adamantite-H-AI-Image-and-Video-Creation-Platform-",
  /** Shown on the legal pages. Bump when the text materially changes. */
  legalRevised: "20 August 2026",
} as const;
