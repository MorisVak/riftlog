import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  DISPLAY_NAME_MAX,
  HANDLE_MAX,
  HANDLE_RULE_TEXT,
  handleSuggestionSource,
  handleVariants,
  isValidHandleFormat,
  slugifyHandle,
} from '@riftlog/core';
import { useAuth } from '@/contexts/authContext';
import { useProfile } from '@/contexts/profileContext';
import {
  checkHandle,
  completeOnboarding,
  type HandleAvailability,
  type OnboardingResult,
} from '@/lib/profile';
import Avatar from '@/components/avatar';
import Icon from '@/components/icon';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

/**
 * First-login onboarding: pick a display name and claim an @handle.
 *
 * Reachable only while `needsOnboarding` holds (Stack.Protected in
 * app/_layout.tsx). Nothing here is persisted on-device: the one write is
 * `complete_onboarding`, which claims the handle, sets the name, and stamps
 * `onboarded_at` in a single transaction. Kill the app anywhere before that
 * and the next launch lands back here with nothing half-done; after it,
 * `refresh()` re-reads the row and the guard swaps this screen out.
 *
 * Step list: identity is the only step. An optional, skippable deck-import
 * step belongs AFTER it — once `onboarded_at` is set, so it can never block
 * the gate — when deck import (SPEC Feature 4) exists. There is no deck
 * feature yet, so there is deliberately no second step.
 */

type HandleStatus = 'empty' | 'checking' | 'error' | HandleAvailability;

const CHECK_DEBOUNCE_MS = 300;
/** Variant chips offered when a handle is taken. */
const MAX_VARIANTS = 3;
/** What the seed trigger assigns — never worth prefilling as a "choice". */
const SEEDED_HANDLE = /^player_[0-9a-f]{8}$/;

/**
 * Banner copy for results that aren't about the handle. Handle results
 * (taken / reserved / invalid_format) render inline under the field instead.
 */
const RESULT_COPY: Record<
  Exclude<OnboardingResult, 'ok' | 'taken' | 'reserved' | 'invalid_format'>,
  string
> = {
  invalid_display_name: `Display name must be 1–${DISPLAY_NAME_MAX} characters.`,
  rate_limited: 'Handles can be changed once every 30 days.',
  no_profile: 'Your profile is still being set up. Try again in a moment.',
};

const Onboarding = () => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { profile, refresh } = useProfile();

  // Prefill once, on mount. A handle the user already claimed wins; otherwise
  // a slug of the provider name; otherwise empty. Never the email.
  const [initial] = useState(() => {
    const own =
      profile && !SEEDED_HANDLE.test(profile.username) ? profile.username : null;
    const source = handleSuggestionSource(user?.user_metadata);
    return {
      handle: own ?? (source ? slugifyHandle(source) : null) ?? '',
      hadSuggestion: own !== null || source !== null,
      displayName: profile?.displayName ?? '',
    };
  });

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [handle, setHandle] = useState(initial.handle);
  const [status, setStatus] = useState<HandleStatus>(
    initial.handle ? 'checking' : 'empty',
  );
  const [variants, setVariants] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Only the newest check may write state, so a slow answer for "mauri" can't
  // overwrite the answer for "maurice".
  const checkId = useRef(0);
  // Answers already fetched this session. Advisory, like every check here —
  // `complete_onboarding` re-validates and is the only thing that decides.
  const cache = useRef(new Map<string, HandleAvailability>());

  const lookup = useCallback(async (h: string) => {
    const hit = cache.current.get(h);
    if (hit) return hit;
    const answer = await checkHandle(h);
    cache.current.set(h, answer);
    return answer;
  }, []);

  const offerVariants = useCallback(
    async (base: string, id: number) => {
      const candidates = handleVariants(base);
      const answers = await Promise.all(
        candidates.map((c) => lookup(c).catch(() => null)),
      );
      if (id !== checkId.current) return;
      setVariants(
        candidates
          .filter((_, i) => answers[i] === 'available')
          .slice(0, MAX_VARIANTS),
      );
    },
    [lookup],
  );

  // Live availability: format locally (no round trip for obvious misses),
  // then a debounced server check.
  useEffect(() => {
    const id = ++checkId.current;
    setVariants([]);
    setSubmitError(null);

    if (handle === '') {
      setStatus('empty');
      return;
    }
    if (!isValidHandleFormat(handle)) {
      setStatus('invalid_format');
      return;
    }

    const settle = (answer: HandleAvailability) => {
      if (id !== checkId.current) return;
      setStatus(answer);
      if (answer === 'taken') void offerVariants(handle, id);
    };

    const cached = cache.current.get(handle);
    if (cached) {
      settle(cached);
      return;
    }

    setStatus('checking');
    const timer = setTimeout(() => {
      lookup(handle)
        .then(settle)
        .catch(() => {
          if (id === checkId.current) setStatus('error');
        });
    }, CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [handle, lookup, offerVariants]);

  const trimmedName = displayName.trim();
  const nameValid =
    trimmedName.length >= 1 && trimmedName.length <= DISPLAY_NAME_MAX;
  // `error` = the check couldn't reach the server; let the claim itself try.
  const handleSubmittable = status === 'available' || status === 'error';
  const canContinue = nameValid && handleSubmittable && !submitting;

  const onContinue = async () => {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await completeOnboarding(handle, trimmedName);
      if (result === 'ok') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Re-reading the row flips `needsOnboarding` and the guard replaces
        // this screen. If the read fails, Continue stays live: calling
        // complete_onboarding again is a no-op that returns `ok`.
        await refresh();
        return;
      }
      if (
        result === 'taken' ||
        result === 'reserved' ||
        result === 'invalid_format'
      ) {
        // Lost a race (or the server knows better). Show it inline where
        // the handle is, with variants, rather than as a banner.
        cache.current.set(handle, result);
        setStatus(result);
        if (result === 'taken') void offerVariants(handle, checkId.current);
        return;
      }
      setSubmitError(RESULT_COPY[result]);
    } catch {
      setSubmitError(
        "Couldn't reach Riftlog. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const avatarIntro = useSharedValue(0);
  const nameIntro = useSharedValue(0);
  const handleIntro = useSharedValue(0);
  const ctaIntro = useSharedValue(0);
  const avatarStyle = useRise(avatarIntro);
  const nameStyle = useRise(nameIntro);
  const handleStyle = useRise(handleIntro);
  const ctaStyle = useRise(ctaIntro);
  useEffect(() => {
    playIntro([avatarIntro, nameIntro, handleIntro, ctaIntro]);
  }, [avatarIntro, nameIntro, handleIntro, ctaIntro]);

  const handleBorder =
    status === 'available'
      ? 'border-accent'
      : status === 'taken' ||
          status === 'reserved' ||
          status === 'invalid_format'
        ? 'border-loss'
        : 'border-border';

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={avatarStyle} className="items-center">
            <Avatar size={88} />
            <Text className="mt-6 text-center font-display-bold text-[28px] tracking-tight text-ink-primary">
              Set up your profile
            </Text>
            <Text className="mb-8 mt-2 text-center text-[15px] leading-5 text-ink-secondary">
              This is how other players will see you.
            </Text>
          </Animated.View>

          <Animated.View style={nameStyle}>
            <Text className="mb-2 font-display text-xs uppercase tracking-wider text-ink-secondary">
              Display name
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderClassName="text-ink-tertiary"
              maxLength={DISPLAY_NAME_MAX}
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="Display name"
              className="rounded-xl border border-border bg-elevated px-4 py-3 text-base text-ink-primary"
            />
            <Text className="mb-6 mt-1.5 px-1 text-[12px] text-ink-tertiary">
              {nameValid || displayName === ''
                ? "Doesn't need to be unique."
                : `1–${DISPLAY_NAME_MAX} characters.`}
            </Text>
          </Animated.View>

          <Animated.View style={handleStyle}>
            <Text className="mb-2 font-display text-xs uppercase tracking-wider text-ink-secondary">
              Handle
            </Text>
            <View
              className={`flex-row items-center rounded-xl border bg-elevated px-4 ${handleBorder}`}
            >
              <Text className="font-mono-medium text-base text-ink-secondary">
                @
              </Text>
              <TextInput
                value={handle}
                // Handles are stored lowercase; type-as-you-go lowercasing
                // means the field never shows something that can't be saved.
                onChangeText={(t) =>
                  setHandle(t.toLowerCase().replace(/\s+/g, '_'))
                }
                placeholder="your_handle"
                placeholderClassName="text-ink-tertiary"
                maxLength={HANDLE_MAX}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                returnKeyType="done"
                onSubmitEditing={() => void onContinue()}
                accessibilityLabel="Handle"
                className="flex-1 py-3 pl-0.5 font-mono-medium text-base text-ink-primary"
              />
            </View>

            <HandleStatusLine
              status={status}
              handle={handle}
              hadSuggestion={initial.hadSuggestion}
            />

            {variants.length > 0 && (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {variants.map((v) => (
                  <TouchableOpacity
                    key={v}
                    accessibilityRole="button"
                    accessibilityLabel={`Use @${v}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setHandle(v);
                    }}
                    className="rounded-full border border-border bg-surface px-3.5 py-2 active:bg-elevated"
                  >
                    <Text className="font-mono-medium text-[13px] text-accent">
                      @{v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>

          <View className="min-h-8 flex-1" />

          <Animated.View style={ctaStyle}>
            {submitError !== null && (
              <Text className="mb-3 text-center text-sm text-loss-text">
                {submitError}
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !canContinue, busy: submitting }}
              disabled={!canContinue}
              onPress={() => void onContinue()}
              className={`items-center rounded-full px-5 py-4 ${
                canContinue
                  ? 'bg-accent shadow-accent-btn active:bg-accent-strong'
                  : 'bg-surface'
              }`}
            >
              <Text
                className={`font-display-bold text-base ${
                  canContinue ? 'text-background' : 'text-ink-tertiary'
                }`}
              >
                {submitting ? 'Saving…' : 'Continue'}
              </Text>
            </TouchableOpacity>

            {/* The only way out that isn't finishing — nobody gets trapped. */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void signOut()}
              className="mt-2 px-5 py-3"
            >
              <Text className="text-center text-sm text-ink-secondary">
                Sign out
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

/**
 * One line under the handle field. Every state pairs an icon with text, so
 * none of them is conveyed by color alone.
 */
const HandleStatusLine = ({
  status,
  handle,
  hadSuggestion,
}: {
  status: HandleStatus;
  handle: string;
  hadSuggestion: boolean;
}) => {
  let icon: React.ComponentProps<typeof Icon>['name'];
  let tone: string;
  let text: string;

  switch (status) {
    case 'empty':
      icon = 'at-sign';
      tone = 'text-ink-tertiary';
      text = hadSuggestion
        ? HANDLE_RULE_TEXT
        : `Pick a handle other players can find you by. ${HANDLE_RULE_TEXT}`;
      break;
    case 'checking':
      icon = 'loader';
      tone = 'text-ink-tertiary';
      text = 'Checking…';
      break;
    case 'available':
      icon = 'check-circle';
      tone = 'text-accent';
      text = `@${handle} is available.`;
      break;
    case 'taken':
      icon = 'x-circle';
      tone = 'text-loss-text';
      text = `@${handle} is taken.`;
      break;
    case 'reserved':
      icon = 'x-circle';
      tone = 'text-loss-text';
      text = `@${handle} is reserved. Pick something else.`;
      break;
    case 'invalid_format':
      icon = 'alert-circle';
      tone = 'text-loss-text';
      text = HANDLE_RULE_TEXT;
      break;
    case 'error':
      icon = 'wifi-off';
      tone = 'text-ink-secondary';
      text = "Couldn't check right now. You can still try to continue.";
      break;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      className="mt-1.5 flex-row items-start gap-1.5 px-1"
    >
      <Icon name={icon} size={13} className={`mt-px ${tone}`} />
      <Text className={`flex-1 text-[12px] leading-4 ${tone}`}>{text}</Text>
    </View>
  );
};

export default Onboarding;
