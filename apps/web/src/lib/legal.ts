/**
 * Version label of the privacy policy a waitlist signup agrees to. It's stored
 * with each email (`waitlist.privacy_version`) as a record of consent, so bump
 * it whenever the policy's text changes in a way that matters for the list.
 */
export const PRIVACY_VERSION = "2026-10-15";

/** Shown as "Last updated" on every legal page. */
export const LEGAL_UPDATED = "15 October 2026";

/**
 * The operator's details, used by /legal-notice, /privacy and /terms. Every value
 * still in [[DOUBLE BRACKETS]] is a placeholder: it renders highlighted on the
 * page and is easy to find with `grep -rn "\[\[" apps/web/src`. Fill them here
 * — never invent them.
 */
export const OPERATOR = {
  name: "Maurice Mecke",
  street: "Kannenstr. 18",
  city: "45891 Gelsenkirchen",
  country: "Germany",
  email: "support@riftlog.net",
  /** Data protection authority for North Rhine-Westphalia (Gelsenkirchen). */
  supervisoryAuthority:
    "the Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW, ldi.nrw.de)",
} as const;

export function isPlaceholder(value: string): boolean {
  return value.startsWith("[[") && value.endsWith("]]");
}
