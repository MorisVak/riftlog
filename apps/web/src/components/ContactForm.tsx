"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { sendContact, type ContactState } from "@/app/actions/contact";

const INITIAL: ContactState = { status: "idle" };

const ERRORS: Partial<Record<ContactState["status"], string>> = {
  invalid_name: "Please enter your name (up to 80 characters).",
  invalid_email: "That doesn't look like an email address.",
  invalid_message: "Please write a message (up to 2000 characters).",
  rate_limited: "Too many messages right now. Please try again in a few minutes.",
  error: "Something went wrong. Please try again, or email me instead.",
};

const fieldClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 font-display text-base text-ink-primary placeholder:text-ink-tertiary outline-none transition-colors focus:border-accent";
const labelClass = "font-display text-sm font-medium text-ink-primary";

/** Contact form → `sendContact` Server Action → `submit_contact` RPC. */
export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContact, INITIAL);
  const id = useId();
  const error = ERRORS[state.status];

  if (state.status === "ok") {
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-win/40 bg-win-deep px-5 py-4 font-display text-base text-ink-primary"
      >
        <Check size={20} strokeWidth={2.5} className="shrink-0 text-win-text" />
        Thanks, your message was sent. I&apos;ll reply by email.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className={labelClass}>
          Name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          autoComplete="name"
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-email`} className={labelClass}>
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-message`} className={labelClass}>
          Message
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          maxLength={2000}
          rows={6}
          className={`${fieldClass} resize-y`}
        />
      </div>
      {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {error && (
        <p role="alert" className="font-display text-sm text-loss-text">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-sm text-ink-secondary">
          I only use your details to answer you. See the{" "}
          <Link href="/privacy" className="underline hover:text-ink-primary">
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-accent px-6 py-3 font-display text-base font-semibold text-background shadow-accent-btn transition-colors hover:bg-accent-soft active:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
