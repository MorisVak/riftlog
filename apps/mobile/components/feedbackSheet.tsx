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
import {
  FEEDBACK_BODY_MAX,
  FEEDBACK_HEADLINE_MAX,
  submitFeedback,
} from '@/lib/feedback';

/** Show the body counter once you're this close to the limit. */
const COUNTER_FROM = FEEDBACK_BODY_MAX - 200;

const ERRORS = {
  rate_limited:
    "You've sent a lot of feedback in a short time. Please try again later.",
  invalid_headline: 'Add a headline.',
  invalid_body: 'Write a few words of feedback.',
  network: "Couldn't send. Check your connection and try again.",
} as const;

/**
 * "Send feedback": a headline and a text, sent anonymously. Laid out like the
 * note editor — a native sheet, Cancel / title / Send. Nothing is sent until
 * Send; Cancel throws the draft away.
 */
const FeedbackSheet = ({
  visible,
  onClose,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called after the server accepted it (the sheet closes itself). */
  onSent: () => void;
}) => {
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each open starts from a blank form.
  useEffect(() => {
    if (visible) {
      setHeadline('');
      setBody('');
      setError(null);
      setSending(false);
    }
  }, [visible]);

  const canSend = headline.trim() !== '' && body.trim() !== '';

  const send = async () => {
    if (sending) return;
    if (!canSend) {
      setError(headline.trim() === '' ? ERRORS.invalid_headline : ERRORS.invalid_body);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await submitFeedback(headline, body);
      if (result !== 'ok') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setError(ERRORS[result]);
        setSending(false);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSent();
      onClose();
    } catch (e) {
      if (__DEV__) console.warn('[feedback] send failed:', e);
      setError(ERRORS.network);
      setSending(false);
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
              Send feedback
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ busy: sending, disabled: !canSend }}
              onPress={() => void send()}
              className="h-11 min-w-[72px] items-end justify-center"
            >
              <Text
                className={`font-display-bold text-[16px] ${
                  canSend ? 'text-accent' : 'text-ink-tertiary'
                }`}
              >
                {sending ? 'Sending…' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="px-5 pt-3 text-[13px] leading-[18px] text-ink-tertiary">
            Anonymous — your name and account aren&apos;t attached to it.
          </Text>

          <TextInput
            value={headline}
            onChangeText={(t) => {
              setHeadline(t);
              setError(null);
            }}
            placeholder="Headline"
            autoFocus
            maxLength={FEEDBACK_HEADLINE_MAX}
            returnKeyType="next"
            accessibilityLabel="Feedback headline"
            className="mx-5 mt-3 border-b border-border pb-3 font-display-bold text-[19px] text-ink-primary placeholder:text-ink-tertiary"
          />

          <TextInput
            value={body}
            onChangeText={(t) => {
              setBody(t);
              setError(null);
            }}
            placeholder="What do you like? What's missing or broken?"
            multiline
            maxLength={FEEDBACK_BODY_MAX}
            textAlignVertical="top"
            accessibilityLabel="Feedback"
            className="flex-1 px-5 pt-3 text-[17px] leading-6 text-ink-primary placeholder:text-ink-tertiary"
          />

          <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
            <Text className="flex-1 text-[13px] text-loss-text">
              {error ?? ''}
            </Text>
            {body.length >= COUNTER_FROM && (
              <Text className="font-mono-medium text-[12px] text-ink-tertiary">
                {body.length}/{FEEDBACK_BODY_MAX}
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default FeedbackSheet;
