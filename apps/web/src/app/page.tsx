import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { HistoryShowcase, TableShowcase } from "@/components/Showcase";
import { ComingLater } from "@/components/ComingLater";
import { WaitlistCta } from "@/components/WaitlistCta";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <TableShowcase />
        <HistoryShowcase />
        <ComingLater />
        <WaitlistCta />
      </main>
      <SiteFooter />
    </>
  );
}
