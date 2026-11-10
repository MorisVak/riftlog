import { Platform, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Padding for the body of a `presentationStyle="pageSheet"` Modal.
 *
 * On iOS a page sheet sits below the status bar with rounded top corners, so
 * it needs nothing. Android has no page sheets: the Modal is full screen and,
 * edge to edge (SDK 54), runs under the status bar and the navigation bar —
 * a sheet's header ("Cancel", the title) landed on top of the clock. There,
 * the body is padded by the system bars instead.
 */
export function usePageSheetInsets(): ViewStyle {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android') return {};
  return { paddingTop: insets.top, paddingBottom: insets.bottom };
}
