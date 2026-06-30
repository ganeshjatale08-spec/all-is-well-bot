import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { useProfile } from '../../features/onboarding/hooks/useProfile';
import {
  calculateBmi,
  calculateBmr,
  calculateDailyTargets,
  calculateIdealWeightRange,
  calculateTdee,
  categorizeBmi,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '../../domain/metrics';

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

export default function Result() {
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

  if (!hasBasics) {
    router.replace('/(onboarding)/step-1-basics');
    return null;
  }

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
  const idealWeight = calculateIdealWeightRange(heightCm);
  const targets = calculateDailyTargets({
    sex,
    weightKg,
    heightCm,
    age,
    activityLevel,
    goal,
  });

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">Your numbers</Text>
          <Text className="font-body text-base text-ink-muted">
            Computed from what you just told us — this is your starting point.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Stat label="BMI" value={`${bmi.toFixed(1)} · ${BMI_CATEGORY_LABEL[bmiCategory]}`} />
          <Stat label="Ideal weight" value={`${idealWeight.minKg.toFixed(0)}–${idealWeight.maxKg.toFixed(0)} kg`} />
        </View>

        <View className="flex-row gap-3">
          <Stat label="BMR" value={`${bmr.toFixed(0)} kcal`} />
          <Stat label="TDEE" value={`${tdee.toFixed(0)} kcal`} />
        </View>

        <View className="gap-3">
          <Text className="font-body-semibold text-base text-ink">Daily targets</Text>
          <View className="flex-row gap-3">
            <Stat label="Calories" value={`${targets.calorieTargetKcal.toFixed(0)} kcal`} />
            <Stat label="Protein" value={`${targets.proteinTargetG.toFixed(0)} g`} />
          </View>
          <View className="flex-row gap-3">
            <Stat label="Water" value={`${targets.waterTargetL.toFixed(1)} L`} />
            <Stat label="Sleep" value={`${targets.sleepTargetHours} h`} />
          </View>
        </View>

        <Button label="Continue" onPress={() => router.push('/(onboarding)/step-2-lifestyle')} />
      </View>
    </Screen>
  );
}
