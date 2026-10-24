import Link from "next/link";
import { Wordmark } from "./Wordmark";

const LEGAL_LINKS = [
  { href: "/legal-notice", label: "Legal Notice" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/contact", label: "Contact" },
];

const linkClass =
  "font-display text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Riftlog home">
            <Wordmark />
          </Link>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-8 gap-y-3">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 space-y-3 border-t border-border/60 pt-8">
          {/* Riot Games policy — both statements required, verbatim. Do not alter. */}
          <p className="max-w-3xl font-display text-xs leading-relaxed text-ink-secondary">
            Riftlog is a fan-made application and is not affiliated with,
            endorsed by, or sponsored by Riot Games. All Riftbound imagery and
            trademarks are property of Riot Games.
          </p>
          <p className="max-w-3xl font-display text-xs leading-relaxed text-ink-secondary">
            Riftlog was created under Riot Games&apos; &apos;Legal Jibber
            Jabber&apos; policy using assets owned by Riot Games. Riot Games
            does not endorse or sponsor this project.
          </p>
          {/* Required credit for the Android robot (CC BY 3.0), shown in the
              hero's platform chips. */}
          <p className="max-w-3xl font-display text-xs leading-relaxed text-ink-secondary">
            The Android robot is reproduced or modified from work created and
            shared by Google and used according to terms described in the
            Creative Commons 3.0 Attribution License.
          </p>
          <p className="pt-1 font-display text-xs text-ink-secondary">
            © {new Date().getFullYear()} Riftlog
          </p>
        </div>
      </div>
    </footer>
  );
}
