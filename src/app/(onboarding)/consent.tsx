import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { useCompleteOnboarding } from '../../features/onboarding/hooks/useProfile';

export default function Consent() {
  const router = useRouter();
  const completeOnboarding = useCompleteOnboarding();
  const [accepted, setAccepted] = useState(false);

  const onContinue = () => {
    if (!accepted) return;
    completeOnboarding.mutate(
      { consentDpdp: true },
      { onSuccess: () => router.replace('/(tabs)') },
    );
  };

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">Before you start</Text>
          <Text className="font-body text-base text-ink-muted">
            Please read this — it only takes a moment.
          </Text>
        </View>

        <View className="gap-3 rounded-md border border-hairline bg-surface p-4">
          <Text className="font-body text-sm text-ink">
            Saathi is not a medical device. It does not diagnose conditions or prescribe
            treatment. The numbers and suggestions you see are general wellness guidance, not
            medical advice — always consult a qualified doctor for health concerns.
          </Text>
          <Text className="font-body text-sm text-ink">
            Under India&apos;s DPDP Act, 2023, we only collect the health data you choose to
            share, use it to run your account, store it securely, and let you export or delete it
            at any time from Profile.
          </Text>
        </View>

        <Pressable
          onPress={() => setAccepted((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="I have read and accept the disclaimer and data consent"
          className="flex-row items-center gap-3"
        >
          <View
            className={`h-6 w-6 items-center justify-center rounded border ${
              accepted ? 'border-primary bg-primary' : 'border-hairline bg-surface'
            }`}
          >
            {accepted ? <Text className="font-body-semibold text-xs text-surface">✓</Text> : null}
          </View>
          <Text className="flex-1 font-body text-sm text-ink">
            I have read and accept the disclaimer and how my data is used.
          </Text>
        </Pressable>

        {completeOnboarding.isError ? (
          <Text className="font-body-medium text-sm text-danger">
            {completeOnboarding.error instanceof Error
              ? completeOnboarding.error.message
              : 'Couldn’t save your consent.'}
          </Text>
        ) : null}

        <Button
          label="Continue to Saathi"
          onPress={onContinue}
          disabled={!accepted}
          loading={completeOnboarding.isPending}
        />
      </View>
    </Screen>
  );
}
