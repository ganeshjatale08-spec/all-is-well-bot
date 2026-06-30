import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../../components/ui/Screen';
import { HealthProfileForm } from '../../../features/onboarding/components/HealthProfileForm';
import { useHealthProfile } from '../../../features/onboarding/hooks/useProfile';

export default function ProfileHealth() {
  const router = useRouter();
  const { data: healthProfile, isLoading } = useHealthProfile();

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">Health background</Text>
          <Text className="font-body text-base text-ink-muted">
            Update any of this whenever you like.
          </Text>
        </View>

        <HealthProfileForm
          initialValues={healthProfile ?? undefined}
          onSaved={() => router.back()}
        />
      </View>
    </Screen>
  );
}
