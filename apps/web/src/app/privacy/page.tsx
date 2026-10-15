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
        This policy explains what personal data Riftlog processes, why, and what
        rights you have. It covers this website (riftlog.net), including the
        waitlist, and the Riftlog mobile app. We collect as little as we can:
        no advertising, no tracking, no analytics, and no profile pictures.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        The controller under the GDPR is:
        <br />
        <Fill value={OPERATOR.name} />
        <br />
        <Fill value={OPERATOR.street} />
        <br />
        <Fill value={OPERATOR.city} />, {OPERATOR.country}
        <br />
        Email: <Fill value={OPERATOR.email} />
      </p>
      <p>
        Riftlog is a private, non-commercial fan project. There is no data
        protection officer, as none is required.
      </p>

      <h2>2. Visiting this website</h2>
      <h3>Hosting and server logs</h3>
      <p>
        This website is hosted by Vercel Inc. (USA), which processes data on
        our behalf. When you
        open a page, your browser sends technical data that Vercel records in
        server logs: your IP address, the date and time, the page requested,
        your browser and operating system, and the referring page. This is
        needed to deliver the site and keep it secure (Art. 6(1)(f) GDPR:
        our legitimate interest in a working, secure website). Logs are kept
        for a short period and then deleted.
      </p>
      <p>
        Vercel may process data in the USA. Vercel is certified under the
        EU-US Data Privacy Framework, and its data processing addendum, which
        includes the EU Standard Contractual Clauses, is part of its terms of
        service.
      </p>
      <h3>No cookies, no tracking</h3>
      <p>
        This website sets no cookies and uses no analytics, tracking pixels or
        social media plugins. Fonts are served from our own domain, so your
        browser doesn&apos;t contact Google or any other font provider.
      </p>

      <h2>3. The waitlist</h2>
      <p>
        If you join the waitlist, we store your <strong>email address</strong>,
        the <strong>time</strong> you signed up, and{" "}
        <strong>which version of this policy</strong> you agreed to. We use your
        email address for one purpose only: to tell you when Riftlog launches.
      </p>
      <ul>
        <li>
          <strong>Legal basis:</strong> your consent (Art. 6(1)(a) GDPR), given
          by submitting the form.
        </li>
        <li>
          <strong>Withdrawing consent:</strong> you can withdraw at any time,
          without giving a reason, by emailing <Fill value={OPERATOR.email} />{" "}
          or using the unsubscribe link in our email. We then delete your
          address. Withdrawal doesn&apos;t affect anything done before it.
        </li>
        <li>
          <strong>How long:</strong> until we&apos;ve sent the launch
          announcement, or until you withdraw consent, whichever comes first.
          Then we delete your address.
        </li>
        <li>
          <strong>Where:</strong> the list is stored with Supabase (see
          section 5), on servers in the EU (Stockholm, Sweden).
        </li>
      </ul>
      <p>
        To protect the form from abuse, we count signup attempts per
        10-minute window. That count stores only timestamps, no email
        address or IP address, and is deleted after an hour.
      </p>

      <h2>4. The Riftlog app</h2>
      <p>
        You can use the score tracker as a guest without an account. A guest
        match exists only in your phone&apos;s memory: it isn&apos;t saved
        anywhere, and it&apos;s gone when you close the app or sign in.
      </p>
      <p>
        To save your match history and decks, you need an account. We process
        this data to provide the app you signed up for (Art. 6(1)(b) GDPR:
        performance of a contract).
      </p>
      <h3>Signing in</h3>
      <p>
        You can sign in with Discord, Google, Apple, or a one-time code sent to
        your email address. There are no passwords. When you sign in with a
        provider, that provider tells us your email address, a user ID, and
        the profile details it shares by default, such as your name and the
        address of your profile picture. These are kept in our sign-in records.
        Riftlog never displays or uses profile pictures. The provider&apos;s
        own privacy policy applies to what happens on their side:{" "}
        <a href="https://discord.com/privacy" rel="noopener noreferrer">Discord</a>,{" "}
        <a href="https://policies.google.com/privacy" rel="noopener noreferrer">Google</a>,{" "}
        <a href="https://www.apple.com/legal/privacy/" rel="noopener noreferrer">Apple</a>.
      </p>
      <p>
        If you use &quot;Hide My Email&quot; with Apple, we only receive
        Apple&apos;s relay address. Email codes are sent by{" "}
        <Fill value="[[EMAIL SENDER, e.g. Supabase's email service or your SMTP provider]]" />
        .
      </p>
      <h3>What we store for your account</h3>
      <ul>
        <li>
          <strong>Profile:</strong> your display name and your @handle, plus
          when you created your account and finished setup.
        </li>
        <li>
          <strong>Matches and games:</strong> format, scores, how each point was
          scored and when, results, the match clock, your notes, and the names
          entered for both players. If you type in a real person&apos;s name as
          your opponent, that name is stored in your history. Only you can see
          it, but please only enter names your opponents are happy with.
        </li>
        <li>
          <strong>Decks:</strong> your deck names and lists, every saved
          version, and your default deck.
        </li>
        <li>
          <strong>Feedback:</strong> feedback you send from the app is stored
          without any link to your account. To limit abuse, we briefly record
          that your account sent feedback and when; that record is deleted
          after 24 hours.
        </li>
      </ul>
      <p>
        Your matches, decks and notes are visible only to you. Riftlog shows
        no data to other users and doesn&apos;t combine data across players,
        for example into win rates by deck.
      </p>
      <h3>On your phone</h3>
      <p>
        The app stores a few things on your device: your sign-in session
        (encrypted), the match you&apos;re currently playing, finished matches
        waiting to upload while you&apos;re offline, and which sign-in method
        you used last. Uploaded matches are removed from the device, and
        signing out clears the waiting list.
      </p>
      <h3>How long</h3>
      <p>
        We keep your account data for as long as you have an account. You can
        delete individual matches and decks in the app at any time. To delete
        your whole account and everything in it, email{" "}
        <Fill value={OPERATOR.email} /> from the address you signed in with, and
        we&apos;ll delete it within 30 days.
      </p>

      <h2>5. Service providers</h2>
      <p>
        We use Supabase, Inc. (USA) for sign-in and the database behind the
        app and the waitlist. Supabase processes data on our behalf under its
        data processing agreement{" "}
        <Fill value="[[CHECK: Supabase DPA signed in the dashboard?]]" />. Our
        database is hosted in the EU (Stockholm, Sweden). Supabase may access
        data from outside the EU for support and operations, covered by the
        EU Standard Contractual Clauses.
      </p>
      <p>
        We don&apos;t sell your data, and we don&apos;t share it with Riot
        Games or anyone else for their own purposes.
      </p>

      <h2>6. Your rights</h2>
      <p>Under the GDPR you have the right to:</p>
      <ul>
        <li>get a copy of the data we hold about you (Art. 15),</li>
        <li>have it corrected (Art. 16) or deleted (Art. 17),</li>
        <li>have its processing restricted (Art. 18),</li>
        <li>receive it in a portable format (Art. 20),</li>
        <li>
          object to processing based on our legitimate interests (Art. 21),
        </li>
        <li>withdraw any consent at any time, with effect for the future.</li>
      </ul>
      <p>
        To use any of these, email <Fill value={OPERATOR.email} />. You also have
        the right to complain to a data protection authority (Art. 77), for
        example the one responsible for us:{" "}
        <Fill value={OPERATOR.supervisoryAuthority} />.
      </p>

      <h2>7. Changes</h2>
      <p>
        If Riftlog changes how it handles data, we&apos;ll update this policy
        and the date at the top. See also our <Link href="/terms">Terms</Link>{" "}
        and <Link href="/impressum">Impressum</Link>.
      </p>
    </LegalPage>
  );
}
