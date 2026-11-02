import React from 'react';
import { Text } from 'react-native';

/**
 * Riot's required fan-content disclaimer, verbatim (see the Riot policy in
 * the root CLAUDE.md). Shown under any surface with card art, and always on
 * Profile → About: card names and text are Riot content too.
 */
export const RIOT_DISCLAIMER =
  'Riftlog is a fan-made application and is not affiliated with, endorsed by, or sponsored by Riot Games. All Riftbound imagery and trademarks are property of Riot Games.';

const RiotDisclaimer = ({ className = '' }: { className?: string }) => (
  <Text className={`text-[11px] leading-4 text-ink-tertiary ${className}`}>{RIOT_DISCLAIMER}</Text>
);

export default RiotDisclaimer;
