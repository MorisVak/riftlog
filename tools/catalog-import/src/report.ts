/** Human-readable dry-run / apply report. */
import type { Plan, TablePlan } from './plan';
import type { TransformReport } from './transform';

const SAMPLE = 8;

const list = (items: string[], n = SAMPLE): string =>
  items.length === 0
    ? ''
    : items
        .slice(0, n)
        .map((i) => `      ${i}`)
        .join('\n') + (items.length > n ? `\n      … and ${items.length - n} more` : '');

const keyOf = (row: Record<string, unknown>): string =>
  String(row.code ?? row.name ?? `${String(row.riftcodex_id)}:${String(row.field)}`);

function table(name: string, t: Pick<TablePlan<Record<string, unknown>>, 'insert' | 'update' | 'unchanged'> &
  Partial<Pick<TablePlan<Record<string, unknown>>, 'skippedEdited' | 'conflicts'>>): string {
  const out = [
    `  ${name.padEnd(18)} insert ${String(t.insert.length).padStart(5)}   update ${String(t.update.length).padStart(5)}   unchanged ${String(t.unchanged).padStart(5)}` +
      (t.skippedEdited ? `   manually edited ${t.skippedEdited.length}   conflicts ${t.conflicts?.length ?? 0}` : ''),
  ];
  if (t.update.length) {
    out.push('    updates (sample):');
    out.push(list(t.update.map((u) => `${keyOf(u.row)} — ${u.changed.join(', ')}`)));
  }
  if (t.conflicts?.length) {
    out.push('    conflicts (left alone, not from Riftcodex):');
    out.push(list(t.conflicts.map((c) => `${c.key} (source: ${c.source})`), 50));
  }
  return out.join('\n');
}

export function formatReport(report: TransformReport, plan: Plan, mode: 'dry run' | 'apply'): string {
  const lines: string[] = [];
  lines.push(`Catalog import — ${mode}`);
  lines.push('');
  lines.push('Source (Riftcodex)');
  lines.push(`  entries fetched           ${report.fetched}`);
  lines.push(`  spoiler twins dropped     ${report.droppedTwins.length}`);
  lines.push(`  skipped                   ${report.skipped.length}`);
  lines.push(list(report.skipped.map((s) => `${s.riftbound_id} ${s.name} — ${s.reason}`), 50));
  lines.push(`  overrides applied         ${report.overridesApplied.length}`);
  lines.push(`  overrides matching nothing ${report.overridesUnused.length}`);
  lines.push(list(report.overridesUnused.map((o) => `${o.riftcodex_id} ${o.field}`), 50));
  lines.push(`  suspicious names          ${report.suspiciousNames.length}`);
  lines.push(list(report.suspiciousNames.map((s) => `${s.riftbound_id} (${s.riftcodex_id}) "${s.name}"`), 50));
  lines.push('');
  lines.push('Changes');
  lines.push(table('catalog_overrides', plan.overrides));
  if (plan.overrides.onlyInDatabase.length) {
    lines.push('    in the database but not in overrides.json (kept):');
    lines.push(list(plan.overrides.onlyInDatabase, 50));
  }
  lines.push(table('sets', plan.sets));
  lines.push(table('cards', plan.cards));
  lines.push(table('card_printings', plan.printings));
  lines.push('');
  lines.push(`Gone from Riftcodex (kept, not deleted): ${plan.missingFromSource.printings.length} printings, ${plan.missingFromSource.cards.length} cards`);
  lines.push(list([...plan.missingFromSource.printings, ...plan.missingFromSource.cards], 50));
  lines.push('');
  if (plan.stops.length) {
    lines.push('STOPPED — nothing may be applied until these are fixed:');
    lines.push(list(plan.stops, 50));
  } else {
    lines.push('Safety checks: passed');
  }
  return lines.filter((l) => l !== '').join('\n').replace(/\n(Source|Changes|Gone|Safety|STOPPED)/g, '\n\n$1');
}
