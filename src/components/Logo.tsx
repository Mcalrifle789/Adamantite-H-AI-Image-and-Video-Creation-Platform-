import Link from "next/link";

/**
 * The logotype from the mockup: "Adam" and the trailing "H" in crimson with a
 * glow, "antite" in chrome white. Rendered as live text rather than an image so
 * it stays crisp at any size and remains selectable and readable to screen
 * readers, which get the plain string via aria-label.
 */
export default function Logo({
  size = "md",
  href = "/",
  subtitle,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  subtitle?: string;
}) {
  const scale = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
    xl: "text-7xl sm:text-8xl",
  }[size];

  const mark = (
    <span
      className={`font-display ${scale} leading-none tracking-tight`}
      aria-label="Adamantite H"
    >
      <span aria-hidden="true" className="text-crimson-500 glow-text">
        Adam
      </span>
      <span aria-hidden="true" className="text-chrome">
        antite
      </span>
      <span aria-hidden="true" className="text-crimson-500 glow-text">
        {" "}
        H
      </span>
    </span>
  );

  const block = (
    <span className="inline-flex flex-col items-center">
      {mark}
      {subtitle ? (
        <span className="font-display text-crimson-400 glow-text mt-1 text-lg tracking-[0.35em] uppercase">
          {subtitle}
        </span>
      ) : null}
    </span>
  );

  if (!href) return block;

  return (
    <Link href={href} className="inline-flex rounded-sm">
      {block}
    </Link>
  );
}
