import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { HealthProfileForm } from '../../features/onboarding/components/HealthProfileForm';

// Step 3 — Health (APP_FLOW.md §3.6): optional/skippable; "Skip for now" is
// prominent and the same fields can be completed later from Profile.
export default function Step3Health() {
  const router = useRouter();
  const goToConsent = () => router.push('/(onboarding)/consent');

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">Health background</Text>
          <Text className="font-body text-base text-ink-muted">
            Optional, and you can always fill this in later from Profile.
          </Text>
        </View>

        <HealthProfileForm onSaved={goToConsent} />

        <Button label="Skip for now" variant="ghost" onPress={goToConsent} />
      </View>
    </Screen>
  );
}
