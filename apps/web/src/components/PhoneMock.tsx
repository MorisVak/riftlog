import { Hexagon } from "lucide-react";

/**
 * Portrait phone-frame placeholder. Stands in for real app screenshots until
 * they exist — swap the inner content for an <Image> later. `label` names the
 * screen it will eventually show.
 */
export function PhoneMock({
  label,
  className = "",
  glow = false,
}: {
  label: string;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative aspect-[9/19] w-full max-w-[280px] rounded-[2.25rem] border border-border bg-surface p-3 ${
        glow ? "shadow-accent-card" : ""
      } ${className}`}
    >
      {/* Screen */}
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-[1.6rem] border border-border bg-background">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
          <Hexagon size={26} strokeWidth={2} className="text-accent" />
        </span>
        <span className="font-display text-sm font-semibold text-ink-secondary">
          {label}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-tertiary">
          Preview soon
        </span>
      </div>
      {/* Notch */}
      <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-border" />
    </div>
  );
}
