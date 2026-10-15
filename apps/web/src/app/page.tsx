import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { DecksSection, HistorySection, ScoreboardSection } from "@/components/Sections";
import { HowYouPlay } from "@/components/HowYouPlay";
import { ComingLater } from "@/components/ComingLater";
import { WaitlistCta } from "@/components/WaitlistCta";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <ScoreboardSection />
        <HistorySection />
        <DecksSection />
        <HowYouPlay />
        <ComingLater />
        <WaitlistCta />
      </main>
      <SiteFooter />
    </>
  );
}
