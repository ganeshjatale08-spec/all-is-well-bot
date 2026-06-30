import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { useSignOut } from '../../features/auth/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const signOut = useSignOut();

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        <Text className="font-display text-xl text-ink">Saathi</Text>
        <Button label="Profile" variant="secondary" onPress={() => router.push('/(tabs)/profile')} />
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => signOut.mutate()}
          loading={signOut.isPending}
        />
      </View>
    </Screen>
  );
}
