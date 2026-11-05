import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { normalizeNote } from '@riftlog/core';

/** The longest note, as in the old note editor. */
const MAX = 2000;

/**
 * A note written in place: a label, then the text itself as a field that
 * grows with what's typed. It saves when the field loses focus (tap
 * elsewhere, scroll the keyboard away) and only if the text changed. No
 * modal: tap, type, done. A failed save keeps the text and says so.
 */
const InlineNote = ({
  label,
  note,
  placeholder = 'Add a note',
  onSave,
}: {
  /** e.g. "Round" or "Game 2"; also the field's spoken name. */
  label: string;
  note: string | null;
  placeholder?: string;
  /** Persist the text (blank clears the note). */
  onSave: (text: string) => Promise<void>;
}) => {
  const [text, setText] = useState(note ?? '');
  const [failed, setFailed] = useState(false);

  const save = async () => {
    if (normalizeNote(text) === normalizeNote(note ?? '')) return;
    try {
      setFailed(false);
      await onSave(text);
    } catch {
      setFailed(true);
    }
  };

  return (
    <View className="px-4 py-3">
      <Text className="mb-1 font-display text-[12px] text-ink-secondary">{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => void save()}
        placeholder={placeholder}
        multiline
        scrollEnabled={false}
        maxLength={MAX}
        accessibilityLabel={`${label} note`}
        className="p-0 text-[15px] leading-5 text-ink-primary placeholder:text-ink-tertiary"
      />
      {failed && (
        <Text className="mt-1 text-[12px] text-loss-text">
          Couldn&apos;t save. Check your connection and tap the note again.
        </Text>
      )}
    </View>
  );
};

export default InlineNote;
