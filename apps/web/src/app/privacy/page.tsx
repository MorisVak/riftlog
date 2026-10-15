import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "What data Riftlog handles, why, and what you can do about it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What data Riftlog handles when you visit this site, join the waitlist, send a message or use the app, and what you can do about it."
    >
      <h2>Overview</h2>
      <p>
        Riftlog is a free fan project run by one person,{" "}
        <Fill value={OPERATOR.name} />. It collects as little as possible: no
        ads, no tracking, no cookies, no analytics, and your data is never sold.
      </p>

      <h2>Visiting this site</h2>
      <p>
        The site is hosted by Vercel. To deliver pages, Vercel briefly logs
        technical data like your IP address and browser. That&apos;s needed to
        keep the site running and secure. Fonts load from riftlog.net itself.
      </p>

      <h2>The waitlist</h2>
      <p>
        If you join, I store your email address, when you signed up and which
        version of this policy you saw, and use it for one email when Riftlog
        launches. Then I delete it. This is based
        on your consent: email <Fill value={OPERATOR.email} />{" "}
        any time before launch and I&apos;ll delete it sooner.
      </p>

      <h2>The contact form</h2>
      <p>
        If you send a message, I store your name, email and message so I can
        reply, and delete it once we&apos;re done.
      </p>

      <h2>The app</h2>
      <p>
        You can play as a guest; guest matches stay on your phone and
        aren&apos;t saved. If you create an account, I store what the app needs
        to work for you:
      </p>
      <ul>
        <li>
          your email and the basic profile your sign-in provider (Discord,
          Google or Apple) shares, like your name;
        </li>
        <li>your display name and @handle;</li>
        <li>
          your matches, notes, decks and any opponent names you type in. Only
          you can see them.
        </li>
      </ul>
      <p>
        Email sign-in codes are sent by{" "}
        <Fill value="[[EMAIL SENDER, e.g. Supabase or your SMTP provider]]" />.
        Feedback you send from the app isn&apos;t linked to your account.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li>
          <strong>Vercel</strong> (USA) hosts this website.
        </li>
        <li>
          <strong>Supabase</strong> (USA) runs sign-in and the database. Your
          data is stored in the EU (Stockholm){" "}
          <Fill value="[[CHECK: Supabase DPA signed?]]" />.
        </li>
      </ul>
      <p>
        Both only process data on my behalf, under data processing agreements
        with the EU&apos;s standard safeguards. Nothing is shared with Riot
        Games.
      </p>

      <h2>How long data is kept</h2>
      <p>
        Account data stays until you delete it. You can delete matches and decks
        in the app; to delete your whole account, email{" "}
        <Fill value={OPERATOR.email} />{" "}and it&apos;s done within 30 days.
        Waitlist emails go after the launch email, messages once answered.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, have it corrected or deleted, limit
        or object to how it&apos;s used, take it elsewhere, or withdraw consent.
        Just email <Fill value={OPERATOR.email} />. You can also complain to a
        data protection authority, such as{" "}
        <Fill value={OPERATOR.supervisoryAuthority} />.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If this policy changes, the date above changes too. Questions? Use the{" "}
        <Link href="/contact">contact page</Link> or email{" "}
        <Fill value={OPERATOR.email} />.
      </p>
    </LegalPage>
  );
}
