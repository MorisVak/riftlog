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
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/icon';
import SwipeToDelete from '@/components/swipeToDelete';
import SelectionBar from '@/components/selectionBar';
import { SelectionGutter } from '@/components/selectCheck';
import { useSelection } from '@/hooks/useSelection';
import {
  deleteFeedback,
  fetchFeedback,
  setFeedbackRead,
  type FeedbackItem,
} from '@/lib/feedback';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: FeedbackItem[] }
  | { kind: 'error' };

type Filter = 'all' | 'unread' | 'read';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const FilterChip = ({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5 ${
      active ? 'border-accent bg-accent' : 'border-border bg-surface'
    }`}
  >
    <Text
      className={`font-display text-[13px] font-semibold ${
        active ? 'text-background' : 'text-ink-secondary'
      }`}
    >
      {label}
    </Text>
    <Text
      className={`font-mono-medium text-[11px] ${
        active ? 'text-background/70' : 'text-ink-tertiary'
      }`}
    >
      {count}
    </Text>
  </Pressable>
);

/**
 * One feedback entry. Unread: a dot and a bold headline. Tap to open the full
 * text (which marks it read); swipe left to delete; long-press to start
 * selecting. Same row mechanics as History and "My decks".
 */
const FeedbackRow = ({
  item,
  open,
  onToggleOpen,
  onMarkUnread,
  onDelete,
  selecting,
  selected,
  onSelect,
  onLongPress,
}: {
  item: FeedbackItem;
  open: boolean;
  onToggleOpen: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}) => {
  const unread = item.readAt === null;

  return (
    <View className="flex-row items-center">
      <SelectionGutter selecting={selecting} selected={selected} onToggle={onSelect} />
      <View className="flex-1">
        <SwipeToDelete
          accessibilityLabel={`Delete feedback ${item.headline}`}
          confirmTitle="Delete feedback?"
          confirmMessage={`"${item.headline}" will be deleted. This can't be undone.`}
          onDelete={onDelete}
          enabled={!selecting}
          className={`rounded-2xl border bg-surface ${
            selected ? 'border-accent' : 'border-border'
          }`}
        >
          {({ isOpen, close }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${unread ? 'Unread, ' : ''}${item.headline}`}
              accessibilityState={selecting ? { selected } : { expanded: open }}
              onPress={() => {
                if (selecting) {
                  Haptics.selectionAsync();
                  onSelect();
                } else if (isOpen) close();
                else onToggleOpen();
              }}
              // Always set — see DeckRow for why it must not disappear
              // mid-press.
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (selecting) onSelect();
                else onLongPress();
              }}
              delayLongPress={350}
              // Opaque on purpose: the red action sits behind this card.
              className={`px-4 py-3.5 active:bg-elevated ${
                selected ? 'bg-elevated' : 'bg-surface'
              }`}
            >
              <View className="flex-row items-center gap-2">
                {unread && <View className="h-2 w-2 rounded-full bg-accent" />}
                <Text
                  className={`flex-1 text-[16px] ${
                    unread
                      ? 'font-display-bold text-ink-primary'
                      : 'font-display text-ink-secondary'
                  }`}
                  numberOfLines={open ? undefined : 1}
                >
                  {item.headline}
                </Text>
              </View>
              <Text className="mt-1 font-mono text-[11px] text-ink-tertiary">
                {formatWhen(item.createdAt)}
              </Text>
              <Text
                selectable={open}
                numberOfLines={open ? undefined : 2}
                className="mt-2 text-[15px] leading-[21px] text-ink-secondary"
              >
                {item.body}
              </Text>
              {open && !selecting && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={onMarkUnread}
                  className="mt-2 self-start py-1.5"
                >
                  <Text className="font-display text-[13px] text-accent">
                    Mark as unread
                  </Text>
                </TouchableOpacity>
              )}
            </Pressable>
          )}
        </SwipeToDelete>
      </View>
    </View>
  );
};

/**
 * The feedback inbox — admin only (Profile shows the entry point only to
 * feedback admins, and the server refuses everyone else). Newest first,
 * filtered by All / Unread / Read and searchable. Opening an entry marks it
 * read; entries can be marked unread again, and deleted one at a time (swipe)
 * or in bulk (Select / long-press).
 */
const FeedbackInbox = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const selection = useSelection();
  const { clearSelected, exit: exitSelection } = selection;

  const load = useCallback(() => {
    let active = true;
    setState({ kind: 'loading' });
    fetchFeedback()
      .then((items) => active && setState({ kind: 'ready', items }))
      .catch(() => active && setState({ kind: 'error' }));
    return () => {
      active = false;
    };
  }, []);

  useEffect(load, [load]);

  const items = useMemo(
    () => (state.kind === 'ready' ? state.items : []),
    [state],
  );
  const counts = useMemo(() => {
    const unread = items.filter((f) => f.readAt === null).length;
    return { all: items.length, unread, read: items.length - unread };
  }, [items]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (f) =>
        (filter === 'all' || (filter === 'unread') === (f.readAt === null)) &&
        (q === '' ||
          f.headline.toLowerCase().includes(q) ||
          f.body.toLowerCase().includes(q)),
    );
  }, [items, filter, query]);

  // A filter or search change can hide selected rows; never act on rows you
  // can't see.
  useEffect(() => {
    clearSelected();
  }, [filter, query, clearSelected]);

  // Entering selection mode closes the open entry.
  useEffect(() => {
    if (selection.active) setOpenId(null);
  }, [selection.active]);

  // Optimistic: change the rows at once, then the server. On failure, say so
  // and re-read, so the list never shows something that didn't happen.
  const patch = (fn: (items: FeedbackItem[]) => FeedbackItem[]) =>
    setState((cur) => (cur.kind === 'ready' ? { kind: 'ready', items: fn(cur.items) } : cur));
  const failed = (what: string) => (e: unknown) => {
    if (__DEV__) console.warn(`[feedback] ${what} failed:`, e);
    Alert.alert(`Could not ${what}`, 'Please check your connection and try again.');
    load();
  };

  const markRead = (ids: string[], read: boolean) => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    patch((list) =>
      list.map((f) => (idSet.has(f.id) ? { ...f, readAt: read ? (f.readAt ?? now) : null } : f)),
    );
    setFeedbackRead(ids, read).catch(failed(read ? 'mark as read' : 'mark as unread'));
  };

  const remove = (ids: string[]) => {
    const idSet = new Set(ids);
    patch((list) => list.filter((f) => !idSet.has(f.id)));
    deleteFeedback(ids).catch(failed('delete'));
  };

  const toggleOpen = (item: FeedbackItem) => {
    Haptics.selectionAsync();
    const opening = openId !== item.id;
    setOpenId(opening ? item.id : null);
    if (opening && item.readAt === null) markRead([item.id], true);
  };

  const selectedIds = () => [...selection.selected];

  const deleteSelected = () => {
    const ids = selectedIds();
    if (ids.length === 0) return;
    const n = ids.length;
    Alert.alert(
      n === 1 ? 'Delete 1 entry?' : `Delete ${n} entries?`,
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            exitSelection();
            remove(ids);
          },
        },
      ],
    );
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        {/* Both header states share one slot and cross-fade, like My decks. */}
        <View className="h-11">
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
                    key: 'read',
                    icon: 'eye',
                    label: 'Mark selected as read',
                    onPress: () => {
                      markRead(selectedIds(), true);
                      exitSelection();
                    },
                  },
                  {
                    key: 'unread',
                    icon: 'eye-off',
                    label: 'Mark selected as unread',
                    onPress: () => {
                      markRead(selectedIds(), false);
                      exitSelection();
                    },
                  },
                  {
                    key: 'delete',
                    icon: 'trash-2',
                    label: 'Delete selected feedback',
                    onPress: deleteSelected,
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
              className="absolute inset-0 flex-row items-center gap-3"
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={back}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-elevated active:bg-surface"
              >
                <Icon name="chevron-left" size={18} className="text-ink-secondary" />
              </TouchableOpacity>
              <Text className="flex-1 font-display-bold text-lg text-ink-primary">
                Feedback
              </Text>
              {items.length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select feedback"
                  onPress={() => selection.start()}
                  className="h-11 justify-center px-2"
                >
                  <Text className="font-display text-[15px] text-accent">Select</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </View>

        {items.length > 0 && (
          <>
            <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3">
              <Icon name="search" size={16} className="text-ink-tertiary" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search feedback"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Search feedback"
                className="h-11 flex-1 text-[16px] text-ink-primary placeholder:text-ink-tertiary"
              />
            </View>
            <View className="mt-3 flex-row gap-2">
              {FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  count={counts[f.key]}
                  active={filter === f.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFilter(f.key);
                  }}
                />
              ))}
            </View>
          </>
        )}
      </View>

      {state.kind === 'ready' && shown.length > 0 ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 32,
            gap: 10,
          }}
          showsVerticalScrollIndicator={false}
        >
          {shown.map((f) => (
            <FeedbackRow
              key={f.id}
              item={f}
              open={openId === f.id}
              onToggleOpen={() => toggleOpen(f)}
              onMarkUnread={() => {
                setOpenId(null);
                markRead([f.id], false);
              }}
              onDelete={() => remove([f.id])}
              selecting={selection.active}
              selected={selection.isSelected(f.id)}
              onSelect={() => selection.toggle(f.id)}
              onLongPress={() => selection.start(f.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          {state.kind === 'loading' ? (
            <Text className="text-sm text-ink-tertiary">Loading feedback…</Text>
          ) : state.kind === 'error' ? (
            <>
              <Text className="text-center text-sm text-ink-secondary">
                {"Couldn't load feedback. Check your connection."}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={load}
                className="mt-3 px-4 py-2"
              >
                <Text className="font-display text-sm text-accent">Try again</Text>
              </TouchableOpacity>
            </>
          ) : items.length === 0 ? (
            <Text className="text-center text-sm text-ink-tertiary">
              No feedback yet.
            </Text>
          ) : (
            <>
              <Text className="text-center text-sm text-ink-secondary">
                {query.trim() !== ''
                  ? `No ${filter === 'all' ? '' : `${filter} `}feedback matches “${query.trim()}”.`
                  : filter === 'unread'
                    ? "You're all caught up."
                    : 'Nothing read yet.'}
              </Text>
              {(query.trim() !== '' || filter !== 'all') && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                  className="mt-2 px-3 py-2"
                >
                  <Text className="font-display text-[14px] text-accent">
                    Show all feedback
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

export default FeedbackInbox;
