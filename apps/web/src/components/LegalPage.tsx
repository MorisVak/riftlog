import type { ReactNode } from "react";
import { LEGAL_UPDATED, isPlaceholder } from "@/lib/legal";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * A value from `OPERATOR`. Placeholders render highlighted so an unfilled
 * field can't slip through review unnoticed.
 */
export function Fill({ value }: { value: string }) {
  if (!isPlaceholder(value)) return <>{value}</>;
  return (
    <mark className="rounded bg-draw-tint px-1 font-mono text-[0.9em] text-draw-text">
      {value}
    </mark>
  );
}

/**
 * Shared shell for the legal pages: a small "Legal" label, the title, one
 * plain-language sentence on what the page covers, then short sections with
 * plain headings (no numbering, no article numbers in headings).
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-ink-secondary">
            Legal
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 font-display text-base leading-relaxed text-ink-secondary">
            {intro}
          </p>
          <p className="mt-4 font-display text-xs font-medium uppercase tracking-widest text-ink-secondary">
            Last updated {LEGAL_UPDATED}
          </p>
          <div className="mt-10 font-display text-[15px] leading-relaxed text-ink-secondary [&_a]:text-accent-soft [&_a]:underline [&_a:hover]:text-ink-primary [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink-primary [&_li]:mt-1.5 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-ink-primary [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
