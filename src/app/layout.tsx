import type { Metadata } from "next";
import localFont from "next/font/local";
import Analytics from "@/components/Analytics";
import "./globals.css";

/*
 * The four faces named in the spec, all self-hosted so the site has no external
 * font dependency and never falls through to a system default.
 *
 * Sources live in src/fonts rather than public/fonts: next/font emits its own
 * hashed, immutably-cached copy into the build, and anything left in public/
 * would be a second copy of the same bytes on a weaker cache header. Arial CE
 * is the exception - globals.css references it by URL, so it stays in public/.
 * It sits at the end of every stack below, which is what keeps the last resort
 * a named shipped file rather than whatever the OS would have picked.
 */

/** Logotype and headings. Widest repertoire of the display faces. */
const display = localFont({
  variable: "--font-kaluar",
  display: "swap",
  fallback: ["Arial CE", "Arial", "serif"],
  src: [
    { path: "../fonts/kaluar-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/kaluar-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/kaluar-900.woff2", weight: "900", style: "normal" },
  ],
});

/** Body, UI and the chat box. Full ASCII, so prompts render whatever is typed. */
const sans = localFont({
  variable: "--font-raleway",
  display: "swap",
  fallback: ["Arial CE", "Arial", "sans-serif"],
  src: [
    { path: "../fonts/raleway-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/raleway-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/raleway-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/raleway-700.woff2", weight: "700", style: "normal" },
  ],
});

/*
 * Eyebrows, tier badges and other tracked uppercase micro-type only.
 * The trial cut has no $ % & + < = > @ ^ ` | ~, so it is deliberately kept off
 * prices, email addresses and any free text; those glyphs would otherwise drop
 * to the fallback mid-word. Raleway follows it in the stack to catch anything
 * that slips through.
 */
const label = localFont({
  variable: "--font-relevance",
  display: "swap",
  fallback: ["Arial CE", "Arial", "sans-serif"],
  src: [
    { path: "../fonts/relevance-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/relevance-600.woff2", weight: "600", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Adamantite H - AI Image & Video Creator",
    template: "%s - Adamantite H",
  },
  description:
    "Generate images and video across Nano Banana, Kling, Seedance, GPT Image, Grok, Veo and Sora from one studio.",
  openGraph: {
    title: "Adamantite H",
    description:
      "One studio for the best image and video models. Pick a model, write a prompt, ship the shot.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${label.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-void text-chrome">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
