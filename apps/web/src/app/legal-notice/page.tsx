import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Legal Notice",
  alternates: { canonical: "/legal-notice" },
  description: "Who runs Riftlog and how to reach them (Impressum).",
};

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Legal Notice"
      intro="Who runs Riftlog and how to reach me (Impressum under German law)."
    >
      <h2>Provider (Section 5 DDG)</h2>
      <p>
        <Fill value={OPERATOR.name} />
        <br />
        <Fill value={OPERATOR.street} />
        <br />
        <Fill value={OPERATOR.city} />
        <br />
        {OPERATOR.country}
      </p>

      <h2>Contact</h2>
      <p>
        Email: <Fill value={OPERATOR.email} />
        <br />
        You can also use the <Link href="/contact">contact page</Link>.
      </p>

      <h2>Responsible for content</h2>
      <p>
        <Fill value={OPERATOR.name} />, address as above (Section 18(2) MStV).
      </p>

      <h2>Consumer dispute resolution</h2>
      <p>
        I&apos;m not willing or obliged to take part in dispute resolution
        before a consumer arbitration board.
      </p>

      <h2>Fan project notice</h2>
      <p>
        Riftlog is a fan-made application and is not affiliated with, endorsed
        by, or sponsored by Riot Games. All Riftbound imagery and trademarks are
        property of Riot Games.
      </p>
    </LegalPage>
  );
}
