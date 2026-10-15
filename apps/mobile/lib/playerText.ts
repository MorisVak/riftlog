/**
 * "{name} wins", conjugated for the default name: a blank name field falls
 * back to "You" (see `DEFAULTS` in `contexts/matchContext.tsx`), and
 * "You wins" isn't English.
 */
export function winsLabel(name: string): string {
  return name === 'You' ? 'You win' : `${name} wins`;
}
