import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NOTE_MAX } from '@riftlog/core';

/** Show the counter once you're this close to the limit. */
const COUNTER_FROM = NOTE_MAX - 200;

type Props = {
  /** Open with this text; null closes the editor. */
  initial: string | null;
  visible: boolean;
  /** "Game 2 note", "Round notes", … */
  title: string;
  /** Shown while the field is empty. */
  placeholder: string;
  /**
   * Persist the text (blank clears the note). Throw to keep the editor open
   * with an error — e.g. offline on the match detail.
   */
  onSave: (text: string) => void | Promise<void>;
  onClose: () => void;
};

/**
 * The one note editor (game notes and round notes, live or later): a native
 * sheet with a full-height multiline field — type, line-break, Save. Like a
 * chat composer, minus sending: nothing leaves until you press Save, and
 * Cancel throws the edit away.
 */
const NoteEditor = ({
  initial,
  visible,
  title,
  placeholder,
  onSave,
  onClose,
}: Props) => {
  const [text, setText] = useState(initial ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reopening starts from the current note, not the last draft.
  useEffect(() => {
    if (visible) {
      setText(initial ?? '');
      setError(null);
      setSaving(false);
    }
  }, [visible, initial]);

  const changed = text.trim() !== (initial ?? '').trim();

  const save = async () => {
    if (saving) return;
    if (!changed) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      if (__DEV__) console.warn('[notes] save failed:', e);
      setError("Couldn't save the note. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              className="h-11 min-w-[72px] justify-center"
            >
              <Text className="font-display text-[16px] text-ink-secondary">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="font-display-bold text-[16px] text-ink-primary">
              {title}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ busy: saving }}
              onPress={() => void save()}
              className="h-11 min-w-[72px] items-end justify-center"
            >
              <Text className="font-display-bold text-[16px] text-accent">
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setError(null);
            }}
            placeholder={placeholder}
            multiline
            autoFocus
            maxLength={NOTE_MAX}
            textAlignVertical="top"
            accessibilityLabel={title}
            className="flex-1 px-5 pt-4 text-[17px] leading-6 text-ink-primary placeholder:text-ink-tertiary"
          />

          <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
            <Text className="flex-1 text-[13px] text-loss-text">
              {error ?? ''}
            </Text>
            {text.length >= COUNTER_FROM && (
              <Text className="font-mono-medium text-[12px] text-ink-tertiary">
                {text.length}/{NOTE_MAX}
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default NoteEditor;
