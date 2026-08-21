import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PageHeader } from "@/components/site/Prose";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Adamantite H about support, billing or privacy.",
};

/*
 * Deliberately addresses rather than a form. A form here would need a mail
 * transport and a spam story to be anything other than a button that silently
 * drops what you typed, and a dead contact form is worse than none.
 */
const ROUTES = [
  {
    label: "Support",
    email: SITE.supportEmail,
    body: "Something broken, a generation that failed, or a question the FAQ did not cover. Include the project name and roughly when it happened.",
  },
  {
    label: "Billing",
    email: SITE.billingEmail,
    body: "Charges, refunds, plan changes and invoices. Plan changes and cancellations are also self-serve from your account page.",
  },
  {
    label: "Privacy",
    email: SITE.privacyEmail,
    body: "Data access, correction and deletion requests, and anything else covered by the privacy policy.",
  },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6">
        <PageHeader
          eyebrow="Contact"
          title="Get in touch"
          lede="Pick the right mailbox and you will get a faster answer. We read
            all three."
        />

        <div className="mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          {ROUTES.map((route) => (
            <article key={route.label} className="hud flex flex-col p-6">
              <h2 className="font-label text-crimson-400 text-xs font-bold tracking-[0.25em] uppercase">
                {route.label}
              </h2>
              <p className="text-chrome-dim mt-3 flex-1 text-sm leading-relaxed">
                {route.body}
              </p>
              <a
                href={`mailto:${route.email}`}
                className="text-chrome hover:text-crimson-300 mt-4 text-sm font-semibold break-all transition-colors"
              >
                {route.email}
              </a>
            </article>
          ))}
        </div>

        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-chrome text-2xl">
            Before you write in
          </h2>
          <ul className="text-chrome-dim mt-4 space-y-3 text-sm leading-relaxed">
            <li>
              <span className="text-chrome font-semibold">
                Signed out unexpectedly?
              </span>{" "}
              Sessions end after an hour of inactivity by design. Signing back
              in is all that is needed.
            </li>
            <li>
              <span className="text-chrome font-semibold">
                Credits look wrong?
              </span>{" "}
              Failed generations refund automatically, but the ledger settles
              when the provider reports back rather than instantly. Check the
              balance again in a minute before mailing.
            </li>
            <li>
              <span className="text-chrome font-semibold">
                Found a bug in the platform itself?
              </span>{" "}
              Issues on{" "}
              <a
                href={SITE.repoUrl}
                className="text-crimson-400 hover:text-crimson-300"
                target="_blank"
                rel="noreferrer noopener"
              >
                the repository
              </a>{" "}
              get seen sooner than mail.
            </li>
          </ul>
          <p className="text-chrome-dim mt-6 text-sm">
            Most questions are already answered in the{" "}
            <Link
              href="/faq"
              className="text-crimson-400 hover:text-crimson-300 font-semibold"
            >
              FAQ
            </Link>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
