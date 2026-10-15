"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";

const INITIAL: WaitlistState = { status: "idle" };

const ERRORS: Partial<Record<WaitlistState["status"], string>> = {
  invalid_email: "That doesn't look like an email address.",
  rate_limited: "Lots of signups right now — please try again in a few minutes.",
  error: "Something went wrong. Please try again.",
};

/**
 * Waitlist signup → the `joinWaitlist` Server Action → `join_waitlist` RPC.
 * Rendered twice on the page (hero + CTA band), so ids come from `useId`.
 */
export function WaitlistForm({ className = "" }: { className?: string }) {
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL);
  const id = useId();
  const emailId = `${id}-email`;
  const noteId = `${id}-note`;
  const error = ERRORS[state.status];

  if (state.status === "ok") {
    return (
      <p
        role="status"
        className={`flex w-full max-w-md items-center gap-3 rounded-2xl border border-win/40 bg-win-deep px-5 py-4 font-display text-base text-ink-primary ${className}`}
      >
        <Check size={20} strokeWidth={2.5} className="shrink-0 text-win-text" />
        You&apos;re on the list. We&apos;ll email you once, when Riftlog launches.
      </p>
    );
  }

  return (
    <form action={formAction} className={`w-full max-w-md ${className}`}>
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@email.com"
          aria-invalid={state.status === "invalid_email"}
          aria-describedby={noteId}
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-5 py-3 font-display text-base text-ink-primary placeholder:text-ink-tertiary outline-none transition-colors focus:border-accent"
        />
        {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-base font-semibold text-background shadow-accent-btn transition-colors hover:bg-accent-soft active:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Joining…" : "Join the waitlist"}
          {!pending && <ArrowRight size={18} strokeWidth={2.5} />}
        </button>
      </div>
      <p id={noteId} className="mt-3 font-display text-sm text-ink-secondary">
        {error ? (
          <span role="alert" className="text-loss-text">
            {error}
          </span>
        ) : (
          <>
            We&apos;ll only use your email to tell you when Riftlog launches.
            See our{" "}
            <Link href="/privacy" className="underline hover:text-ink-primary">
              Privacy Policy
            </Link>
            .
          </>
        )}
      </p>
    </form>
  );
}
