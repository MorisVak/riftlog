/**
 * Build-time feature flags.
 *
 * CARD_ART — card images. On in development and in builds from the
 * `preview` and `testflight` EAS profiles (`EXPO_PUBLIC_CARD_ART=1`); off in
 * `production`. TestFlight and the App Store ship the same binary, so a
 * `testflight` build must never be submitted for App Store review — the
 * "Card art preview" label on Profile (CARD_ART_PREVIEW) makes such a build
 * recognizable.
 */
export const CARD_ART = __DEV__ || process.env.EXPO_PUBLIC_CARD_ART === '1';

/** A non-dev build with card art on: shows the "Card art preview" label. */
export const CARD_ART_PREVIEW = CARD_ART && !__DEV__;
