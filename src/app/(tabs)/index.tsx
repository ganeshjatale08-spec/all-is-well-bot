import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Stat } from '../../components/ui/Stat';
import { StreakFlame } from '../../components/ui/StreakFlame';
import { TodayRing, type RingArc } from '../../components/ui/TodayRing';
import { deterministicHeadline } from '../../domain/coachLine';
import {
  calculateDailyTargets,
  type ActivityLevel,
  type DailyTargets,
  type Goal,
  type Sex,
} from '../../domain/metrics';
import { calculateDailyScoreBreakdown } from '../../domain/scoring';
import { AiInsightCard } from '../../features/ai/components/AiInsightCard';
import { useStreaksAndBadges } from '../../features/gamification/hooks/useStreaks';
import { useProfile } from '../../features/onboarding/hooks/useProfile';
import { useTodayStatus } from '../../features/journal/hooks/useDailyLog';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: todayStatus, isLoading: statusLoading } = useTodayStatus();

  const hasBasics =
    !!profile?.sex &&
    !!profile.weight_kg &&
    !!profile.height_cm &&
    !!profile.age &&
    !!profile.activity_level &&
    !!profile.primary_goal;

  // Computed (when possible) before any early return so useStreaksAndBadges
  // below is always called in the same order, per rules of hooks.
  const targets: DailyTargets | null = hasBasics
    ? calculateDailyTargets({
        sex: profile!.sex as Sex,
        weightKg: profile!.weight_kg!,
        heightCm: profile!.height_cm!,
        age: profile!.age!,
        activityLevel: profile!.activity_level as ActivityLevel,
        goal: profile!.primary_goal as Goal,
      })
    : null;

  const { data: streaks } = useStreaksAndBadges({
    waterActualL: todayStatus?.dailyLog?.water_l ?? 0,
    waterTargetL: targets?.waterTargetL ?? 0,
    proteinActualG: todayStatus?.macros.proteinG ?? 0,
    proteinTargetG: targets?.proteinTargetG ?? 0,
  });

  if (profileLoading || statusLoading || !profile || !todayStatus) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!hasBasics || !targets) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-center font-body text-base text-ink-muted">
            Finish your profile to see today&apos;s score.
          </Text>
        </View>
      </Screen>
    );
  }

  const { dailyLog, macros, workoutMinutes, symptomSeverities } = todayStatus;
  const hasLoggedToday = dailyLog !== null;

  const breakdown = calculateDailyScoreBreakdown({
    actualCalorieKcal: macros.kcal,
    calorieTargetKcal: targets.calorieTargetKcal,
    actualProteinG: macros.proteinG,
    proteinTargetG: targets.proteinTargetG,
    actualWaterL: dailyLog?.water_l ?? 0,
    waterTargetL: targets.waterTargetL,
    actualSleepHours: dailyLog?.sleep_hours ?? 0,
    sleepTargetHours: targets.sleepTargetHours,
    steps: dailyLog?.steps ?? 0,
    workoutMinutes,
    symptomSeverities,
  });

  const coachLine = deterministicHeadline(breakdown.total, hasLoggedToday);
  const waterActual = dailyLog?.water_l ?? 0;
  const caloriesLeft = Math.max(0, Math.round(targets.calorieTargetKcal - macros.kcal));

  const arcs: RingArc[] = [
    {
      key: 'caloriesProtein',
      progress: (breakdown.calorieScore * 25 + breakdown.proteinScore * 20) / 45 / 100,
      label: `Calories and protein, ${Math.round(macros.kcal)} of ${Math.round(targets.calorieTargetKcal)} kilocalories`,
      onPress: () => router.push('/log/food'),
    },
    {
      key: 'movement',
      progress: breakdown.activityScore / 100,
      label: `Movement, ${dailyLog?.steps ?? 0} steps`,
      onPress: () => router.push('/log/workout'),
    },
    {
      key: 'water',
      progress: breakdown.waterScore / 100,
      label: `Water, ${waterActual} of ${targets.waterTargetL.toFixed(1)} litres`,
      onPress: () => router.push('/log/water'),
    },
    {
      key: 'sleep',
      progress: breakdown.sleepScore / 100,
      label: `Sleep, ${dailyLog?.sleep_hours ?? 0} of ${targets.sleepTargetHours} hours`,
      onPress: () => router.push('/log/sleep'),
    },
  ];

  const accessibilitySummary = `Today: ${breakdown.total} of 100. Water ${waterActual} of ${targets.waterTargetL.toFixed(1)} litres.`;
  const firstName = profile.full_name?.trim().split(/\s+/)[0];

  return (
    <Screen scroll>
      <View className="gap-8">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-xl text-ink">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </Text>
          <StreakFlame count={streaks?.checkinCurrent ?? 0} />
        </View>

        <View className="items-center">
          <TodayRing
            score={breakdown.total}
            coachLine={coachLine}
            arcs={arcs}
            accessibilitySummary={accessibilitySummary}
            onPressRing={() => router.push('/(tabs)/journal')}
          />
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-4">
          <Stat value={caloriesLeft} unit="kcal" label="Calories left" />
          <Stat value={Math.round(macros.proteinG)} unit="g" label="Protein" />
          <Stat value={waterActual.toFixed(1)} unit="L" label="Water" />
          <Stat value={dailyLog?.steps ?? 0} label="Steps" />
        </View>

        {/* First-log prompt (APP_FLOW §9: "Start with a glass of water → quick log") */}
        {!hasLoggedToday ? (
          <View
            className="rounded-xl border border-hairline bg-surface px-4 py-5"
            accessibilityRole="text"
          >
            <Text className="font-body-semibold text-base text-ink">No logs yet today</Text>
            <Text className="mt-1 font-body text-sm text-ink-muted">
              Start with a glass of water — every entry fills the ring.
            </Text>
          </View>
        ) : null}

        <AiInsightCard />
      </View>
    </Screen>
  );
}
