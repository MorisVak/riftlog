import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from '@/components/icon';

/**
 * A note as a tappable row: the text (clamped) when there is one, otherwise an
 * "Add note" prompt. Tapping opens the note editor. Used on the match detail,
 * the between-games screen, and the match-complete screen.
 */
const NoteRow = ({
  label,
  note,
  prompt = 'Add note',
  onPress,
  disabled = false,
  lines = 3,
  showLabel = false,
}: {
  /** e.g. "Game 1" or "Round notes"; also the screen-reader label. */
  label: string;
  note: string | null | undefined;
  prompt?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Max lines of the note shown before it's clamped. */
  lines?: number;
  /** Show `label` as a caption above the note (lists of several notes). */
  showLabel?: boolean;
}) => {
  const has = !!note;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        has ? `${label} note: ${note}. Edit` : `${label}: ${prompt}`
      }
      onPress={onPress}
      disabled={disabled}
      className="min-h-[44px] flex-row items-start gap-2.5 py-2.5 active:opacity-70"
    >
      <Icon
        name={has ? 'file-text' : 'edit-3'}
        size={15}
        className={`mt-0.5 ${has ? 'text-ink-secondary' : 'text-accent'}`}
      />
      <View className="flex-1">
        {showLabel && (
          <Text className="mb-0.5 font-display text-[12px] text-ink-secondary">
            {label}
          </Text>
        )}
        {has ? (
          <Text
            className="text-[14px] leading-5 text-ink-primary"
            numberOfLines={lines}
          >
            {note}
          </Text>
        ) : (
          <Text className="font-display text-[14px] text-accent">{prompt}</Text>
        )}
      </View>
      {has && (
        <Icon name="edit-2" size={14} className="mt-0.5 text-ink-tertiary" />
      )}
    </Pressable>
  );
};

export default NoteRow;
