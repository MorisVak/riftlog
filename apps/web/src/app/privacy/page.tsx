import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "How Riftlog handles your data on riftlog.net and in the Riftlog app.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Riftlog is a solo project, and it collects as little data as possible:
        no ads, no tracking, no cookies, no analytics.
      </p>

      <h2>1. Who I am</h2>
      <p>
        <Fill value={OPERATOR.name} />
        <br />
        <Fill value={OPERATOR.street} />
        <br />
        <Fill value={OPERATOR.city} />
        <br />
        {OPERATOR.country}
        <br />
        Email: <Fill value={OPERATOR.email} />
      </p>

      <h2>2. This website</h2>
      <p>
        The site is hosted by Vercel Inc. (USA). To deliver pages, Vercel
        briefly logs technical data such as your IP address, browser and the
        page requested (legal basis: my legitimate interest in a working,
        secure site, Art. 6(1)(f) GDPR). Vercel is certified under the EU-US
        Data Privacy Framework. Fonts are served from riftlog.net itself.
      </p>

      <h2>3. The waitlist</h2>
      <p>
        If you join, I store your email address, when you signed up and which
        version of this policy you agreed to. I use it for one email only: to
        tell you when Riftlog launches. Then I delete it (legal basis: your
        consent, Art. 6(1)(a) GDPR). Changed your mind before then? Email{" "}
        <Fill value={OPERATOR.email} />{" "}and I&apos;ll delete your address.
      </p>

      <h2>4. The app</h2>
      <p>
        Guest matches stay on your phone and aren&apos;t saved. With an account
        I store what&apos;s needed to run the app (legal basis: performing the
        contract with you, Art. 6(1)(b) GDPR):
      </p>
      <ul>
        <li>
          <strong>Sign-in:</strong> your email address and the account details
          your sign-in provider (Discord, Google or Apple) shares, such as your
          name. Email codes are sent by{" "}
          <Fill value="[[EMAIL SENDER, e.g. Supabase or your SMTP provider]]" />.
        </li>
        <li>
          <strong>Profile:</strong> your display name and @handle.
        </li>
        <li>
          <strong>Your content:</strong> matches, scores, notes, opponent names
          you enter, and your decks. Only you can see them.
        </li>
        <li>
          <strong>On your phone:</strong> your login session, the match in
          progress, and matches waiting to upload.
        </li>
      </ul>
      <p>Feedback you send from the app isn&apos;t linked to your account.</p>

      <h2>5. Who processes your data</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (USA) hosts this website.
        </li>
        <li>
          <strong>Supabase, Inc.</strong> (USA) runs the sign-in and database,
          with the data stored in the EU (Stockholm, Sweden){" "}
          <Fill value="[[CHECK: Supabase DPA signed?]]" />.
        </li>
      </ul>
      <p>
        Both work on my behalf under data processing agreements, with EU
        Standard Contractual Clauses for any access from outside the EU. I
        don&apos;t sell your data or share it with Riot Games.
      </p>

      <h2>6. How long I keep it</h2>
      <ul>
        <li>
          <strong>Account data:</strong> until you delete it. You can delete
          matches and decks in the app. To delete your whole account, email{" "}
          <Fill value={OPERATOR.email} />{" "}and I&apos;ll do it within 30 days.
        </li>
        <li>
          <strong>Waitlist emails:</strong> deleted after the launch email.
        </li>
        <li>
          <strong>Server logs:</strong> kept briefly by Vercel, then deleted.
        </li>
      </ul>

      <h2>7. Your rights</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>get a copy of your data (Art. 15 GDPR),</li>
        <li>have it corrected (Art. 16) or deleted (Art. 17),</li>
        <li>restrict its processing (Art. 18),</li>
        <li>receive it in a portable format (Art. 20),</li>
        <li>object to processing based on legitimate interest (Art. 21),</li>
        <li>withdraw your consent, for the future.</li>
      </ul>
      <p>
        Just email <Fill value={OPERATOR.email} />. You can also complain to a
        data protection authority, for example{" "}
        <Fill value={OPERATOR.supervisoryAuthority} />.
      </p>

      <p>
        See also the <Link href="/terms">Terms</Link> and the{" "}
        <Link href="/impressum">Impressum</Link>.
      </p>
    </LegalPage>
  );
}
