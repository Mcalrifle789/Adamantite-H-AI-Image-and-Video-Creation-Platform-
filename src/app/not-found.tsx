import Link from "next/link";
import PixelDust from "@/components/PixelDust";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

/*
 * The default Next.js 404 is unstyled black-on-white and breaks the illusion
 * harder than any other page on the site, so it gets the same dust field and
 * chrome as everything else, plus somewhere useful to go next.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main className="relative flex flex-1 items-center overflow-hidden">
        <PixelDust className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(5,5,7,0.92)_0%,rgba(5,5,7,0.6)_50%,transparent_80%)]"
        />

        <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center sm:px-6">
          <p className="font-display glow-text text-crimson-400 text-7xl sm:text-8xl">
            404
          </p>
          <h1 className="font-display text-chrome mt-4 text-3xl sm:text-4xl">
            Nothing rendered here
          </h1>
          <p className="text-chrome-dim mt-4 text-base leading-relaxed">
            That page does not exist, or it moved. Your projects and everything
            in them are untouched.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/studio"
              className="btn-primary rounded-md px-6 py-3 text-sm font-semibold"
            >
              Back to the studio
            </Link>
            <Link
              href="/"
              className="btn-ghost rounded-md px-6 py-3 text-sm font-semibold"
            >
              Home
            </Link>
          </div>

          <p className="text-chrome-faint mt-8 text-sm">
            Landed here from a link on the site?{" "}
            <Link
              href="/contact"
              className="text-crimson-400 hover:text-crimson-300"
            >
              Tell us
            </Link>
            .
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
