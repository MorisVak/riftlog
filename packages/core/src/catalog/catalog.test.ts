import { describe, expect, it } from 'vitest';
import { deckCodeSetId } from '../decks/deckCode';
import { pickBasePrinting, type BasePrintingCandidate } from './basePrinting';
import { baseCardName, cleanCardText, normalizeCardName, splitCardName, unescapeHtml } from './names';
import { cardImagePath, smallCardImagePath } from './imagePaths';
import { collectorNumber, formatPrintingCode, parsePrintingCode } from './printingCode';

describe('normalizeCardName', () => {
  it('matches the catalog spelling to the deck-export spelling', () => {
    expect(normalizeCardName('Vi - Peacekeeper')).toBe(normalizeCardName('Vi, Peacekeeper'));
    expect(normalizeCardName('Ride The Wind')).toBe(normalizeCardName('Ride the Wind'));
    expect(normalizeCardName('Kai’Sa - Daughter of the Void')).toBe(
      normalizeCardName("Kai'Sa, Daughter of the Void"),
    );
  });

  it('drops printing tags, so every printing of a card shares one key', () => {
    const key = normalizeCardName('Ezreal - Prodigy');
    expect(normalizeCardName('Ezreal - Prodigy (Alternate Art)')).toBe(key);
    expect(normalizeCardName('Ezreal, Prodigy (Overnumbered)')).toBe(key);
    expect(normalizeCardName('Vi - Piltover Enforcer (Signature)')).toBe(
      normalizeCardName('Vi - Piltover Enforcer'),
    );
  });

  it('keeps hyphenated words and slashes intact', () => {
    expect(normalizeCardName('Tail-Cloaked Matriarch')).toBe('tail-cloaked matriarch');
    expect(normalizeCardName('Star-Crossed')).toBe('star-crossed');
    expect(normalizeCardName('Gold // Buff')).toBe('gold // buff');
  });
});

describe('splitCardName', () => {
  it('splits deck-export and catalog spellings alike', () => {
    expect(splitCardName('Riven, The Exile')).toEqual({ head: 'Riven', title: 'The Exile' });
    expect(splitCardName('Riven - The Exile')).toEqual({ head: 'Riven', title: 'The Exile' });
  });
  it('splits at the first separator only, and keeps hyphenated words whole', () => {
    expect(splitCardName('Vi - Peacekeeper, Again')).toEqual({ head: 'Vi', title: 'Peacekeeper, Again' });
    expect(splitCardName('Star-Crossed')).toEqual({ head: 'Star-Crossed', title: '' });
  });
});

describe('baseCardName', () => {
  it('removes the printing tag but keeps the source punctuation', () => {
    expect(baseCardName('Yasuo - Unforgiven (Metal)')).toBe('Yasuo - Unforgiven');
    expect(baseCardName('Kennen, Storm of Shuriken')).toBe('Kennen, Storm of Shuriken');
  });
});

describe('card text', () => {
  it('decodes HTML entities', () => {
    expect(unescapeHtml('[Level 6][&gt;] Your units have +1 :rb_might:.')).toBe(
      '[Level 6][>] Your units have +1 :rb_might:.',
    );
    expect(unescapeHtml('it&#39;s &amp; that&#x27;s &unknown;')).toBe("it's & that's &unknown;");
  });

  it('turns the "[NO TEXT]" placeholder and null into empty text, and nothing else', () => {
    expect(cleanCardText('[NO TEXT]')).toBe('');
    expect(cleanCardText(null)).toBe('');
    expect(cleanCardText('  When you play me, draw 1.')).toBe('  When you play me, draw 1.');
  });
});

// Every code in __fixtures__/kennen.code.txt, decoded with
// @piltoverarchive/riftbound-deck-codes 1.5.0 (signedSuffix '*').
const KENNEN_DECK_CODES = [
  'OGN-166', 'OGN-169', 'OGN-172', 'OGN-173', 'OGN-185', 'OGN-195', 'OGN-199',
  'OGN-204', 'OGN-214', 'OGN-224', 'OGN-298', 'OGS-011', 'SFD-130', 'SFD-136',
  'SFD-140', 'SFD-145', 'SFD-149a', 'SFD-150', 'SFD-212', 'UNL-128', 'UNL-131',
  'UNL-132', 'UNL-176', 'VEN-095', 'VEN-099', 'VEN-102', 'VEN-103', 'VEN-104',
  'VEN-113', 'VEN-131', 'VEN-155', 'VEN-156', 'VEN-165',
];

describe('printing codes', () => {
  it.each([
    ['SFD-149', { set: 'SFD', parent: null, number: '149', variant: '' }],
    ['SFD-149a', { set: 'SFD', parent: null, number: '149', variant: 'a' }],
    ['UNL-229*', { set: 'UNL', parent: null, number: '229', variant: '*' }],
    ['VEN-R01', { set: 'VEN', parent: null, number: 'R01', variant: '' }],
    ['VEN-SP1', { set: 'VEN', parent: null, number: 'SP1', variant: '' }],
    ['OPP-SFD-086', { set: 'OPP', parent: 'SFD', number: '086', variant: '' }],
    ['OPP-OGN-259m', { set: 'OPP', parent: 'OGN', number: '259', variant: 'm' }],
    ['PR-OGN-246b', { set: 'PR', parent: 'OGN', number: '246', variant: 'b' }],
  ])('parses and formats %s', (code, parts) => {
    expect(parsePrintingCode(code)).toEqual(parts);
    expect(formatPrintingCode(parts)).toBe(code);
  });

  it('leaves every deck-code printing code exactly as it is', () => {
    for (const code of KENNEN_DECK_CODES) {
      const parts = parsePrintingCode(code);
      expect(parts?.parent, code).toBeNull();
      expect(parts && formatPrintingCode(parts), code).toBe(code);
      expect(parts && collectorNumber(parts), code).toBe(code.split('-')[1]?.replace(/[a-z*]$/, ''));
    }
  });

  it('puts the parent set into the collector number for promos only', () => {
    expect(collectorNumber({ parent: 'SFD', number: '086' })).toBe('SFD-086');
    expect(collectorNumber({ parent: null, number: 'R01' })).toBe('R01');
  });

  it('rejects anything else', () => {
    for (const code of ['sfd-149', 'SFD-1490', 'SFD-T03', 'SFD149', 'SFD-149ab', 'OPP-SFD086', 'OPP-SFD-UNL-086', '']) {
      expect(parsePrintingCode(code), code).toBeNull();
    }
  });
});

describe('deckCodeSetId', () => {
  it('knows the deck-code sets and nothing else', () => {
    expect(deckCodeSetId('OGN')).toBe(0);
    expect(deckCodeSetId('OGS')).toBe(1);
    expect(deckCodeSetId('VEN')).toBe(5);
    expect(deckCodeSetId('OPP')).toBeNull();
    expect(deckCodeSetId('constructor')).toBeNull();
  });
});

describe('pickBasePrinting', () => {
  const p = (code: string, extra: Partial<BasePrintingCandidate> = {}): BasePrintingCandidate => ({
    code,
    status: 'released',
    promo: false,
    set_code: code.split('-')[0] ?? '',
    variant: '',
    alt_art: false,
    overnumbered: false,
    signed: false,
    setReleasedOn: { OGN: '2025-10-31', OGS: '2025-10-31', SFD: '2026-02-13', UNL: '2026-05-08', VEN: '2026-07-31' }[
      code.split('-')[0] ?? ''
    ] ?? null,
    ...extra,
  });

  it('prefers a plain printing over alt art, overnumbered and signed ones', () => {
    const base = p('UNL-187');
    expect(
      pickBasePrinting([p('UNL-229', { overnumbered: true }), p('UNL-229*', { variant: '*', signed: true }), base]),
    ).toBe(base);
    expect(pickBasePrinting([p('SFD-149a', { variant: 'a', alt_art: true }), p('SFD-149')])?.code).toBe('SFD-149');
  });

  it('prefers the newest main set, then OGS, then promos', () => {
    expect(pickBasePrinting([p('SFD-149'), p('VEN-SP5')])?.code).toBe('VEN-SP5');
    expect(pickBasePrinting([p('OPP-OGS-011', { promo: true }), p('OGS-011')])?.code).toBe('OGS-011');
    // A newer overnumbered reprint doesn't beat the plain original.
    expect(pickBasePrinting([p('VEN-176', { overnumbered: true }), p('OGN-117')])?.code).toBe('OGN-117');
  });

  it('never picks a spoiler when a released printing exists', () => {
    expect(pickBasePrinting([p('VEN-155', { status: 'spoiler' }), p('OPP-OGN-001', { promo: true })])?.code).toBe(
      'OPP-OGN-001',
    );
  });

  it('returns null for no printings', () => {
    expect(pickBasePrinting([])).toBeNull();
  });
});

describe('card image paths', () => {
  it('stores each printing as a full and a small WebP, with * written as s', () => {
    expect(cardImagePath('SFD-149a')).toBe('cards/SFD-149a.webp');
    expect(cardImagePath('UNL-229*')).toBe('cards/UNL-229s.webp');
    expect(cardImagePath('OPP-OGN-259m')).toBe('cards/OPP-OGN-259m.webp');
    expect(smallCardImagePath('cards/UNL-229s.webp')).toBe('cards/small/UNL-229s.webp');
  });
});
