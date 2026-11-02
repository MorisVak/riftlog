/** Reads and checks overrides.json — the versioned list of source corrections. */
import { PRINTING_CODE } from '@riftlog/core';
import { OVERRIDE_FIELDS, type Override, type OverrideField } from './transform';

const isField = (f: unknown): f is OverrideField =>
  typeof f === 'string' && (OVERRIDE_FIELDS as readonly string[]).includes(f);

const checkValue = (field: OverrideField, value: unknown): string | null => {
  switch (field) {
    case 'code':
      return typeof value === 'string' && PRINTING_CODE.test(value) ? null : 'must be a printing code';
    case 'name':
    case 'type':
    case 'text':
      return typeof value === 'string' ? null : 'must be a string';
    case 'supertype':
    case 'image_url':
      return value === null || typeof value === 'string' ? null : 'must be a string or null';
    case 'domains':
      return Array.isArray(value) && value.every((v) => typeof v === 'string') ? null : 'must be a list of strings';
    case 'orientation':
      return value === 'portrait' || value === 'landscape' ? null : 'must be "portrait" or "landscape"';
    case 'status':
      return value === 'spoiler' || value === 'released' ? null : 'must be "spoiler" or "released"';
    case 'overnumbered':
      return typeof value === 'boolean' ? null : 'must be true or false';
    case 'skip':
      return value === true ? null : 'must be true';
  }
};

export function parseOverrides(raw: unknown): Override[] {
  if (!Array.isArray(raw)) throw new Error('overrides.json must be a list');
  const seen = new Set<string>();
  return raw.map((entry, i) => {
    const at = `overrides.json #${i}`;
    if (typeof entry !== 'object' || entry === null) throw new Error(`${at}: not an object`);
    const { riftcodex_id, field, value, note } = entry as Record<string, unknown>;
    if (typeof riftcodex_id !== 'string' || riftcodex_id === '') throw new Error(`${at}: riftcodex_id missing`);
    if (!isField(field)) throw new Error(`${at}: unknown field ${JSON.stringify(field)}`);
    const problem = checkValue(field, value);
    if (problem) throw new Error(`${at} (${field}): value ${problem}`);
    if (note !== undefined && note !== null && typeof note !== 'string') throw new Error(`${at}: note must be text`);
    const key = `${riftcodex_id}:${field}`;
    if (seen.has(key)) throw new Error(`${at}: ${key} appears twice`);
    seen.add(key);
    return { riftcodex_id, field, value, note: note ?? null };
  });
}
