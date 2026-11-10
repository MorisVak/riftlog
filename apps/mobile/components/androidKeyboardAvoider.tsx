import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

/**
 * Keeps a screen's fields above the keyboard on Android.
 *
 * iOS screens handle it themselves (`automaticallyAdjustKeyboardInsets` on a
 * ScrollView). Android has no such prop, and since SDK 54 the app draws
 * edge to edge, so the window no longer shrinks for the keyboard either: a
 * note at the bottom of a screen was typed behind it. Wrapped in this, the
 * screen shrinks by the keyboard's height on Android, and Android's
 * ScrollView then scrolls the focused field back into view by itself.
 * Off on iOS, where it would add a second, conflicting adjustment.
 */
const AndroidKeyboardAvoider = ({ children }: { children: React.ReactNode }) => (
  <KeyboardAvoidingView
    behavior="padding"
    enabled={Platform.OS === 'android'}
    style={{ flex: 1 }}
  >
    {children}
  </KeyboardAvoidingView>
);

export default AndroidKeyboardAvoider;
