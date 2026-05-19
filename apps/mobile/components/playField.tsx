import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import TrackingField from './trackingField';

const PlayField = () => {
  return (
    <View className="flex-1">
      <TrackingField className="rotate-180" playerLabel="Player 2" />
      <TrackingField className="" playerLabel="Player 1" />
    </View>
  );
};

export default PlayField;
