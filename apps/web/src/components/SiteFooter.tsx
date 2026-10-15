import Link from "next/link";

const LINKS = [
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/impressum", label: "Impressum" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
        {/* Riot Games policy — both statements required, verbatim. Do not alter. */}
        <div className="max-w-2xl space-y-2 font-display text-xs leading-relaxed text-ink-secondary">
          <p>
            Riftlog was created under Riot Games&apos; &apos;Legal Jibber
            Jabber&apos; policy using assets owned by Riot Games. Riot Games
            does not endorse or sponsor this project.
          </p>
          <p>
            Riftlog is a fan-made application and is not affiliated with,
            endorsed by, or sponsored by Riot Games. All Riftbound imagery and
            trademarks are property of Riot Games.
          </p>
          <p>© {new Date().getFullYear()} Riftlog</p>
        </div>
        <nav aria-label="Legal" className="flex shrink-0 flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-sm text-ink-secondary transition-colors hover:text-ink-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
