import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Icon from '@/components/icon';

/** An earlier version that can be compared against. */
export type CompareOption = { id: string; label: string; date: string };

/**
 * "Show changes" for a decklist, at the bottom of the list: a switch that
 * turns on the green / red marking of what changed since an earlier version.
 * By default that's the version just before the one on screen (the last
 * edit); "Compared with" lets you pick any earlier one instead, e.g. to see
 * everything since the first import. `options` are the earlier versions,
 * newest first. When on, a small key spells out what the colors mean.
 *
 * A plain View switch, not RN's `Switch`, so it takes token classes.
 */
const ChangesToggle = ({
  on,
  onChange,
  options,
  selectedId,
  onSelect,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  options: CompareOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  const [picking, setPicking] = useState(false);
  const selected = options.find((o) => o.id === selectedId) ?? options[0];
  const canPick = options.length > 1;

  return (
    <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel="Show changes"
        onPress={() => {
          Haptics.selectionAsync();
          onChange(!on);
          if (on) setPicking(false);
        }}
        className="min-h-[52px] flex-row items-center gap-3 px-4 py-3"
      >
        <Text className="flex-1 font-display text-[15px] text-ink-primary">
          Show changes
        </Text>
        <View
          className={`h-7 w-12 justify-center rounded-full px-0.5 ${
            on ? 'items-end bg-accent' : 'items-start border border-border bg-elevated'
          }`}
        >
          <View
            className={`h-6 w-6 rounded-full ${on ? 'bg-background' : 'bg-ink-tertiary'}`}
          />
        </View>
      </Pressable>

      {on && selected && (
        <Animated.View entering={FadeIn.duration(150)}>
          {/* Compared with … — a picker when there's more than one choice. */}
          <Pressable
            accessibilityRole={canPick ? 'button' : undefined}
            accessibilityState={canPick ? { expanded: picking } : undefined}
            accessibilityLabel={`Compared with ${selected.label}`}
            disabled={!canPick}
            onPress={() => {
              Haptics.selectionAsync();
              setPicking((p) => !p);
            }}
            className="min-h-[44px] flex-row items-center gap-2 border-t border-border/60 px-4 py-2.5 active:bg-elevated"
          >
            <Text className="text-[13px] text-ink-secondary">Compared with</Text>
            <Text className="flex-1 font-display text-[14px] text-ink-primary">
              {selected.label}
              <Text className="font-mono-medium text-[12px] text-ink-tertiary">
                {'  '}
                {selected.date}
              </Text>
            </Text>
            {canPick && (
              <Icon
                name={picking ? 'chevron-up' : 'chevron-down'}
                size={16}
                className="text-ink-secondary"
              />
            )}
          </Pressable>

          {picking &&
            options.map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityState={{ selected: o.id === selected.id }}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(o.id);
                  setPicking(false);
                }}
                className="min-h-[44px] flex-row items-center gap-2 border-t border-border/60 bg-elevated/50 py-2.5 pl-8 pr-4 active:bg-elevated"
              >
                <Text className="font-display text-[14px] text-ink-primary">
                  {o.label}
                </Text>
                <Text className="flex-1 font-mono-medium text-[12px] text-ink-tertiary">
                  {o.date}
                </Text>
                {o.id === selected.id && (
                  <Icon name="check" size={16} className="text-accent" />
                )}
              </Pressable>
            ))}

          <View className="flex-row items-center gap-4 border-t border-border/60 px-4 py-2.5">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-full bg-added" />
              <Text className="text-[12px] text-ink-secondary">Added</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-full bg-cut" />
              <Text className="text-[12px] text-ink-secondary">Cut</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default ChangesToggle;
