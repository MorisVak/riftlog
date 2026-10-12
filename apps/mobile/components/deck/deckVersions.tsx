import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { DeckVersion } from '@/lib/decks';
import Icon from '@/components/icon';

/** "Oct 5, 2026" */
export const formatVersionDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/**
 * "Versions" at the bottom of a deck: one card whose header expands into the
 * deck's history, newest first — "Version N", its date, and a "Current" tag.
 * Tapping an earlier one opens it read-only. Only rendered when there's more
 * than one version.
 *
 * Versions are numbered oldest-first, so "Version 1" is always the list the
 * deck was first imported with — renames never touch this history.
 */
const DeckVersions = ({
  versions,
  currentId,
  onOpen,
}: {
  /** Oldest first, as `fetchDeckVersions` returns them. */
  versions: DeckVersion[];
  currentId: string;
  onOpen: (versionId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const rows = versions.map((v, i) => ({ v, n: i + 1 })).reverse();

  return (
    <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Versions, ${versions.length}`}
        onPress={() => {
          Haptics.selectionAsync();
          setOpen((o) => !o);
        }}
        className="min-h-[52px] flex-row items-center gap-2.5 px-4 py-3.5 active:bg-elevated"
      >
        <Icon name="clock" size={15} className="text-ink-secondary" />
        <Text className="flex-1 font-display text-base text-ink-secondary">
          Versions
        </Text>
        <Text className="font-mono-medium text-[13px] text-ink-secondary">
          {versions.length}
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          className="text-ink-secondary"
        />
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(180)}>
          {rows.map(({ v, n }) => {
            const current = v.id === currentId;
            return (
              <Pressable
                key={v.id}
                accessibilityRole="button"
                accessibilityLabel={`Version ${n}${current ? ', current' : ''}, ${formatVersionDate(v.createdAt)}`}
                disabled={current}
                onPress={() => onOpen(v.id)}
                className="min-h-[48px] flex-row items-center gap-2 border-t border-border/60 px-4 py-3 active:bg-elevated"
              >
                <Text className="font-display-bold text-[15px] text-ink-primary">
                  Version {n}
                </Text>
                {current && (
                  <View className="rounded-full bg-accent/15 px-2 py-0.5">
                    <Text className="font-display text-[11px] text-accent">
                      Current
                    </Text>
                  </View>
                )}
                <Text className="ml-auto font-mono-medium text-[12px] text-ink-tertiary">
                  {formatVersionDate(v.createdAt)}
                </Text>
                {current ? (
                  <View className="w-4" />
                ) : (
                  <Icon name="chevron-right" size={16} className="text-ink-tertiary" />
                )}
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
};

export default DeckVersions;
