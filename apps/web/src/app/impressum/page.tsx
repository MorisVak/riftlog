import type { Metadata } from "next";
import { Fill, LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum — Riftlog",
  description: "Legal notice for riftlog.net under § 5 DDG.",
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <Fill value={OPERATOR.name} />
        <br />
        <Fill value={OPERATOR.street} />
        <br />
        <Fill value={OPERATOR.city} />
        <br />
        {OPERATOR.country}
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Fill value={OPERATOR.email} />
        <br />
        <Fill value={OPERATOR.secondContact} />
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        <Fill value={OPERATOR.name} />, address as above.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        We are neither willing nor obliged to take part in dispute resolution
        proceedings before a consumer arbitration board (§ 36 VSBG).
      </p>

      <h2>Riot Games</h2>
      <p>
        Riftlog is a fan-made application and is not affiliated with, endorsed
        by, or sponsored by Riot Games. All Riftbound imagery and trademarks are
        property of Riot Games.
      </p>
    </LegalPage>
  );
}
