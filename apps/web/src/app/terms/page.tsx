import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
  description: "The terms for using Riftlog and riftlog.net.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="The terms for using the Riftlog app and this website: what Riftlog is, what you can expect from it, and what's expected of you."
    >
      <h2>Unofficial fan project</h2>
      <p>
        Riftlog is a free, unofficial fan project for Riftbound, run by{" "}
        <Fill value={OPERATOR.name} />. It was created under Riot Games&apos;
        &apos;Legal Jibber Jabber&apos; policy using assets owned by Riot Games.
        Riot Games does not endorse or sponsor this project.
      </p>

      <h2>Using Riftlog</h2>
      <p>
        Use Riftlog for keeping score and tracking your own games. Don&apos;t
        try to access other people&apos;s data, attack or overload the service,
        or get around its limits. Accounts that do may be suspended.
      </p>

      <h2>Your account and content</h2>
      <p>
        Your matches, notes and decks stay yours; Riftlog only stores them so it
        can show them back to you. Pick an @handle that doesn&apos;t impersonate
        anyone and isn&apos;t offensive, and only enter opponents&apos; names if
        they&apos;re fine with it. You can stop using Riftlog and have your
        account deleted at any time (see the{" "}
        <Link href="/privacy">Privacy Policy</Link>).
      </p>

      <h2>Accuracy and availability</h2>
      <p>
        Riftlog is a hobby project. I work to keep it running and your data
        safe, but I can&apos;t promise it&apos;s always available or free of
        bugs, and features may change. If Riftlog ever shuts down, I&apos;ll give
        notice where I can so you can ask for a copy of your data.
      </p>

      <h2>Liability limits</h2>
      <p>
        I&apos;m fully liable for intent and gross negligence and for harm to
        life, body or health. For minor negligence I&apos;m only liable if an
        essential duty is breached, and then only for typical, foreseeable
        damage. German law applies; if you&apos;re a consumer in another EU
        country, your local consumer protections still apply.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If these terms change, the date above changes too, and big changes are
        announced in the app. Questions? Use the{" "}
        <Link href="/contact">contact page</Link> or email{" "}
        <Fill value={OPERATOR.email} />.
      </p>
    </LegalPage>
  );
}
