import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  alternates: { canonical: "/terms" },
  description: "The terms for using the Riftlog app and riftlog.net.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        These terms apply to the Riftlog mobile app and this website. Riftlog
        is offered by <Fill value={OPERATOR.name} />{" "}(&quot;I&quot;, &quot;me&quot;). By using
        Riftlog you agree to them. If you don&apos;t, please don&apos;t use it.
      </p>

      <h2>1. What Riftlog is</h2>
      <p>
        Riftlog is a free, fan-made companion app for the Riftbound trading card
        game. It keeps score during in-person games and keeps a history of your
        matches and decks. It is not a way to play Riftbound.
      </p>
      <p>
        Riftlog is not affiliated with, endorsed by, or sponsored by Riot Games.
        Riftbound and all related names, imagery and trademarks are the property
        of Riot Games. Riftlog was created under Riot Games&apos; &apos;Legal
        Jibber Jabber&apos; policy using assets owned by Riot Games.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>
          You can use the score tracker without an account. Saving matches and
          decks needs one.
        </li>
        <li>
          Keep access to your sign-in method (Discord, Google, Apple or email)
          safe. You&apos;re responsible for what happens in your account.
        </li>
        <li>
          Your @handle must not impersonate someone else or be offensive. I
          may change or remove a handle that breaks this.
        </li>
        <li>
          You can stop using Riftlog at any time and ask me to delete your
          account (see the <Link href="/privacy">Privacy Policy</Link>).
        </li>
      </ul>

      <h2>3. Your content</h2>
      <p>
        Matches, notes and decks you enter stay yours. You give me only the
        permission I need to store them and show them back to you. Don&apos;t
        enter anything unlawful, and only use other people&apos;s names as
        opponents if they&apos;re fine with it.
      </p>

      <h2>4. Fair use</h2>
      <p>
        Don&apos;t misuse Riftlog: no attempts to access other people&apos;s
        data, overload or attack the service, or get around its limits. I may
        suspend accounts that do.
      </p>

      <h2>5. Availability and changes</h2>
      <p>
        Riftlog is a free hobby project. I work to keep it running and your
        data safe, but I can&apos;t promise it will always be available or
        free of errors, and I may change or end features. If I ever shut
        Riftlog down, I&apos;ll give reasonable notice where I can so you can
        request a copy of your data.
      </p>

      <h2>6. Liability</h2>
      <p>
        I am liable without limitation for intent and gross negligence, for
        injury to life, body or health, and under the German Product Liability
        Act. For slight negligence, I am liable only for breaches of
        essential obligations (obligations that make using Riftlog possible in
        the first place and that you may rely on), limited to the damage
        typically foreseeable. Beyond that, my liability for slight negligence
        is excluded, as far as the law allows.
      </p>

      <h2>7. Changes to these terms</h2>
      <p>
        I may update these terms, for example when Riftlog gains new features.
        The date of the latest version is shown at the top. For changes that
        affect you significantly, I&apos;ll tell you in the app.
      </p>

      <h2>8. Law</h2>
      <p>
        German law applies. If you&apos;re a consumer living in another EU
        country, the mandatory consumer protection rules of that country still
        apply to you.
      </p>
      <p>
        Questions? Email <Fill value={OPERATOR.email} />.
      </p>
    </LegalPage>
  );
}
