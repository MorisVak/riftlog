import type { DeckList } from '../types/deck';

/** Riftbound's six domains (card color identities). */
export const DOMAINS = ['fury', 'calm', 'mind', 'body', 'chaos', 'order'] as const;
export type Domain = (typeof DOMAINS)[number];

const RUNE_NAME = /^(fury|calm|mind|body|chaos|order)\s+rune$/i;

/** "Chaos Rune" → 'chaos'; anything else → null. */
export function domainFromRuneName(name: string): Domain | null {
  const match = name.trim().match(RUNE_NAME);
  return match?.[1] ? (match[1].toLowerCase() as Domain) : null;
}

export type DomainCount = { domain: Domain; count: number };

/**
 * The deck's domains from its runes, with rune counts, in the order the runes
 * were listed ("9 Chaos Rune, 3 Order Rune" → chaos 9, order 3).
 *
 * Returns null when there are no runes, or when any rune name doesn't follow
 * the "<Domain> Rune" pattern — better to show no domain chips than a guess.
 */
export function deckDomains(list: DeckList): DomainCount[] | null {
  if (list.runes.length === 0) return null;
  const out: DomainCount[] = [];
  for (const rune of list.runes) {
    const domain = domainFromRuneName(rune.name);
    if (domain === null) return null;
    const existing = out.find((d) => d.domain === domain);
    if (existing) existing.count += rune.count;
    else out.push({ domain, count: rune.count });
  }
  return out;
}
