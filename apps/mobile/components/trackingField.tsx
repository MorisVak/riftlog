import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import ScoringComponent from './scoringComponent';

type TrackingFieldProps = {
  playerLabel: string;
  className: string;
};

const TrackingField = ({ playerLabel, className }: TrackingFieldProps) => {
  return (
    <View className={`flex-1 items-center justify-center ${className}`}>
      <Text className="text-white mb-20">{playerLabel}</Text>
      <ScoringComponent playerName={playerLabel} />
    </View>
  );
};

export default TrackingField;
