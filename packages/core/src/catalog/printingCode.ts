/**
 * Printing codes: `SET-NNN[variant]`, the key of a printing in the card
 * catalog and what `CardRef.code` holds — `SFD-149`, `SFD-149a` (alt art),
 * `UNL-229*` (signed), `VEN-R01` (rune), `VEN-SP1`.
 *
 * Promo sets number a card by its number in the set it reprints, so a promo
 * code also names that parent set: `OPP-SFD-086`, `OPP-OGN-259m` (Metal).
 * Promo printings can't appear in a deck code; deckable codes never carry a
 * parent.
 *
 * Keep PRINTING_CODE in step with the `card_printings.code` check in
 * supabase/migrations/20261102191647_promo_printing_codes.sql.
 */
export const PRINTING_CODE = /^([A-Z]{2,4})-(?:([A-Z]{2,4})-)?((?:R|SP)?[0-9]{1,3})([a-z*]?)$/;

export type PrintingCodeParts = {
  /** Set code, e.g. `SFD`, or `OPP` for a promo. */
  set: string;
  /** For a promo, the set it reprints from (`SFD` in `OPP-SFD-086`); else null. */
  parent: string | null;
  /** Number as printed, with any prefix: `149`, `R01`, `SP1`. */
  number: string;
  /** `''` for the base printing, else one letter or `*`. */
  variant: string;
};

export const parsePrintingCode = (code: string): PrintingCodeParts | null => {
  const match = PRINTING_CODE.exec(code);
  if (!match) return null;
  return {
    set: match[1] ?? '',
    parent: match[2] ?? null,
    number: match[3] ?? '',
    variant: match[4] ?? '',
  };
};

/** The catalog's `collector_number`: the number, behind the parent set for a promo. */
export const collectorNumber = ({ parent, number }: Pick<PrintingCodeParts, 'parent' | 'number'>): string =>
  parent ? `${parent}-${number}` : number;

export const formatPrintingCode = (parts: PrintingCodeParts): string =>
  `${parts.set}-${collectorNumber(parts)}${parts.variant}`;
