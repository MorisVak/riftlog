import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from '@/components/icon';

type IconName = React.ComponentProps<typeof Icon>['name'];

export type SelectionAction = {
  key: string;
  icon: IconName;
  /** Screen-reader label, e.g. "Delete selected". */
  label: string;
  onPress: () => void;
  /** Red, for destructive actions. */
  destructive?: boolean;
};

/**
 * The header shown while a list is in selection mode: Cancel · "N selected" ·
 * actions. Actions are data, so a later "Move to folder" is one more entry,
 * not a new bar. Every action is disabled until something is selected.
 */
const SelectionBar = ({
  count,
  onCancel,
  actions,
}: {
  count: number;
  onCancel: () => void;
  actions: SelectionAction[];
}) => {
  const disabled = count === 0;

  return (
    <View className="h-11 flex-row items-center justify-between">
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onCancel}
        className="h-11 min-w-[64px] justify-center"
      >
        <Text className="font-display text-[15px] text-accent">Cancel</Text>
      </TouchableOpacity>

      <Text
        accessibilityLiveRegion="polite"
        className="font-display-bold text-[16px] text-ink-primary"
      >
        {count === 0 ? 'Select items' : `${count} selected`}
      </Text>

      <View className="min-w-[64px] flex-row justify-end">
        {actions.map((a) => (
          <TouchableOpacity
            key={a.key}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={a.onPress}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-surface"
          >
            <Icon
              name={a.icon}
              size={21}
              className={
                disabled
                  ? 'text-ink-tertiary'
                  : a.destructive
                    ? 'text-loss-text'
                    : 'text-ink-primary'
              }
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default SelectionBar;
