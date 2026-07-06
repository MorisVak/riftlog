import { Hexagon } from "lucide-react";

/**
 * Riftlog wordmark — periwinkle rounded hexagon badge + "Riftlog".
 * Mirrors the mobile home-screen wordmark (accent badge + Space Grotesk bold).
 * The hexagon is a placeholder brand mark until a real logo exists.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent">
        <Hexagon size={16} strokeWidth={2.5} className="text-background" />
      </span>
      <span className="font-display text-[21px] font-bold tracking-tight text-ink-primary">
        Riftlog
      </span>
    </span>
  );
}
