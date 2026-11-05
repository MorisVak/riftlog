import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

// Icon colors are props, not classNames — these mirror the tokens
// (tailwind.config.js): accent / ink-secondary.
const ACTIVE = '#8B93D9';
const INACTIVE = '#868FB0';

/** The active pill's glide between tabs: quick, with a slight settle. */
const GLIDE = { damping: 18, stiffness: 220, mass: 0.7 } as const;

/** One tab: its icon pops a little when it becomes the active one. */
const TabButton = ({
  focused,
  label,
  icon,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!focused) return;
    scale.value = withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, GLIDE));
  }, [focused, scale]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-1 items-center justify-center gap-0.5"
    >
      <Animated.View style={iconStyle}>{icon(focused ? ACTIVE : INACTIVE)}</Animated.View>
      <Text
        className={`font-display text-[11px] ${focused ? 'text-accent' : 'text-ink-secondary'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

/**
 * The tab bar: a rounded bar floating just above the bottom edge, like the
 * app's cards, with a soft accent pill behind the active tab that glides to
 * the next one on a tap (a spring), while that tab's icon pops. The screens
 * themselves cross-fade (the navigator's `animation: 'fade'`).
 */
const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const [rowW, setRowW] = useState(0);
  const tabW = rowW / state.routes.length;

  const at = useSharedValue(state.index);
  useEffect(() => {
    at.value = withSpring(state.index, GLIDE);
  }, [state.index, at]);
  const pillStyle = useAnimatedStyle(() => ({
    width: tabW,
    transform: [{ translateX: at.value * tabW }],
  }));

  return (
    <View
      className="bg-background px-4 pt-1.5"
      style={{ paddingBottom: Math.max(insets.bottom - 10, 10) }}
    >
      <View className="h-[62px] rounded-[22px] border border-border bg-surface p-1">
        <View
          className="flex-1 flex-row"
          onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
        >
          {rowW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={pillStyle}
              className="absolute bottom-0 left-0 top-0 rounded-[18px] border border-accent/30 bg-accent/15"
            />
          )}
          {state.routes.map((route, i) => {
            const options = descriptors[route.key]?.options;
            const focused = state.index === i;
            const label = typeof options?.title === 'string' ? options.title : route.name;
            return (
              <TabButton
                key={route.key}
                focused={focused}
                label={label}
                icon={(color) => options?.tabBarIcon?.({ focused, color, size: 22 })}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default TabBar;
