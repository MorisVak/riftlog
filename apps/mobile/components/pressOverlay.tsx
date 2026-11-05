import React from "react";
import { View } from "react-native";

/**
 * Press feedback over a whole card, art included: a dark layer while pressed.
 * For cards whose background is covered (a legend backdrop), so a background
 * change wouldn't show, and for swipe rows, which must stay opaque (opacity
 * would show the red delete action behind). Put it last, inside the
 * Pressable, which needs `relative overflow-hidden`.
 */
const PressOverlay = ({ pressed }: { pressed: boolean }) =>
  pressed ? (
    <View pointerEvents="none" className="absolute inset-0 bg-background/40" />
  ) : null;

export default PressOverlay;
