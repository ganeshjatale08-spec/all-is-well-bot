import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../../components/ui/Screen';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useProfile } from '../../../features/onboarding/hooks/useProfile';
import { useEntitlement } from '../../../features/subscription/hooks/useEntitlement';
import { useRestorePurchases } from '../../../features/subscription/hooks/useSubscription';
import {
  calculateBmi,
  calculateBmr,
  calculateDailyTargets,
  calculateTdee,
  categorizeBmi,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '../../../domain/metrics';
import { GOAL_LABELS, GOAL_OPTIONS } from '../../../constants/enums';

const BMI_CATEGORY_LABEL = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
} as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1 rounded-md border border-hairline bg-surface p-4">
      <Text className="font-body-medium text-xs text-ink-muted">{label}</Text>
      <Text className="font-display text-xl text-ink">{value}</Text>
    </View>
  );
}

function SubscriptionCard() {
  const router = useRouter();
  const { data: entitlement, isLoading } = useEntitlement();
  const restore = useRestorePurchases();
  const isPro = entitlement?.isProPlus ?? false;

  async function handleRestore() {
    try {
      await restore.mutateAsync();
      Alert.alert(
        'Purchases restored',
        restore.data && !restore.data // always fires via onSuccess
          ? 'You\'re all set!'
          : 'Your purchases have been restored.',
      );
    } catch {
      Alert.alert('Restore failed', 'Could not restore purchases. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <Card className="items-center py-4">
        <ActivityIndicator />
      </Card>
    );
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-semibold text-sm text-ink">Subscription</Text>
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: isPro ? '#12A06A' : undefined }}
        >
          <Text
            className={`font-body-semibold text-xs ${isPro ? 'text-surface' : 'text-ink-muted'}`}
          >
            {isPro ? 'Pro' : 'Free'}
          </Text>
        </View>
      </View>
      {isPro ? (
        <Text className="font-body text-sm text-ink-muted">
          You have access to all AI features. Manage your subscription in your device&apos;s account settings.
        </Text>
      ) : (
        <>
          <Text className="font-body text-sm text-ink-muted">
            Upgrade to Pro for AI daily insights, weekly &amp; monthly reports, and personalised goals.
          </Text>
          <Button
            label="Upgrade to Pro"
            onPress={() => router.push('/paywall')}
            size="md"
          />
        </>
      )}
      <Button
        label={restore.isPending ? 'Restoring…' : 'Restore purchases'}
        onPress={handleRestore}
        loading={restore.isPending}
        variant="ghost"
        size="md"
      />
    </Card>
  );
}

export default function Profile() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  const hasBasics =
    profile &&
    profile.age != null &&
    profile.sex != null &&
    profile.height_cm != null &&
    profile.weight_kg != null &&
    profile.activity_level != null &&
    profile.primary_goal != null;

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">
            {profile?.full_name ?? 'Profile'}
          </Text>
          {profile?.primary_goal ? (
            <Text className="font-body text-base text-ink-muted">
              Goal: {GOAL_LABELS[profile.primary_goal as (typeof GOAL_OPTIONS)[number]]}
            </Text>
          ) : null}
        </View>

        {hasBasics ? <MetricsSummary profile={profile} /> : null}

        <SubscriptionCard />

        <View className="gap-3">
          <Text className="font-body-semibold text-base text-ink">Health profile</Text>
          <Text className="font-body text-sm text-ink-muted">
            Conditions, allergies, and other background you can add any time.
          </Text>
          <Button
            label="Complete health profile"
            variant="secondary"
            onPress={() => router.push('/(tabs)/profile/health')}
          />
        </View>
      </View>
    </Screen>
  );
}

function MetricsSummary({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>['data']>;
}) {
  const sex = profile.sex as Sex;
  const activityLevel = profile.activity_level as ActivityLevel;
  const goal = profile.primary_goal as Goal;
  const age = profile.age as number;
  const heightCm = profile.height_cm as number;
  const weightKg = profile.weight_kg as number;

  const bmi = calculateBmi(weightKg, heightCm);
  const bmiCategory = categorizeBmi(bmi);
  const bmr = calculateBmr(sex, weightKg, heightCm, age);
  const tdee = calculateTdee(bmr, activityLevel);
  const targets = calculateDailyTargets({ sex, weightKg, heightCm, age, activityLevel, goal });

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Stat label="BMI" value={`${bmi.toFixed(1)} · ${BMI_CATEGORY_LABEL[bmiCategory]}`} />
        <Stat label="TDEE" value={`${tdee.toFixed(0)} kcal`} />
      </View>
      <View className="flex-row gap-3">
        <Stat label="Calorie target" value={`${targets.calorieTargetKcal.toFixed(0)} kcal`} />
        <Stat label="Protein target" value={`${targets.proteinTargetG.toFixed(0)} g`} />
      </View>
    </View>
  );
}
