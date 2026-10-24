/** The Apple logo (Simple Icons "apple", CC0). */
function AppleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

/**
 * The Android robot head (Material Symbols "android", Apache 2.0). The robot
 * itself is Google's, shared under CC BY 3.0 — the credit is in SiteFooter.
 */
function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
    </svg>
  );
}

const chipClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 font-display text-sm font-medium text-ink-primary";

/**
 * "Coming to iPhone & Android", for the hero. The owner chose the Apple logo
 * here knowing Apple's guidelines reserve it for Apple's own badges — swap
 * these chips for the App Store / Google Play badges once the app is live.
 */
export function Platforms() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-display text-sm text-ink-secondary">Coming to</span>
      <span className={chipClass}>
        <AppleIcon className="h-4 w-4 text-accent-soft" />
        iPhone
      </span>
      <span className={chipClass}>
        <AndroidIcon className="h-4 w-4 text-accent-soft" />
        Android
      </span>
    </div>
  );
}
