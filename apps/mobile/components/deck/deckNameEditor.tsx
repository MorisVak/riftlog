import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DECK_NAME_MAX, isValidDeckName } from '@/lib/decks';
import Icon from '@/components/icon';

/**
 * A deck's name as the page heading, with a pencil to rename it in place.
 * Renaming touches only `decks.name` — the list lives in immutable versions
 * and is unaffected.
 */
const DeckNameEditor = ({
  name,
  onSave,
}: {
  name: string;
  /** Persist the new name; throw to keep the editor open with an error. */
  onSave: (name: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = draft.trim();
  const canSave = !saving && isValidDeckName(draft) && trimmed !== name;

  const startEditing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft(name);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (trimmed === name) {
      cancel();
      return;
    }
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (e) {
      if (__DEV__) console.warn('[decks] rename failed:', e);
      setError("Couldn't rename the deck. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <View className="flex-row items-center gap-3">
        <Text
          className="flex-1 font-display-bold text-[26px] tracking-tight text-ink-primary"
          onPress={startEditing}
          accessibilityRole="header"
        >
          {name}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Rename deck"
          onPress={startEditing}
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
        >
          <Icon name="edit-2" size={17} className="text-ink-secondary" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TextInput
        value={draft}
        onChangeText={(t) => {
          setDraft(t);
          setError(null);
        }}
        autoFocus
        selectTextOnFocus
        maxLength={DECK_NAME_MAX}
        returnKeyType="done"
        onSubmitEditing={() => void save()}
        placeholder="Deck name"
        accessibilityLabel="Deck name"
        className="rounded-xl border border-accent bg-elevated px-4 py-3 font-display-bold text-[20px] text-ink-primary placeholder:text-ink-tertiary"
      />
      {error !== null ? (
        <Text className="mt-1.5 px-1 text-[12px] leading-4 text-loss-text">
          {error}
        </Text>
      ) : !isValidDeckName(draft) ? (
        <Text className="mt-1.5 px-1 text-[12px] leading-4 text-ink-secondary">
          {`A deck name needs 1–${DECK_NAME_MAX} characters.`}
        </Text>
      ) : null}
      <View className="mt-3 flex-row justify-end gap-2">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={cancel}
          className="h-11 items-center justify-center rounded-full px-5 active:bg-surface"
        >
          <Text className="font-display text-[15px] text-ink-secondary">
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: saving }}
          disabled={!canSave}
          onPress={() => void save()}
          className={`h-11 items-center justify-center rounded-full px-6 ${
            canSave ? 'bg-accent active:bg-accent-strong' : 'bg-surface'
          }`}
        >
          <Text
            className={`font-display-bold text-[15px] ${
              canSave ? 'text-background' : 'text-ink-tertiary'
            }`}
          >
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DeckNameEditor;
