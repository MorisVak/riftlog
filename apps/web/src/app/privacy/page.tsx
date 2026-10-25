import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "What information Riftlog handles, why, and which services are involved.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what information Riftlog handles, why, and which services are involved when you visit the site, join the waitlist, send a message or use the app."
    >
      <h2>Overview</h2>
      <p>
        Riftlog is an unofficial fan project for Riftbound, run by{" "}
        <Fill value={OPERATOR.name} />. You can use much of it without an
        account. There are no ads, no cookies and no tracking across other
        sites, and your data is never sold.
      </p>

      <h2>Information Riftlog handles</h2>
      <ul>
        <li>
          <strong>Visiting the site:</strong> the host logs technical data such
          as your IP address, browser and the pages you open.
        </li>
        <li>
          <strong>Visit counts:</strong> Vercel Web Analytics counts which pages
          are visited, the site you came from, and your country, browser,
          system and device type. It uses no cookies, doesn&apos;t store your IP
          address and can&apos;t tell who you are. A visit is only recognised
          as the same visitor for 24 hours.
        </li>
        <li>
          <strong>Waitlist:</strong> your email address, when you signed up and
          which version of this policy you saw.
        </li>
        <li>
          <strong>Contact form:</strong> your name, email address and message.
        </li>
        <li>
          <strong>App account:</strong> your email and the basic profile your
          sign-in provider (Discord, Google or Apple) shares, your display name
          and @handle, and your matches, notes, decks and any opponent names you
          enter.
        </li>
      </ul>
      <p>
        Guest matches stay on your phone and aren&apos;t saved. Feedback sent
        from the app isn&apos;t linked to your account.
      </p>

      <h2>How information is used</h2>
      <ul>
        <li>to run and secure the site and the app,</li>
        <li>to see how many people visit the site and which pages they read,</li>
        <li>to send one email when Riftlog launches,</li>
        <li>to answer your messages,</li>
        <li>to show you your own matches and decks. Nobody else sees them.</li>
      </ul>
      <p>
        The waitlist is based on your consent, the app on providing the service
        you signed up for, and logs, visit counts and replies on my interest in
        a working, secure site.
      </p>

      <h2>Service providers</h2>
      <p>
        Riftlog uses Vercel (USA) to host this site and count visits, and
        Supabase (Singapore) for sign-in and the database, which is hosted in
        the EU (Stockholm).
        Both process data only on my behalf, under data processing agreements
        that include the EU&apos;s standard safeguards. Nothing is shared with
        Riot Games.
      </p>

      <h2>Cookies and similar storage</h2>
      <p>
        This website uses no cookies. The app keeps your login session, the
        match you&apos;re playing and matches waiting to upload on your phone.
      </p>

      <h2>Data retention</h2>
      <p>
        Account data stays until you delete it. Waitlist emails are deleted
        after the launch email, messages once answered, and server logs after a
        short time.
      </p>

      <h2>Your choices</h2>
      <p>
        You can delete matches and decks in the app. Email{" "}
        <Fill value={OPERATOR.email} />{" "}
        to delete your account (done within 30 days), leave the waitlist, or get
        a copy of, correct or limit your data. You can also complain to a data
        protection authority, such as{" "}
        <Fill value={OPERATOR.supervisoryAuthority} />.
      </p>

      <h2>Policy changes and contact</h2>
      <p>
        This policy may change as Riftlog does; the date above shows the latest
        version. Questions? Use the <Link href="/contact">contact page</Link>{" "}
        or email <Fill value={OPERATOR.email} />.
      </p>
    </LegalPage>
  );
}
