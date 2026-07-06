import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ScreenshotShowcase } from "@/components/ScreenshotShowcase";
import { WaitlistCta } from "@/components/WaitlistCta";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Features />
        <ScreenshotShowcase />
        <WaitlistCta />
      </main>
      <SiteFooter />
    </>
  );
}
