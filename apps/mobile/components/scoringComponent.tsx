import { Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';

type ScoringComponentProps = {
  playerName: string;
};

const ScoringComponent = ({ playerName }: ScoringComponentProps) => {
  const {
    p1Score,
    p2Score,
    setP1Score,
    setP2Score,
    incrementScore,
    decrementScore,
  } = useMatch();

  const isP1 = playerName === 'Player 1';
  const score = isP1 ? p1Score : p2Score;
  const setter = isP1 ? setP1Score : setP2Score;

  return (
    <View className="flex-row items-center gap-6">
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          decrementScore(setter);
        }}
        className="h-16 w-16 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
      >
        <Text className="text-white text-4xl font-semibold">−</Text>
      </TouchableOpacity>

      <Text className="text-white text-8xl font-bold tabular-nums">
        {score}
      </Text>

      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          incrementScore(setter);
        }}
        className="h-16 w-16 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
      >
        <Text className="text-white text-4xl font-semibold">+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ScoringComponent;
