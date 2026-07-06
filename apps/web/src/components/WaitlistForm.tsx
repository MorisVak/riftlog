"use client";

import { ArrowRight } from "lucide-react";

/**
 * Waitlist signup form — SHELL ONLY.
 *
 * Intentionally has no submission logic: `onSubmit` just prevents the default
 * page reload. Wiring this to a backend (Supabase / email capture) is deferred.
 * Do not add a fetch/action here without a corresponding backend slice.
 */
export function WaitlistForm({ className = "" }: { className?: string }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: wire up waitlist capture when the backend slice lands.
      }}
      className={`flex w-full max-w-md flex-col gap-3 sm:flex-row ${className}`}
    >
      <label htmlFor="waitlist-email" className="sr-only">
        Email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@email.com"
        className="min-w-0 flex-1 rounded-full border border-border bg-surface px-5 py-3 font-display text-base text-ink-primary placeholder:text-ink-tertiary outline-none transition-colors focus:border-accent"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-base font-semibold text-background shadow-accent-btn transition-colors hover:bg-accent-soft active:bg-accent-strong"
      >
        Join the waitlist
        <ArrowRight size={18} strokeWidth={2.5} />
      </button>
    </form>
  );
}
