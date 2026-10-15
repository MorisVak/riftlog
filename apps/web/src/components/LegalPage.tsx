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

/** Shared shell for /privacy, /terms and /impressum: header, prose column, footer. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
          <p
            role="note"
            className="mb-8 rounded-2xl border border-draw/50 bg-draw-deep px-5 py-4 font-display text-sm leading-relaxed text-draw-text"
          >
            Draft, pending review. This text hasn&apos;t been checked by a lawyer
            yet, and highlighted fields still need to be filled in.
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 font-display text-sm text-ink-secondary">
            Last updated: {LEGAL_UPDATED}
          </p>
          <div className="mt-10 font-display text-[15px] leading-relaxed text-ink-secondary [&_a]:text-accent-soft [&_a]:underline [&_a:hover]:text-ink-primary [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink-primary [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink-primary [&_li]:mt-1.5 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-ink-primary [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
