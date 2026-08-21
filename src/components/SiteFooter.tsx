import Link from "next/link";
import { SITE } from "@/lib/site";

/*
 * A real sitemap footer rather than a row of four links. The spec asks for the
 * site to behave like a site, and the written pages only count as part of it if
 * something reliably points at them from every page.
 */
const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/studio", label: "Studio" },
      { href: "/models", label: "Models" },
      { href: "/pricing", label: "Pricing" },
      { href: "/projects", label: "Projects" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Register" },
      { href: "/account", label: "Your account" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-edge/70 mt-auto border-t">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <p className="font-display text-chrome text-xl">{SITE.name}</p>
            <p className="text-chrome-dim mt-2 max-w-xs text-sm leading-relaxed">
              Every serious image and video model, one subscription, one credit
              pool.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-chrome-faint font-label text-xs font-bold tracking-[0.2em] uppercase">
                {column.heading}
              </h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-chrome-dim hover:text-chrome text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-edge/70 text-chrome-faint mt-10 flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {SITE.legalEntity}. All rights
            reserved.
          </p>
          <p className="sm:ml-auto">
            Generated output belongs to the person who made it.
          </p>
        </div>
      </div>
    </footer>
  );
}
