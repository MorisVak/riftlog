import { Wordmark } from "./Wordmark";

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#preview", label: "Preview" },
  { href: "#waitlist", label: "Waitlist" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-display text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-border/60 pt-8">
          {/* Riot Games policy — required disclaimer, verbatim. Do not alter. */}
          <p className="max-w-3xl font-display text-xs leading-relaxed text-ink-tertiary">
            Riftlog is a fan-made application and is not affiliated with,
            endorsed by, or sponsored by Riot Games. All Riftbound imagery and
            trademarks are property of Riot Games.
          </p>
          <p className="mt-4 font-display text-xs text-ink-tertiary">
            © {new Date().getFullYear()} Riftlog
          </p>
        </div>
      </div>
    </footer>
  );
}
