import React from 'react';
import { Text, View } from 'react-native';

/**
 * Riot's required statements, verbatim (see the Riot policy in the root
 * CLAUDE.md): the fan-made disclaimer and the Legal Jibber Jabber statement.
 * Shown in exactly ONE place in the app — the bottom of the Profile page,
 * always, whatever the card art flag says.
 */
export const RIOT_DISCLAIMER =
  'Riftlog is a fan-made application and is not affiliated with, endorsed by, or sponsored by Riot Games. All Riftbound imagery and trademarks are property of Riot Games.';

export const LEGAL_JIBBER_JABBER =
  "Riftlog was created under Riot Games' 'Legal Jibber Jabber' policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.";

const RiotDisclaimer = () => (
  <View className="gap-1.5">
    <Text className="text-[11px] leading-4 text-ink-tertiary">{RIOT_DISCLAIMER}</Text>
    <Text className="text-[11px] leading-4 text-ink-tertiary">{LEGAL_JIBBER_JABBER}</Text>
  </View>
);

export default RiotDisclaimer;
