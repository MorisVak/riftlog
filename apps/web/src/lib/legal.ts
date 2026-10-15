/**
 * Version label of the privacy policy a waitlist signup agrees to. It's stored
 * with each email (`waitlist.privacy_version`) as a record of consent, so bump
 * it whenever the policy's text changes in a way that matters for the list.
 */
export const PRIVACY_VERSION = "2026-10-15-draft2";

/** Shown as "Last updated" on every legal page. */
export const LEGAL_UPDATED = "15 October 2026";

/**
 * The operator's details, used by /impressum, /privacy and /terms. Every value
 * still in [[DOUBLE BRACKETS]] is a placeholder: it renders highlighted on the
 * page and is easy to find with `grep -rn "\[\[" apps/web/src`. Fill them here
 * — never invent them.
 */
export const OPERATOR = {
  name: "[[LEGAL NAME]]",
  street: "[[STREET AND NUMBER]]",
  city: "[[POSTCODE AND CITY]]",
  country: "Germany",
  email: "[[CONTACT EMAIL]]",
  /** §5 DDG wants a second fast way to reach you besides email. */
  secondContact: "[[PHONE NUMBER OR CONTACT FORM]]",
  /** The data protection authority of your German state (Bundesland). */
  supervisoryAuthority: "[[YOUR STATE'S DATA PROTECTION AUTHORITY]]",
} as const;

export function isPlaceholder(value: string): boolean {
  return value.startsWith("[[") && value.endsWith("]]");
}
