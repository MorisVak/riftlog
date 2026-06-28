import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Player } from '@riftlog/core';
import { fetchMatchHistory, type MatchRow } from '@/lib/matchPersistence';

/**
 * History tab. Reads the signed-in user's matches directly from Postgres on
 * focus — history is never mirrored locally (Slice 2, online path). RLS scopes
 * the result to the caller's own rows.
 */
const History = () => {
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      fetchMatchHistory()
        .then((data) => active && setRows(data))
        .catch((e) => active && setError(e?.message ?? 'Failed to load history'));
      return () => {
        active = false;
      };
    }, []),
  );

  if (rows === null && error === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#8B93D9" />
      </View>
    );
  }

  if (error !== null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-display-bold text-2xl text-ink-primary">History</Text>
        <Text className="mt-2 text-center text-sm text-loss-text">{error}</Text>
      </View>
    );
  }

  if (rows !== null && rows.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-display-bold text-2xl text-ink-primary">History</Text>
        <Text className="mt-2 text-center text-sm text-ink-secondary">
          Your completed matches will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6"
      data={rows ?? []}
      keyExtractor={(row) => row.id}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => <HistoryRow row={item} />}
    />
  );
};

const HistoryRow = ({ row }: { row: MatchRow }) => {
  const players = (row.players as unknown as Player[]) ?? [];
  const p1 = players.find((p) => p.id === 'p1');
  const p2 = players.find((p) => p.id === 'p2');

  const result =
    row.winner_id === null
      ? 'Draw'
      : `${players.find((p) => p.id === row.winner_id)?.name ?? row.winner_id} won`;

  const when = new Date(row.ended_at).toLocaleDateString();

  return (
    <View className="rounded-xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-base text-ink-primary">
          {p1?.name ?? 'Player 1'} vs {p2?.name ?? 'Player 2'}
        </Text>
        <Text className="text-xs text-ink-tertiary">Bo{row.best_of}</Text>
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-sm text-ink-secondary">{result}</Text>
        <Text className="font-mono text-sm text-ink-secondary">
          {p1?.gameWins ?? 0}–{p2?.gameWins ?? 0}
        </Text>
      </View>
      <Text className="mt-1 text-xs text-ink-tertiary">{when}</Text>
    </View>
  );
};

export default History;
