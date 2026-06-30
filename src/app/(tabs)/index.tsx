import { Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { useSignOut } from '../../features/auth/hooks/useAuth';

export default function Home() {
  const signOut = useSignOut();

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        <Text className="font-display text-xl text-ink">Saathi</Text>
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
