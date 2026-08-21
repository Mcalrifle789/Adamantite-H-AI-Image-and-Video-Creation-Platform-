import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PageHeader, Revised, Section } from "@/components/site/Prose";
import { SITE } from "@/lib/site";
import { IDLE_TIMEOUT_MS } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Adamantite H collects, why, who it is shared with, and how to get it deleted.",
};

const IDLE_HOURS = IDLE_TIMEOUT_MS / (60 * 60 * 1000);

/*
 * Kept deliberately specific. A privacy policy that says "we may collect
 * certain information" tells the reader nothing; this one names the fields,
 * because they are knowable from prisma/schema.prisma.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6">
        <PageHeader
          eyebrow="Legal"
          title="Privacy Policy"
          lede="What we hold, why we hold it, and how to make us stop."
        />

        <div className="hud mt-8 max-w-3xl p-5">
          <p className="text-chrome-dim text-sm leading-relaxed">
            <strong className="text-chrome">Plain summary.</strong> We hold your
            email, a hashed password, your session records, your projects and
            your generations. Your prompts go to the model provider that runs
            the generation, and your card details go to Stripe and never touch
            our servers. We count page views ourselves, without cookies and
            without storing your IP address. We do not sell anything, we run no
            third-party or advertising trackers, and we do not train models on
            your work.
          </p>
        </div>

        <Section title="Who we are">
          <p>
            {SITE.legalEntity} is the controller of the personal data described
            here. Reach us at{" "}
            <a
              href={`mailto:${SITE.privacyEmail}`}
              className="text-crimson-400 hover:text-crimson-300"
            >
              {SITE.privacyEmail}
            </a>
            .
          </p>
        </Section>

        <Section title="What we collect">
          <p>
            <strong className="text-chrome">Account data.</strong> Your email
            address, your display name, and a bcrypt hash of your password. We
            never hold the password itself and cannot recover it for you.
          </p>
          <p>
            <strong className="text-chrome">Session data.</strong> A session
            record per sign-in, holding a hashed token, creation time and time
            last seen. The last-seen timestamp is what enforces the{" "}
            {IDLE_HOURS}-hour idle sign-out and what tells the account owner
            whether a session is currently active.
          </p>
          <p>
            <strong className="text-chrome">Content.</strong> Your projects,
            your prompts, the settings you chose, and the images and video you
            generated.
          </p>
          <p>
            <strong className="text-chrome">Linked sign-in accounts.</strong> If
            you sign in with Google or Microsoft we store that provider&apos;s
            permanent identifier for you, the email address it gave us, and when
            you last used it. We ask those providers only for your name, email
            and profile — never your contacts, files or mail — and we never
            receive your password.
          </p>
          <p>
            <strong className="text-chrome">Billing data.</strong> Your plan,
            subscription status, period dates, and the Stripe customer and
            subscription identifiers.{" "}
            <strong className="text-chrome">
              Card numbers never reach our servers
            </strong>{" "}
            — Stripe collects and stores those directly.
          </p>
          <p>
            <strong className="text-chrome">Usage data.</strong> A credit ledger
            entry for each generation and refund, so a balance can be explained
            rather than merely asserted.
          </p>
          <p>
            <strong className="text-chrome">Analytics.</strong> We record a row
            per page view: the path, the referring site&apos;s domain, how long
            the page was open, your browser, operating system and device type,
            any campaign tag in the link you followed, and the country, region
            and city our host resolves from your connection.
          </p>
          <p>
            That row carries no name and no address. Repeat visits are counted
            through a one-way hash of your IP and browser string mixed with a
            salt that changes every day, so the same person is a different value
            tomorrow and the hash cannot be reversed to an address.{" "}
            <strong className="text-chrome">
              We do not store IP addresses.
            </strong>{" "}
            If you happen to be signed in, the view is linked to your account so
            we can tell customers from strangers.
          </p>
          <p>
            The analytics are ours and run on our own servers. There is no
            Google Analytics, no advertising pixel, no third-party script and no
            data broker. We set{" "}
            <strong className="text-chrome">no analytics cookie</strong> — the
            only cookies on this site are the session cookie that keeps you
            signed in and a short-lived one used during Google or Microsoft
            sign-in. Both are strictly necessary, which is why you are not
            shown a consent banner.
          </p>
        </Section>

        <Section title="Why we hold it, and on what basis">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              Account, session and content data — to perform the contract of
              providing the service.
            </li>
            <li>
              Billing and usage data — to perform the contract, and to meet
              accounting and tax obligations.
            </li>
            <li>
              Analytics — our legitimate interest in understanding how the site
              is used. It is measured in a form that cannot identify you, which
              is what makes that basis appropriate rather than consent.
            </li>
            <li>
              Security and abuse records — our legitimate interest in keeping
              the service working and lawful.
            </li>
          </ul>
        </Section>

        <Section title="Who it is shared with">
          <p>
            <strong className="text-chrome">Model providers.</strong> To
            generate anything we must send your prompt, your chosen settings and
            any reference image you supplied to the provider running that model.
            They process it under their own terms and policies.
          </p>
          <p>
            <strong className="text-chrome">Stripe.</strong> Payment processing
            and subscription management.
          </p>
          <p>
            <strong className="text-chrome">Google and Microsoft.</strong> Only
            if you choose to sign in with them, and only to verify who you are.
            We send them no information about what you do on this site.
          </p>
          <p>
            <strong className="text-chrome">Hosting and database providers.</strong>{" "}
            Infrastructure that runs the application and stores its data, acting
            on our instructions.
          </p>
          <p>
            We share data with no one else, and we do not sell personal data to
            anyone for any purpose. We may disclose data where a law or a valid
            court order requires it.
          </p>
        </Section>

        <Section title="Training">
          <p>
            We do not use your prompts, uploads or generated output to train any
            model, and we do not license them to anyone who does. Providers
            apply their own policies to material sent to them for generation;
            those policies are theirs, not ours, and are worth reading if this
            matters to your work.
          </p>
        </Section>

        <Section title="How long we keep it">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              Account and content data: until you delete the content or close
              your account.
            </li>
            <li>
              Sessions: cleared once expired, which is at most thirty days after
              sign-in and typically within {IDLE_HOURS} hour
              {IDLE_HOURS === 1 ? "" : "s"} of your last activity.
            </li>
            <li>
              Analytics rows: 14 months, then deleted. They are not tied to an
              identity, so closing your account does not remove them.
            </li>
            <li>
              Billing and ledger records: retained after account closure for as
              long as tax and accounting law requires, typically seven years.
            </li>
          </ul>
          <p>
            Closing your account deletes your projects and generations. That is
            not reversible, so export anything you want to keep first.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Depending on where you live you may have the right to access a copy
            of your data, correct it, delete it, restrict or object to
            processing, receive it in a portable form, and complain to a
            supervisory authority.
          </p>
          <p>
            Exercise any of them by writing to{" "}
            <a
              href={`mailto:${SITE.privacyEmail}`}
              className="text-crimson-400 hover:text-crimson-300"
            >
              {SITE.privacyEmail}
            </a>
            . We will respond within thirty days and will not charge you or
            degrade your service for asking.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Passwords are stored as bcrypt hashes. Session tokens are stored
            hashed, so a copy of the database does not yield usable sessions.
            Sessions expire on inactivity and absolutely. Provider and payment
            keys are held server-side and are never sent to the browser.
          </p>
          <p>
            No system is perfectly secure. If we discover a breach affecting
            your data we will notify you and the relevant authority as the law
            requires.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The service is not intended for anyone under 13, and we do not
            knowingly hold data about them. If you believe a child has
            registered, write to us and we will delete the account.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We will announce material changes before they take effect and update
            the revision date below. The current{" "}
            <Link
              href="/terms"
              className="text-crimson-400 hover:text-crimson-300"
            >
              terms of service
            </Link>{" "}
            sit alongside this policy.
          </p>
        </Section>

        <Revised date={SITE.legalRevised} />
      </main>

      <SiteFooter />
    </>
  );
}
