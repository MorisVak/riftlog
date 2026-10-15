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

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-8 lg:py-20">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
            Contact
          </h1>
          <p className="mt-4 font-display text-lg leading-relaxed text-ink-secondary">
            Questions, feedback or a bug? Send me a message. You can also email{" "}
            <a
              href={`mailto:${OPERATOR.email}`}
              className="text-accent-soft underline hover:text-ink-primary"
            >
              {OPERATOR.email}
            </a>
            .
          </p>
          <div className="mt-10">
            <ContactForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
