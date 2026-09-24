import React from 'react';
import { Text, View } from 'react-native';
import Icon from '@/components/icon';

type DeckSectionProps = {
  title: string;
  /** Cards in the section. */
  count: number;
  /** The size a legal deck aims for; omit for "plain count" (sideboard). */
  target?: number;
  children: React.ReactNode;
};

/**
 * A titled block of a decklist with its total. Off-target counts are flagged
 * with an icon + text, never color alone — and only flagged, since sizes are
 * warnings, not errors (see parseDeckText).
 */
const DeckSection = ({ title, count, target, children }: DeckSectionProps) => {
  const offTarget = target !== undefined && count !== target;

  return (
    <View className="mt-4 rounded-2xl border border-border bg-surface px-4 pb-1.5 pt-3.5">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="font-display text-xs uppercase tracking-wider text-ink-secondary">
          {title}
        </Text>
        <View
          className="flex-row items-center gap-1"
          accessible
          accessibilityLabel={
            target === undefined
              ? `${count} cards`
              : `${count} of ${target} cards${offTarget ? ', not the usual size' : ''}`
          }
        >
          {offTarget && (
            <Icon name="alert-circle" size={12} className="text-ink-primary" />
          )}
          <Text
            className={`font-mono-medium text-[13px] ${offTarget ? 'text-ink-primary' : 'text-ink-secondary'}`}
          >
            {target === undefined ? count : `${count}/${target}`}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
};

export default DeckSection;
