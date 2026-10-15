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
        Riftlog collects as little data as possible. No ads, no tracking, no
        cookies, no analytics.
      </p>

      <h2>Who we are</h2>
      <p>
        <Fill value={OPERATOR.name} />, <Fill value={OPERATOR.street} />,{" "}
        <Fill value={OPERATOR.city} />, {OPERATOR.country}. Email:{" "}
        <Fill value={OPERATOR.email} />
      </p>

      <h2>This website</h2>
      <p>
        The site is hosted by Vercel Inc. (USA). To deliver pages, Vercel
        briefly logs technical data such as your IP address, browser and the
        page requested (legal basis: our legitimate interest in a working,
        secure site, Art. 6(1)(f) GDPR). Vercel is certified under the EU-US
        Data Privacy Framework. Fonts are served from our own domain.
      </p>

      <h2>The waitlist</h2>
      <p>
        If you join, we store your email address, when you signed up and which
        version of this policy you agreed to. We use it for one email only: to
        tell you when Riftlog launches. Then we delete it (legal basis: your
        consent, Art. 6(1)(a) GDPR). Changed your mind before then? Email{" "}
        <Fill value={OPERATOR.email} /> and we&apos;ll delete your address.
      </p>

      <h2>The app</h2>
      <p>
        Guest matches stay on your phone and aren&apos;t saved. With an account
        we store what&apos;s needed to run the app (legal basis: our contract
        with you, Art. 6(1)(b) GDPR):
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

      <h2>Who processes your data</h2>
      <p>
        Vercel hosts this site. Supabase, Inc. (USA) runs our sign-in and
        database, with the data stored in the EU (Stockholm, Sweden){" "}
        <Fill value="[[CHECK: Supabase DPA signed?]]" />. Both work on our
        behalf under data processing agreements, with EU Standard Contractual
        Clauses for any access from outside the EU. We don&apos;t sell your
        data or share it with Riot Games.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account data stays until you delete it. You can delete matches and
        decks in the app. To delete your whole account, email{" "}
        <Fill value={OPERATOR.email} /> and we&apos;ll do it within 30 days.
        Waitlist emails are deleted after the launch announcement.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, or have it corrected, deleted,
        restricted or exported, and you can object to processing or withdraw
        consent at any time. Email <Fill value={OPERATOR.email} />. You can
        also complain to a data protection authority, such as{" "}
        <Fill value={OPERATOR.supervisoryAuthority} />.
      </p>

      <p>
        See also our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/impressum">Impressum</Link>.
      </p>
    </LegalPage>
  );
}
