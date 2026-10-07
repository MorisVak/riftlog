import React from 'react';
import { View } from 'react-native';
import Icon from '@/components/icon';

/**
 * The round checkbox a row shows in selection mode: hollow when not selected,
 * accent-filled with a tick when it is (shape + icon, not color alone).
 */
const SelectCheck = ({ selected }: { selected: boolean }) => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    className={`h-[22px] w-[22px] items-center justify-center rounded-full ${
      selected ? 'bg-accent' : 'border-2 border-ink-tertiary'
    }`}
  >
    {selected && <Icon name="check" size={14} className="text-background" />}
  </View>
);

export default SelectCheck;
