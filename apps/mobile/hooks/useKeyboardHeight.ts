import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * The on-screen keyboard's height while it's showing, else 0. iOS reports
 * it as the keyboard starts to move (`Will`), Android only once it's up.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, (e) => setHeight(e.endCoordinates.height));
    const b = Keyboard.addListener(hide, () => setHeight(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return height;
}
