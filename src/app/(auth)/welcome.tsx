import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen className="justify-between">
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="font-display text-3xl text-ink">Saathi</Text>
        <Text className="text-center font-body text-base text-ink-muted">
          Your daily health companion — log food, water, sleep, and mood, and get a clear
          score every day.
        </Text>
      </View>
      <View className="gap-3">
        <Button label="Get started" onPress={() => router.push('/(auth)/sign-up')} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    </Screen>
  );
}
