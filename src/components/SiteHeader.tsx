import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCreditState } from "@/lib/credits";
import { planFor } from "@/lib/plans";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";

/**
 * Site chrome shared by every page. The spec asks for real navigation rather
 * than one page redirecting straight into another, so this renders on the
 * marketing pages and the studio alike.
 */
export default async function SiteHeader() {
  const user = await getCurrentUser();

  // Credit state needs a database round trip, so it is only fetched when there
  // is actually someone signed in to show it to.
  const credits = user ? await getCreditState(user.id) : null;

  return (
    <header className="border-edge/70 bg-void/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-7xl items-center gap-6 px-4 py-3 sm:px-6"
      >
        <Logo size="sm" />

        <div className="text-chrome-dim hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/studio" className="hover:text-chrome transition-colors">
            Studio
          </Link>
          <Link href="/models" className="hover:text-chrome transition-colors">
            Models
          </Link>
          <Link href="/pricing" className="hover:text-chrome transition-colors">
            Pricing
          </Link>
          {user ? (
            <Link
              href="/projects"
              className="hover:text-chrome transition-colors"
            >
              Projects
            </Link>
          ) : null}
          {user?.role === "OWNER" ? (
            <Link
              href="/admin"
              className="text-crimson-400 hover:text-crimson-300 transition-colors"
            >
              Owner
            </Link>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user && credits ? (
            <>
              <Link
                href="/account"
                className="hidden text-right text-xs sm:block"
              >
                <span className="text-chrome block font-semibold">
                  {user.displayName}
                </span>
                <span className="text-chrome-dim block">
                  {planFor(credits.plan).name} ·{" "}
                  {credits.remaining.toLocaleString()} credits
                </span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="btn-primary rounded-md px-4 py-2 text-sm font-semibold"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
