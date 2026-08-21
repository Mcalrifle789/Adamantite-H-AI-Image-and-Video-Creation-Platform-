import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PageHeader, Revised, Section } from "@/components/site/Prose";
import { SITE } from "@/lib/site";
import { IDLE_TIMEOUT_MS } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement covering use of the Adamantite H image and video generation service.",
};

const IDLE_HOURS = IDLE_TIMEOUT_MS / (60 * 60 * 1000);

export default function TermsPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6">
        <PageHeader
          eyebrow="Legal"
          title="Terms of Service"
          lede={`These terms cover your use of ${SITE.name}. Creating an account means you accept them.`}
        />

        <div className="hud mt-8 max-w-3xl p-5">
          <p className="text-chrome-dim text-sm leading-relaxed">
            <strong className="text-chrome">Plain summary.</strong> You own what
            you make. We run the models on your behalf out of a shared provider
            key funded by your subscription. Do not generate illegal material or
            resell raw access to the models. Credits reset each period and do
            not roll over. Either of us can end the arrangement at any time.
            This box is a summary, not a substitute for what follows.
          </p>
        </div>

        <Section title="1. The service">
          <p>
            {SITE.name} provides access to third-party image and video
            generation models through a single interface and a single
            subscription. We are an intermediary: the models are operated by
            their respective providers, and their availability, behaviour and
            output quality are outside our control.
          </p>
          <p>
            Models may be added, changed or removed as providers release and
            retire them. We will not delete work you have already generated
            because the model that produced it is gone.
          </p>
        </Section>

        <Section title="2. Accounts">
          <p>
            You must give an accurate email address and keep your password
            secret. You are responsible for what happens under your account. Do
            not share credentials or let anyone else use your account.
          </p>
          <p>
            Sessions end automatically after {IDLE_HOURS} hour
            {IDLE_HOURS === 1 ? "" : "s"} of inactivity, and in any case expire
            after thirty days. This is a security measure, enforced on our
            servers rather than trusted to the browser, and it is not something
            you can switch off.
          </p>
          <p>
            One person, one account. Accounts are not transferable and may not
            be sold.
          </p>
        </Section>

        <Section title="3. Subscriptions, credits and billing">
          <p>
            Paid plans are billed monthly in advance through Stripe. We do not
            store your card details. Prices are shown on the{" "}
            <Link
              href="/pricing"
              className="text-crimson-400 hover:text-crimson-300"
            >
              pricing page
            </Link>{" "}
            and are in US dollars.
          </p>
          <p>
            Each plan grants a fixed pool of credits at the start of every
            billing period.{" "}
            <strong className="text-chrome">Credits do not roll over</strong>{" "}
            and have no cash value. Registering without a paid plan grants{" "}
            {PLANS.FREE.credits} credits so you can evaluate the service.
          </p>
          <p>
            Credits are deducted when a generation is submitted and refunded
            automatically if it fails, times out, or is withheld by the
            provider. Credits spent on a generation that succeeded are not
            refundable because you did not like the result.
          </p>
          <p>
            You may cancel at any time; cancellation takes effect at the end of
            the current period and we do not pro-rate part-months. If we change
            prices or plan allowances we will tell you before the change applies
            to your renewal.
          </p>
        </Section>

        <Section title="4. Your content">
          <p>
            You keep all rights you have in the prompts you write and the output
            you generate. We claim no ownership of either.
          </p>
          <p>
            You grant us only the licence we need to operate the service:
            transmitting your prompts and reference material to the relevant
            model provider, storing your generations so they appear in your
            projects, and serving them back to you.
          </p>
          <p>
            We do not use your prompts or your output to train models. Model
            providers apply their own policies to material sent to them, which
            we cannot vary on your behalf.
          </p>
          <p>
            The copyright status of AI-generated material differs by
            jurisdiction, and in several countries such output may not attract
            copyright protection at all. Take your own advice if that matters to
            your use.
          </p>
        </Section>

        <Section title="5. Acceptable use">
          <p>You may not use the service to produce or attempt to produce:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              sexual material involving minors, or any material that sexualises
              a minor;
            </li>
            <li>
              intimate or sexual imagery of a real person without their consent;
            </li>
            <li>
              material intended to defraud, defame, harass or impersonate a real
              person, including synthetic likenesses presented as genuine;
            </li>
            <li>
              content that incites violence or promotes terrorism or self-harm;
            </li>
            <li>
              material that infringes someone else&apos;s copyright, trade mark
              or other rights.
            </li>
          </ul>
          <p>You also may not:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              resell, sublicense or proxy raw model access, or operate the
              service as a backend for a competing product;
            </li>
            <li>
              script, scrape or otherwise automate the service beyond normal
              interactive use;
            </li>
            <li>
              attempt to reach another account&apos;s data, or probe, scan or
              interfere with the infrastructure.
            </li>
          </ul>
          <p>
            We may suspend or terminate an account that breaches this section.
            Where the breach is serious we may do so without notice, and we may
            report unlawful material to the relevant authorities.
          </p>
        </Section>

        <Section title="6. Availability">
          <p>
            We do not promise the service will be uninterrupted or error-free.
            It depends on third-party providers, and their outages become our
            outages. Where a provider failure costs you credits, those credits
            are refunded; that refund is the remedy.
          </p>
        </Section>

        <Section title="7. Liability">
          <p>
            To the fullest extent the law allows, {SITE.legalEntity} is not
            liable for indirect, incidental or consequential loss, for lost
            profits, or for loss of data or generated output. Our total
            liability for any claim is limited to the amount you paid us in the
            twelve months before the claim arose.
          </p>
          <p>
            Nothing here limits liability that cannot lawfully be limited,
            including for death or personal injury caused by negligence, or for
            fraud.
          </p>
        </Section>

        <Section title="8. Changes and termination">
          <p>
            We may update these terms. Material changes will be announced before
            they take effect, and the revision date below will change. Carrying
            on using the service after that means you accept the new version.
          </p>
          <p>
            You may close your account at any time. We may terminate an account
            for breach of these terms, or for any reason on thirty days&apos;
            notice with a refund of the unused part of a paid period.
          </p>
        </Section>

        <Section title="9. Governing law">
          <p>
            These terms are governed by the laws of {SITE.jurisdiction}, and the
            courts there have exclusive jurisdiction over any dispute.
          </p>
          <p>
            Questions about these terms:{" "}
            <a
              href={`mailto:${SITE.supportEmail}`}
              className="text-crimson-400 hover:text-crimson-300"
            >
              {SITE.supportEmail}
            </a>
            .
          </p>
        </Section>

        <Revised date={SITE.legalRevised} />
      </main>

      <SiteFooter />
    </>
  );
}
