import { View } from 'react-native';
import TrackingField from './trackingField';
import React from 'react';

const PlayField = () => {
  return (
    <View className="flex-1">
      <TrackingField className="rotate-180" playerId="p2" />
      <TrackingField playerId="p1" />
    </View>
  );
};

export default PlayField;
