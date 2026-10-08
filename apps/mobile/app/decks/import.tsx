import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  formatDeckText,
  looksLikeDeckCode,
  parseDeckText,
  type DeckList,
} from '@riftlog/core';
import {
  createDeck,
  DECK_NAME_MAX,
  fetchDeck,
  isValidDeckName,
  updateDeckList,
} from '@/lib/decks';
import ImportPreview from '@/components/deck/importPreview';
import Icon from '@/components/icon';
import { CTA_GLOW } from '@/components/ctaGlow';

/**
 * The "Expected format" card under the empty decklist box: the export layout
 * with real cards, trimmed, and what each section needs. Data rather than one
 * string so headers, hints, and card lines can be styled apart.
 */
const FORMAT_EXAMPLE: { header: string; hint?: string; lines: string[] }[] = [
  { header: 'Legend:', lines: ['1 Kennen, Heart of the Tempest'] },
  { header: 'Champion:', lines: ['1 Kennen, Storm of Shuriken'] },
  {
    header: 'MainDeck:',
    hint: '39 + champion = 40',
    lines: ['3 Traveling Merchant', '3 Rhasa the Sunderer', '…'],
  },
  { header: 'Battlefields:', hint: '3', lines: ['1 Zaun Warrens', '…'] },
  { header: 'Runes:', hint: '12', lines: ['9 Chaos Rune', '3 Order Rune'] },
  { header: 'Sideboard:', hint: 'optional', lines: ['2 Decree of Unity', '…'] },
];

/**
 * "Kennen, Heart of the Tempest" → "Kennen". Riftbound card names read
 * "Champion, Title"; the champion part is what players call the deck.
 */
const defaultDeckName = (legendName: string | undefined): string =>
  (legendName ?? '').split(',')[0]?.trim().slice(0, DECK_NAME_MAX) ?? '';

/**
 * Import a deck by pasting a plain-text decklist (Piltover Archive →
 * Export → Text). Parsing is live and local (`parseDeckText`); the one write
 * is `createDeck`, which saves the deck and its first immutable version.
 *
 * Deck codes are recognised but not decoded yet: the option is shown
 * disabled, and a pasted code gets a pointer to the text export instead of a
 * wall of parse errors.
 *
 * With a `deckId` param the same screen EDITS that deck's list: the box
 * starts with the current list as text (`formatDeckText`), so changing a
 * couple of cards is editing a line, and a whole new list is Clear + paste.
 * Saving goes through `updateDeckList`, which adds a new immutable version —
 * matches already played keep the list they were played with. The name isn't
 * edited here; the deck screen renames.
 */
const ImportDeck = () => {
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const editing = typeof deckId === 'string' && deckId !== '';
  // Edit mode: the list being edited, once loaded ('error' if it couldn't be).
  const [original, setOriginal] = useState<DeckList | 'error' | null>(null);
  const [text, setText] = useState('');
  // What the user typed into the name field. Empty means "use the legend's
  // name", which the field shows as its placeholder.
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    fetchDeck(deckId)
      .then((deck) => {
        if (!active) return;
        if (!deck) {
          setOriginal('error');
          return;
        }
        setOriginal(deck.list);
        setText(formatDeckText(deck.list));
      })
      .catch(() => active && setOriginal('error'));
    return () => {
      active = false;
    };
  }, [editing, deckId]);
  const loadingOriginal = editing && original === null;
  const originalList =
    original !== null && original !== 'error' ? original : null;

  const isCode = looksLikeDeckCode(text);
  const parsed = useMemo(
    () => (text.trim() === '' || isCode ? null : parseDeckText(text)),
    [text, isCode],
  );
  const sourceLines = useMemo(() => text.split(/\r\n|\r|\n/), [text]);

  const defaultName = defaultDeckName(parsed?.list.legend?.name);
  const name = nameInput.trim() !== '' ? nameInput : defaultName;
  const trimmedName = name.trim();

  const errorCount =
    parsed?.diagnostics.filter((d) => d.severity === 'error').length ?? 0;
  const hasCards =
    parsed !== null &&
    (parsed.list.legend !== null ||
      parsed.list.champion !== null ||
      parsed.list.main.length > 0 ||
      parsed.list.battlefields.length > 0 ||
      parsed.list.runes.length > 0 ||
      parsed.list.sideboard.length > 0);
  // Warnings never block a save; errors (dropped lines) do, so nothing the
  // user pasted silently goes missing.
  // Edit mode: compared as formatted text, so extra spaces / blank lines or
  // retyping the same list don't count as a change.
  const changed =
    !editing ||
    (parsed !== null &&
      originalList !== null &&
      formatDeckText(parsed.list) !== formatDeckText(originalList));
  const canSave =
    !saving &&
    hasCards &&
    errorCount === 0 &&
    changed &&
    (editing ? originalList !== null : isValidDeckName(name));

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const pasteFromClipboard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotice(null);
    const clip = await Clipboard.getStringAsync();
    if (clip.trim() === '') {
      setNotice('Your clipboard is empty. Copy the decklist first.');
      return;
    }
    setText(clip);
  };

  const save = async () => {
    if (!canSave || parsed === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    setNotice(null);
    try {
      if (editing) {
        await updateDeckList(deckId, parsed.list);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Back to the deck screen, which refreshes on focus.
        close();
        return;
      }
      const id = await createDeck({ name: trimmedName, list: parsed.list });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Leave the modal, then open the saved deck as a normal screen.
      if (router.canGoBack()) router.back();
      router.push(`/decks/${id}`);
    } catch (e) {
      if (__DEV__) console.warn('[decks] save failed:', e);
      setNotice("Couldn't save the deck. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingTop: 20,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="font-display-bold text-[26px] tracking-tight text-ink-primary">
              {editing ? 'Edit decklist' : 'Import deck'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              className="h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
            >
              <Icon name="x" size={17} className="text-ink-secondary" />
            </TouchableOpacity>
          </View>

          {editing && (
            <Text className="-mt-2 mb-5 text-[14px] leading-5 text-ink-secondary">
              Change a count or a line, or clear it and paste a new list.
              Matches you&apos;ve already played keep the list they were played
              with.
            </Text>
          )}

          {/* Source. Only text works today; the code option is shown so the
              feature is discoverable, but it's inert. */}
          {!editing && (
            <View className="mb-4 flex-row gap-2">
              <View
                accessible
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                accessibilityLabel="Text"
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-accent bg-accent/15 py-3"
              >
                <Icon name="file-text" size={15} className="text-accent" />
                <Text className="font-display text-sm text-accent">Text</Text>
              </View>
              <View
                accessible
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                accessibilityLabel="Deck code, coming soon"
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3"
              >
                <Icon name="hash" size={15} className="text-ink-tertiary" />
                <Text className="font-display text-sm text-ink-tertiary">
                  Deck code
                </Text>
                <View className="rounded-full bg-elevated px-1.5 py-0.5">
                  <Text className="font-display text-[10px] uppercase tracking-wider text-ink-secondary">
                    Coming soon
                  </Text>
                </View>
              </View>
            </View>
          )}

          {!editing && (
            <>
              <Text className="mb-2 font-display text-base text-ink-secondary">
                Deck name
              </Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder={defaultName || 'Name this deck'}
                maxLength={DECK_NAME_MAX}
                accessibilityLabel="Deck name"
                className="rounded-xl border border-border bg-elevated px-4 py-3 text-base text-ink-primary placeholder:text-ink-tertiary"
              />
              <Text className="mb-5 mt-1.5 px-1 text-[12px] leading-4 text-ink-tertiary">
                {nameInput.trim() !== ''
                  ? 'You can rename it later from the deck screen.'
                  : defaultName
                    ? `Leave empty to name it “${defaultName}”, after your legend.`
                    : "Leave empty to use your legend's name."}
              </Text>
            </>
          )}

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-display text-base text-ink-secondary">
              Decklist
            </Text>
            <View className="flex-row gap-3">
              {text !== '' && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    // The name is independent of the paste; keep it.
                    setText('');
                    setNotice(null);
                  }}
                  hitSlop={8}
                >
                  <Text className="font-display text-[13px] text-ink-secondary">
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void pasteFromClipboard()}
                hitSlop={8}
                className="flex-row items-center gap-1.5"
              >
                <Icon name="clipboard" size={13} className="text-accent" />
                <Text className="font-display text-[13px] text-accent">
                  Paste from clipboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setNotice(null);
            }}
            placeholder={
              loadingOriginal ? 'Loading deck…' : 'Paste your decklist here'
            }
            editable={!loadingOriginal}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            accessibilityLabel="Decklist text"
            className="max-h-64 min-h-[160px] rounded-xl border border-border bg-elevated px-4 py-3 font-mono-medium text-[13px] leading-5 text-ink-primary placeholder:text-ink-tertiary"
          />

          {text.trim() === '' && (
            <View className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3.5">
              <Text className="mb-2.5 font-display text-base text-ink-secondary">
                Expected format
              </Text>
              <View className="gap-3">
                {FORMAT_EXAMPLE.map((section) => (
                  <View key={section.header}>
                    <View className="flex-row items-baseline justify-between gap-3">
                      <Text className="font-mono-medium text-[12px] leading-[18px] text-ink-secondary">
                        {section.header}
                      </Text>
                      {section.hint ? (
                        <Text className="font-display text-[11px] text-ink-tertiary">
                          {section.hint}
                        </Text>
                      ) : null}
                    </View>
                    {section.lines.map((line, i) => (
                      <Text
                        key={`${section.header}-${i}`}
                        className="font-mono-medium text-[12px] leading-[18px] text-ink-tertiary"
                      >
                        {line}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

          {isCode && (
            <View className="mt-4 flex-row gap-2.5 rounded-2xl border border-border bg-surface p-4">
              <Icon name="info" size={16} className="mt-0.5 text-accent" />
              <Text className="flex-1 text-[14px] leading-5 text-ink-primary">
                Deck codes are coming soon. In Piltover Archive, use Export →
                Text and paste that instead.
              </Text>
            </View>
          )}

          {parsed !== null && (
            <ImportPreview parsed={parsed} sourceLines={sourceLines} />
          )}

          {original === 'error' && (
            <Text className="mt-4 text-center text-sm text-loss-text">
              Couldn&apos;t load this deck. Close and try again.
            </Text>
          )}

          {notice !== null && (
            <Text className="mt-4 text-center text-sm text-loss-text">
              {notice}
            </Text>
          )}

          {parsed !== null && (
            <View className="mt-6">
              {editing && !changed && errorCount === 0 && (
                <Text className="mb-3 text-center text-[13px] leading-[18px] text-ink-secondary">
                  No changes yet.
                </Text>
              )}
              {errorCount > 0 && (
                <Text className="mb-3 text-center text-[13px] leading-[18px] text-ink-secondary">
                  {errorCount === 1
                    ? '1 line couldn’t be read. Fix it to save.'
                    : `${errorCount} lines couldn’t be read. Fix them to save.`}
                </Text>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave, busy: saving }}
                disabled={!canSave}
                onPress={() => void save()}
                style={canSave ? CTA_GLOW : undefined}
                className={`items-center rounded-full px-5 py-4 ${
                  canSave ? 'bg-accent active:bg-accent-strong' : 'bg-surface'
                }`}
              >
                <Text
                  className={`font-display-bold text-base ${
                    canSave ? 'text-background' : 'text-ink-tertiary'
                  }`}
                >
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Save deck'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ImportDeck;
