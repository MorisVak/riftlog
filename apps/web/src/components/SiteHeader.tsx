import Link from "next/link";
import { Wordmark } from "./Wordmark";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#preview", label: "Preview" },
  { href: "#waitlist", label: "Waitlist" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="#top" aria-label="Riftlog home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-display text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#waitlist"
          className="rounded-full bg-accent px-5 py-2 font-display text-sm font-semibold text-background shadow-accent-btn transition-colors hover:bg-accent-soft active:bg-accent-strong"
        >
          Join the waitlist
        </a>
      </div>
    </header>
  );
}
