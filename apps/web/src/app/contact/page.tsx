import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
  description: "Get in touch with the developer of Riftlog.",
};

const cardClass = "rounded-2xl border border-border bg-surface p-5";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[2fr_3fr] lg:py-20">
          <div className="flex flex-col gap-4">
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-ink-secondary">
              Contact
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-primary sm:text-4xl">
              Feedback, bugs or questions?
            </h1>
            <div className={`${cardClass} mt-4`}>
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Direct email
              </h2>
              <p className="mt-1 font-display text-sm text-ink-secondary">
                Prefer email? Write to{" "}
                <a
                  href={`mailto:${OPERATOR.email}`}
                  className="text-accent-soft underline hover:text-ink-primary"
                >
                  {OPERATOR.email}
                </a>
                .
              </p>
            </div>
            <div className={cardClass}>
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Reporting a bug?
              </h2>
              <p className="mt-1 font-display text-sm text-ink-secondary">
                Say what you tapped, what you expected and what happened. A
                screenshot by email helps too.
              </p>
            </div>
          </div>

          <div className={`${cardClass} p-6 sm:p-8`}>
            <h2 className="mb-6 font-display text-xl font-semibold text-ink-primary">
              Send a message
            </h2>
            <ContactForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
