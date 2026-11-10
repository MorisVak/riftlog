import { useEffect } from 'react';
import { Keyboard, Platform, TextInput } from 'react-native';

/**
 * Android: closing the keyboard ends editing, as it does on iOS.
 *
 * On iOS a dismissed keyboard blurs the field. On Android the back button
 * (or the keyboard's own hide key) only hides the keyboard — the field stays
 * focused, so anything that saves on blur (match notes, `InlineNote`) didn't
 * save, and leaving the screen could lose the text. Mounted once, at the root.
 */
export function useEndEditingOnKeyboardHide() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      TextInput.State.currentlyFocusedInput()?.blur();
    });
    return () => sub.remove();
  }, []);
}
