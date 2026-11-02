import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sample from './__fixtures__/riftcodex-sample.json';
import { parseRiftcodex } from './riftcodex';
import { loadSnapshot } from './snapshot';
import { transform } from './transform';

describe('snapshots', () => {
  it('round-trip to exactly the same import as the raw responses', () => {
    const dir = mkdtempSync(join(tmpdir(), 'riftlog-snapshot-'));
    const path = join(dir, 'snap.json');
    const raw = { sets: sample.sets as unknown[], cards: sample.cards as unknown[] };
    writeFileSync(path, JSON.stringify({ format: 1, source: 'test', fetched_at: '2026-11-02T12:00:00.000Z', ...raw }));
    const loaded = loadSnapshot(path);
    expect(loaded.fetched_at).toBe('2026-11-02T12:00:00.000Z');
    const run = (r: typeof raw) => transform({ ...parseRiftcodex(r), overrides: [], today: '2026-11-02' });
    expect(run(loaded)).toEqual(run(raw));
  });

  it('refuses files that are not snapshots', () => {
    const dir = mkdtempSync(join(tmpdir(), 'riftlog-snapshot-'));
    const path = join(dir, 'bad.json');
    writeFileSync(path, JSON.stringify({ items: [] }));
    expect(() => loadSnapshot(path)).toThrow(/not a Riftcodex snapshot/);
    expect(() => loadSnapshot(join(dir, 'missing.json'))).toThrow(/Can't read snapshot/);
  });
});
