import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  DeckCodeError,
  decodeDeckCode,
  deckListFromCode,
  formatDeckText,
  looksLikeDeckCode,
  normalizeCardName,
  parseDeckText,
  printingsKey,
  withPrintingsFrom,
  type DeckList,
  type ParsedDeck,
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
import { useCatalog } from '@/contexts/catalogContext';
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
 * "Champion, Title" (the catalog writes "Champion - Title"); the champion part
 * is what players call the deck.
 */
const defaultDeckName = (legendName: string | undefined): string =>
  (legendName ?? '').split(/,| - /)[0]?.trim().slice(0, DECK_NAME_MAX) ?? '';

/** The legend as a match key, so "Riven - The Exile" and "Riven, The Exile" agree. */
const legendKey = (list: DeckList): string | null =>
  list.legend ? normalizeCardName(list.legend.name) : null;

const CODE_MESSAGES: Record<'no_catalog' | 'invalid' | 'newer_format', string> = {
  no_catalog:
    "The card catalog hasn't loaded yet, and it's needed to sort a deck code. Connect to the internet and try again.",
  invalid: "This doesn't look like a valid deck code. Copy it again from Piltover Archive.",
  newer_format: 'This code comes from a newer Piltover Archive format. Update Riftlog to import it.',
};

/**
 * Import a deck, or with a `deckId` param edit one's list — one screen, one
 * way to do it in both: a decklist box (Piltover Archive → Export → Text),
 * and an "Import deck code" button above it that opens a code field. A good
 * code (typed, pasted there, or pasted into the decklist box) fills the box
 * with the list it stands for, sorted by the card catalog's types
 * (`deckListFromCode`; printings the catalog doesn't know go to an
 * "Unsorted" section), and the code stays visible. Parsing is live and local.
 *
 * Text carries names only, so on save every card gets its printing back
 * (`withPrintingsFrom`): from the pasted code first, else (editing) from the
 * deck as it was — a text edit doesn't drop alt arts; only new cards get the
 * base printing.
 *
 * Importing saves through `createDeck` (the deck and its first immutable
 * version); a list that is still exactly a pasted code's is saved with
 * import_source 'piltover_code' and the code. Editing saves through
 * `updateDeckList`, a new immutable version — matches already played keep
 * the list they were played with. The box starts with the current list as
 * text (`formatDeckText`), so a change is editing a line and a new list is
 * Clear + paste; the name isn't edited here (the deck screen renames). A list
 * with the same cards but other printings counts as a change. If the legend
 * changes, Save asks first.
 */
const ImportDeck = () => {
  // The preview checks cards against the catalog; make sure it's current.
  const { refresh: refreshCatalog } = useCatalog();
  useEffect(() => refreshCatalog(), [refreshCatalog]);
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const editing = typeof deckId === 'string' && deckId !== '';
  // Edit mode: the list being edited, once loaded ('error' if it couldn't be).
  const [original, setOriginal] = useState<DeckList | 'error' | null>(null);
  const [text, setText] = useState('');
  // The list from the last deck code imported, whose printings win on save.
  const [codeList, setCodeList] = useState<DeckList | null>(null);
  // The "Import deck code" panel: open?, the code, and how it went.
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeApplied, setCodeApplied] = useState(false);
  // What the user typed into the name field. Empty means "use the legend's
  // name", which the field shows as its placeholder.
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { index } = useCatalog();
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

  // A code never stays in the box: applyText turns it into its list.
  const parsed = useMemo((): ParsedDeck | null => {
    if (text.trim() === '') return null;
    const fromText = parseDeckText(text);
    // Give every card its printing back: the pasted code's, else the deck's.
    const fromCode = codeList ? withPrintingsFrom(fromText.list, codeList) : fromText.list;
    const list = originalList ? withPrintingsFrom(fromCode, originalList) : fromCode;
    return { ...fromText, list };
  }, [text, codeList, originalList]);
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
      parsed.list.sideboard.length > 0 ||
      (parsed.list.unsorted?.length ?? 0) > 0);
  // Warnings never block a save; errors (dropped lines) do, so nothing the
  // user pasted silently goes missing.
  // Edit mode: compared as formatted text, so extra spaces / blank lines or
  // retyping the same list don't count as a change.
  // Printings count too, so swapping in alt arts from a code is a change.
  const changed =
    !editing ||
    (parsed !== null &&
      originalList !== null &&
      (formatDeckText(parsed.list) !== formatDeckText(originalList) ||
        printingsKey(parsed.list) !== printingsKey(originalList)));
  const legendChanged =
    editing &&
    parsed !== null &&
    originalList !== null &&
    legendKey(parsed.list) !== legendKey(originalList);
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

  /**
   * Read a deck code and, if it's good, fill the decklist box with
   * the list it stands for (its printings kept for the save). The code stays
   * in its own field, so it's clear what was imported.
   */
  const importCode = (raw: string) => {
    setCodeInput(raw);
    setCodeError(null);
    setCodeApplied(false);
    const t = raw.trim();
    if (t === '') return;
    if (!looksLikeDeckCode(t)) {
      setCodeError(CODE_MESSAGES.invalid);
      return;
    }
    try {
      const decoded = decodeDeckCode(t);
      if (!index) {
        setCodeError(CODE_MESSAGES.no_catalog);
        return;
      }
      const list = deckListFromCode(decoded, index);
      setCodeList(list);
      setText(formatDeckText(list));
      setCodeApplied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setCodeError(CODE_MESSAGES[e instanceof DeckCodeError ? e.kind : 'invalid']);
    }
  };

  /** Put text in the decklist box; a code pasted there goes to the code field. */
  const applyText = (t: string) => {
    if (looksLikeDeckCode(t)) {
      setCodeOpen(true);
      importCode(t);
      return;
    }
    setText(t);
  };

  const pasteFromClipboard = async (target: 'list' | 'code' = 'list') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotice(null);
    const clip = await Clipboard.getStringAsync();
    if (clip.trim() === '') {
      if (target === 'code') setCodeError('Your clipboard is empty. Copy the deck code first.');
      else setNotice('Your clipboard is empty. Copy the decklist first.');
      return;
    }
    if (target === 'code') importCode(clip);
    else applyText(clip);
  };

  // A new legend is a different deck in all but name; make sure it's meant.
  const confirmSave = () => {
    if (!canSave || parsed === null) return;
    if (!legendChanged || originalList === null) {
      void save();
      return;
    }
    const from = originalList.legend?.name ?? 'no legend';
    const to = parsed.list.legend?.name ?? 'no legend';
    Alert.alert(
      'Change the legend?',
      `This list has ${to} instead of ${from}. Save it to this deck anyway?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => void save() },
      ],
    );
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
      // Still exactly the pasted code's list: record where it came from.
      const fromCode =
        codeList !== null &&
        codeInput.trim() !== '' &&
        formatDeckText(parsed.list) === formatDeckText(codeList) &&
        printingsKey(parsed.list) === printingsKey(codeList);
      const id = await createDeck({
        name: trimmedName,
        list: parsed.list,
        ...(fromCode ? { importSource: 'piltover_code' as const, sourceCode: codeInput.trim() } : {}),
      });
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
            </Text>
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

          {!codeOpen && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                Haptics.selectionAsync();
                setCodeOpen(true);
              }}
              className="mb-5 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 active:bg-elevated"
            >
              <Icon name="hash" size={15} className="text-accent" />
              <Text className="font-display text-sm text-accent">Import deck code</Text>
            </TouchableOpacity>
          )}

          {codeOpen && (
            <View className="mb-5 rounded-2xl border border-border bg-surface p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-display text-base text-ink-secondary">Deck code</Text>
                <View className="flex-row items-center gap-4">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Paste deck code from clipboard"
                    onPress={() => void pasteFromClipboard('code')}
                    hitSlop={8}
                    className="flex-row items-center gap-1.5"
                  >
                    <Icon name="clipboard" size={13} className="text-accent" />
                    <Text className="font-display text-[13px] text-accent">Paste</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Close deck code"
                    onPress={() => setCodeOpen(false)}
                    hitSlop={8}
                  >
                    <Icon name="x" size={16} className="text-ink-secondary" />
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                value={codeInput}
                onChangeText={importCode}
                placeholder="Paste a deck code from Piltover Archive"
                multiline
                textAlignVertical="top"
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                accessibilityLabel="Deck code"
                className="max-h-24 min-h-[56px] rounded-xl border border-border bg-elevated px-3 py-2.5 font-mono-medium text-[12px] leading-[18px] text-ink-primary placeholder:text-ink-tertiary"
              />
              {codeApplied && (
                <View className="mt-2.5 flex-row items-center gap-1.5">
                  <Icon name="check" size={14} className="text-accent" />
                  <Text className="text-[13px] text-ink-primary">
                    Decklist updated from this code.
                  </Text>
                </View>
              )}
              {codeError !== null && (
                <View className="mt-2.5 flex-row gap-1.5">
                  <Icon name="alert-circle" size={14} className="mt-0.5 text-loss-text" />
                  <Text className="flex-1 text-[13px] leading-[18px] text-loss-text">{codeError}</Text>
                </View>
              )}
            </View>
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
                    setCodeList(null);
                    setCodeApplied(false);
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
                accessibilityLabel="Paste from clipboard"
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
              setNotice(null);
              applyText(t);
            }}
            placeholder={loadingOriginal ? 'Loading deck…' : 'Paste your decklist here'}
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
                onPress={confirmSave}
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
