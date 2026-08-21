import type { ReactNode } from "react";

/**
 * Shared chrome for the written pages (about, FAQ, terms, privacy, contact).
 *
 * These are the pages that make the site read like a site rather than a funnel
 * into the studio, so they share one measure, one heading rhythm and one lede
 * treatment instead of each inventing their own.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-crimson-400 font-label text-xs font-bold tracking-[0.25em] uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-chrome mt-3 text-4xl sm:text-5xl">
        {title}
      </h1>
      <p className="text-chrome-dim mt-4 text-lg leading-relaxed">{lede}</p>
    </header>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 max-w-3xl">
      <h2 className="font-display text-chrome text-2xl">{title}</h2>
      <div className="text-chrome-dim mt-4 space-y-4 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** Last-updated stamp. Legal pages are worthless without one. */
export function Revised({ date }: { date: string }) {
  return (
    <p className="text-chrome-faint font-label mt-10 max-w-3xl text-xs tracking-[0.2em] uppercase">
      Last revised {date}
    </p>
  );
}
