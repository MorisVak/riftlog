import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { HistoryRowVM } from '@/lib/historyView';

// ink-secondary token — Feather's color is a prop, not a className.
const INK_SECONDARY = '#868FB0';

/**
 * The secondary line under a match row's title: format, plus the round length
 * for a timed match. Shared by the History tab's expandable row and the Home
 * tab's read-only preview row so the two always read the same.
 *
 * The clock icon and limit only appear when the match was actually timed
 * (`vm.timer` is null otherwise) — an untimed match shows just BO1 / BO3.
 */
const MatchMeta = ({ vm }: { vm: HistoryRowVM }) => (
  <View className="mt-0.5 flex-row items-center gap-1.5">
    <Text className="text-xs text-ink-secondary">{vm.format}</Text>
    {vm.timer && (
      <>
        <Text className="text-xs text-ink-tertiary">·</Text>
        <Feather name="clock" size={10} color={INK_SECONDARY} />
        <Text className="text-xs text-ink-secondary">{vm.timer.limit}</Text>
      </>
    )}
  </View>
);

export default MatchMeta;
