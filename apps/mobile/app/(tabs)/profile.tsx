import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/authContext';
import { useProfile } from '@/contexts/profileContext';
import AuthGate from '@/components/authGate';
import Avatar from '@/components/avatar';
import Icon from '@/components/icon';
import DeckRow from '@/components/deck/deckRow';
import DeckPicker from '@/components/deck/deckPicker';
import { setDefaultDeck } from '@/lib/profile';
import { deleteDeck, deleteDecks, fetchMyDecks, type Deck } from '@/lib/decks';
import { useSelection } from '@/hooks/useSelection';
import SelectionBar from '@/components/selectionBar';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

type DecksState = { kind: 'loading' } | { kind: 'ready'; decks: Deck[] } | { kind: 'error' };

/** "My decks" order: last edited (the server's order) or when imported. */
type DeckSort = 'updated' | 'created';
const SORTS: { key: DeckSort; label: string; short: string }[] = [
  { key: 'updated', label: 'Recently updated', short: 'Updated' },
  { key: 'created', label: 'Recently created', short: 'Created' },
];

// The sort menu floats over the list — same lift as the deck picker's menu,
// as a style object (see the shadow note in apps/mobile/CLAUDE.md).
const MENU_SHADOW = {
  shadowColor: '#0D1B2A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.6,
  shadowRadius: 16,
} as const;

/**
 * Profile tab: identity header, then "My decks". The handle is claimed at
 * onboarding; the rename UI and stats come later. Sign out sits in the header
 * because there's nowhere else for it yet.
 *
 * "My decks" is deliberately bare — a plain list plus an import entry point;
 * its final placement is still to be decided. With more than one deck it gets
 * a search (deck name or legend, like the deck picker) and a sort.
 */
const Profile = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, status } = useAuth();
  const [decksState, setDecksState] = useState<DecksState>({ kind: 'loading' });
  const selection = useSelection();
  const { exit: exitSelection, clearSelected } = selection;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DeckSort>('updated');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const pickSort = (key: DeckSort) => {
    Haptics.selectionAsync();
    setSort(key);
    setSortMenuOpen(false);
  };

  const allDecks = useMemo(
    () => (decksState.kind === 'ready' ? decksState.decks : []),
    [decksState],
  );
  const shownDecks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const key = sort === 'updated' ? 'updatedAt' : 'createdAt';
    return allDecks
      .filter(
        (d) =>
          q === '' ||
          d.name.toLowerCase().includes(q) ||
          (d.list.legend?.name.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => b[key].localeCompare(a[key]));
  }, [allDecks, query, sort]);

  // A search can hide selected rows; never act on rows you can't see.
  useEffect(() => {
    clearSelected();
  }, [query, clearSelected]);

  // Leaving the tab ends selection mode.
  useFocusEffect(useCallback(() => () => exitSelection(), [exitSelection]));
  // Read from profileContext (the same row that drives the onboarding gate),
  // re-fetched on focus so a change made elsewhere shows up here.
  const { profile, profileStatus, refresh } = useProfile();
  const loaded = profileStatus === 'ready' || profileStatus === 'error';

  const titleIntro = useSharedValue(0);
  const headerIntro = useSharedValue(0);
  const decksIntro = useSharedValue(0);
  const titleStyle = useRise(titleIntro);
  const headerStyle = useRise(headerIntro);
  const decksStyle = useRise(decksIntro);

  useFocusEffect(
    useCallback(() => {
      // Replay on each focus, matching Home and History.
      playIntro([titleIntro, headerIntro, decksIntro]);
      void refresh();
      // Signed out, this screen renders behind the login gate; fetching
      // would only paint an RLS error under the blur.
      if (status !== 'authed') return;
      let active = true;
      fetchMyDecks()
        .then((decks) => {
          if (active) setDecksState({ kind: 'ready', decks });
        })
        .catch(() => {
          if (active) setDecksState({ kind: 'error' });
        });
      return () => {
        active = false;
      };
    }, [titleIntro, headerIntro, decksIntro, refresh, status]),
  );

  // The default deck, shown optimistically while the save is in flight.
  const [pendingDefault, setPendingDefault] = useState<string | null | undefined>(
    undefined,
  );
  const defaultDeckId =
    pendingDefault !== undefined ? pendingDefault : (profile?.defaultDeckId ?? null);
  const defaultDeck =
    decksState.kind === 'ready'
      ? (decksState.decks.find((d) => d.id === defaultDeckId) ?? null)
      : null;

  const chooseDefault = (deck: Deck | null) => {
    const id = deck?.id ?? null;
    setPendingDefault(id);
    setDefaultDeck(id)
      .then(() => refresh())
      .catch((e) => {
        if (__DEV__) console.warn('[profile] default deck save failed:', e);
        Alert.alert('Could not save', 'Please check your connection and try again.');
      })
      .finally(() => setPendingDefault(undefined));
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'Your matches stay in your account. Any match in progress on this device is discarded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );
  };

  const openImport = () => router.push('/decks/import');

  // Multi-select delete: confirm, drop the rows at once, archive them in one
  // call; on failure put them all back.
  const deleteSelectedDecks = () => {
    if (decksState.kind !== 'ready') return;
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    const n = ids.length;
    Alert.alert(
      n === 1 ? 'Delete 1 deck?' : `Delete ${n} decks?`,
      `${n === 1 ? 'It' : 'They'}'ll be removed from your decks. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const idSet = new Set(ids);
            const removed = decksState.decks.filter((d) => idSet.has(d.id));
            setDecksState((cur) =>
              cur.kind === 'ready'
                ? { kind: 'ready', decks: cur.decks.filter((d) => !idSet.has(d.id)) }
                : cur,
            );
            exitSelection();
            deleteDecks(ids).then(() => refresh()).catch((e) => {
              if (__DEV__) console.warn('[decks] bulk delete failed:', e);
              setDecksState((cur) =>
                cur.kind === 'ready'
                  ? {
                      kind: 'ready',
                      decks: [...cur.decks, ...removed].sort((a, b) =>
                        b.updatedAt.localeCompare(a.updatedAt),
                      ),
                    }
                  : cur,
              );
              Alert.alert('Could not delete', 'Please check your connection and try again.');
            });
          },
        },
      ],
    );
  };

  // Same as match history: drop the row at once, then delete on the server;
  // on failure put it back (in updated order) so the list stays truthful.
  const handleDeleteDeck = (deck: Deck) => {
    setDecksState((cur) =>
      cur.kind === 'ready'
        ? { kind: 'ready', decks: cur.decks.filter((d) => d.id !== deck.id) }
        : cur,
    );
    deleteDeck(deck.id).then(() => refresh()).catch((e) => {
      if (__DEV__) console.warn('[decks] delete failed:', e);
      setDecksState((cur) =>
        cur.kind === 'ready'
          ? {
              kind: 'ready',
              decks: [...cur.decks, deck].sort((a, b) =>
                b.updatedAt.localeCompare(a.updatedAt),
              ),
            }
          : cur,
      );
      Alert.alert('Could not delete', 'Please check your connection and try again.');
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 14,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => setSortMenuOpen(false)}
    >
      <Animated.View style={titleStyle}>
        <Text className="mb-7 font-display-bold text-2xl text-ink-primary">
          Profile
        </Text>
      </Animated.View>

      <Animated.View style={headerStyle} className="flex-row items-center gap-4">
        <Avatar size={64} />

        <View className="flex-1">
          {/* Until the row loads, hold the header's shape with placeholders
              rather than a spinner, so nothing jumps when it arrives. A missing
              row (the seed trigger swallowed a failure) degrades the same way;
              onboarding repairs it. */}
          <Text
            className="font-display-bold text-lg text-ink-primary"
            numberOfLines={1}
          >
            {profile?.displayName ?? (loaded ? 'Player' : ' ')}
          </Text>
          {/* The @handle is the unique identity; display name is cosmetic
              and may collide. */}
          <Text
            className="mt-0.5 font-mono-medium text-[13px] text-ink-secondary"
            numberOfLines={1}
          >
            {profile ? `@${profile.username}` : loaded ? '—' : ' '}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={confirmSignOut}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface active:bg-elevated"
        >
          <Icon name="log-out" size={17} className="text-ink-secondary" />
        </TouchableOpacity>
      </Animated.View>

      {profileStatus === 'error' && (
        <Text className="mt-4 text-center text-sm text-loss-text">
          {"Couldn't load your profile. Check your connection."}
        </Text>
      )}

      {/* The deck a new match starts with. Only once there are decks to
          choose from; the server clears it if that deck is deleted. */}
      {decksState.kind === 'ready' && decksState.decks.length > 0 && (
        <Animated.View style={decksStyle} className="mt-8">
          <Text className="mb-2 font-display text-base text-ink-secondary">
            Default deck
          </Text>
          <DeckPicker
            value={defaultDeck}
            onChange={chooseDefault}
            noneLabel="No default deck"
            title="Default deck"
            defaultDeckId={defaultDeckId}
          />
          <Text className="mt-1.5 px-1 text-[12px] leading-4 text-ink-tertiary">
            Picked for you when you start a match. You can still change it
            there.
          </Text>
        </Animated.View>
      )}

      <Animated.View style={decksStyle} className="mt-8">
        {/* Both header states share one fixed slot and cross-fade, so the
            swap doesn't pop in a single frame while the rows slide. */}
        <View className="mb-3 h-11">
          {selection.active ? (
            <Animated.View
              key="selecting"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="absolute inset-0"
            >
              <SelectionBar
                count={selection.count}
                onCancel={selection.exit}
                actions={[
                  {
                    key: 'delete',
                    icon: 'trash-2',
                    label: 'Delete selected decks',
                    onPress: deleteSelectedDecks,
                    destructive: true,
                  },
                ]}
              />
            </Animated.View>
          ) : (
            <Animated.View
              key="title"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="absolute inset-0 flex-row items-center justify-between"
            >
              <Text className="font-display text-base text-ink-secondary">
                My decks
              </Text>
              <View className="flex-row items-center gap-1">
                {decksState.kind === 'ready' && decksState.decks.length > 0 && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Select decks"
                    onPress={() => selection.start()}
                    className="h-11 justify-center px-3"
                  >
                    <Text className="font-display text-[15px] text-accent">
                      Select
                    </Text>
                  </TouchableOpacity>
                )}
                {/* A real touch target (44pt tall), not a text link. */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Import deck"
                  onPress={openImport}
                  className="h-11 flex-row items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 active:bg-accent/25"
                >
                  <Icon name="plus" size={17} className="text-accent" />
                  <Text className="font-display text-[15px] text-accent">
                    Import deck
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>

        {allDecks.length > 1 && (
          // z-20 so the sort menu drops over the list below.
          <View className="z-20 mb-3 flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3">
              <Icon name="search" size={16} className="text-ink-tertiary" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSortMenuOpen(false)}
                placeholder="Search decks or legends"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Search decks"
                className="h-11 flex-1 text-[16px] text-ink-primary placeholder:text-ink-tertiary"
              />
            </View>
            <View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Sort: ${SORTS.find((o) => o.key === sort)?.label}`}
                accessibilityState={{ expanded: sortMenuOpen }}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSortMenuOpen((o) => !o);
                }}
                className={`h-11 flex-row items-center gap-1.5 rounded-xl border px-3 ${
                  sortMenuOpen ? 'border-accent bg-accent/15' : 'border-border bg-surface'
                }`}
              >
                <Icon
                  name="filter"
                  size={15}
                  className={sortMenuOpen ? 'text-accent' : 'text-ink-secondary'}
                />
                <Text
                  className={`font-display text-[14px] ${
                    sortMenuOpen ? 'text-accent' : 'text-ink-secondary'
                  }`}
                >
                  {SORTS.find((o) => o.key === sort)?.short}
                </Text>
                <Icon
                  name={sortMenuOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  className={sortMenuOpen ? 'text-accent' : 'text-ink-secondary'}
                />
              </TouchableOpacity>

              {sortMenuOpen && (
                <Animated.View
                  entering={FadeIn.duration(120)}
                  exiting={FadeOut.duration(100)}
                  style={MENU_SHADOW}
                  className="absolute right-0 top-[52px] w-56 overflow-hidden rounded-xl border border-border bg-elevated"
                >
                  {SORTS.map((o, i) => (
                    <Pressable
                      key={o.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sort === o.key }}
                      onPress={() => pickSort(o.key)}
                      className={`min-h-[44px] flex-row items-center gap-2 px-3.5 py-2.5 active:bg-surface ${
                        i > 0 ? 'border-t border-border/60' : ''
                      }`}
                    >
                      <Text className="flex-1 text-[15px] text-ink-primary">
                        {o.label}
                      </Text>
                      {sort === o.key && (
                        <Icon name="check" size={16} className="text-accent" />
                      )}
                    </Pressable>
                  ))}
                </Animated.View>
              )}
            </View>
          </View>
        )}

        {decksState.kind === 'loading' ? (
          <Text className="py-6 text-center text-sm text-ink-tertiary">
            Loading decks…
          </Text>
        ) : decksState.kind === 'error' ? (
          <Text className="py-6 text-center text-sm text-ink-secondary">
            {"Couldn't load your decks. Check your connection."}
          </Text>
        ) : decksState.decks.length === 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={openImport}
            className="items-center rounded-2xl border border-dashed border-border px-6 py-8 active:bg-surface"
          >
            <Icon name="layers" size={20} className="text-ink-tertiary" />
            <Text className="mt-2 font-display text-[15px] text-ink-primary">
              No decks yet
            </Text>
            <Text className="mt-1 text-center text-[13px] leading-[18px] text-ink-secondary">
              Paste a decklist from Piltover Archive to import your first deck.
            </Text>
          </TouchableOpacity>
        ) : shownDecks.length === 0 ? (
          <View className="items-center py-6">
            <Text className="text-center text-[14px] text-ink-secondary">
              No decks match “{query.trim()}”.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setQuery('')}
              className="mt-2 px-3 py-2"
            >
              <Text className="font-display text-[14px] text-accent">
                Clear search
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-2.5">
            {shownDecks.map((deck) => (
              <DeckRow
                key={deck.id}
                deck={deck}
                isDefault={deck.id === defaultDeckId}
                date={sort}
                onPress={() => router.push(`/decks/${deck.id}`)}
                onDelete={() => handleDeleteDeck(deck)}
                selecting={selection.active}
                selected={selection.isSelected(deck.id)}
                onSelect={() => selection.toggle(deck.id)}
                onLongPress={() => selection.start(deck.id)}
              />
            ))}
          </View>
        )}

        {/* Tap anywhere else in the section to close the sort menu. */}
        {sortMenuOpen && (
          <Pressable
            accessibilityLabel="Close sort menu"
            onPress={() => setSortMenuOpen(false)}
            className="absolute inset-0 z-10"
          />
        )}
      </Animated.View>

    </ScrollView>
  );
};

const ProfileTab = () => (
  <AuthGate>
    <Profile />
  </AuthGate>
);

export default ProfileTab;
