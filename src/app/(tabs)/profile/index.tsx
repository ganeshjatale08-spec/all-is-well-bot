import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, ExternalLink, LogOut, Shield, Trash2 } from 'lucide-react-native';

import { Screen } from '../../../components/ui/Screen';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useTheme } from '../../../lib/theme';
import { useProfile } from '../../../features/onboarding/hooks/useProfile';
import { useEntitlement } from '../../../features/subscription/hooks/useEntitlement';
import { useRestorePurchases } from '../../../features/subscription/hooks/useSubscription';
import { useDeleteAccount, useExportData, useSignOutAccount } from '../../../features/auth/hooks/useAccount';
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

const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? '';

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

type MenuRowProps = {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  danger?: boolean;
  loading?: boolean;
};

function MenuRow({ label, onPress, icon, danger = false, loading = false }: MenuRowProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        opacity: pressed ? 0.6 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={{ opacity: loading ? 0.4 : 1 }}>{icon}</View>
      <Text
        style={{
          flex: 1,
          fontFamily: 'PlusJakartaSans_400Regular',
          fontSize: 14,
          color: danger ? tokens.danger : tokens.ink,
        }}
      >
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <ChevronRight size={16} color={danger ? tokens.danger : tokens.inkMuted} strokeWidth={2} />
      )}
    </Pressable>
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
      Alert.alert('Purchases restored', 'Your purchases have been restored.');
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

function AccountCard() {
  const { tokens } = useTheme();
  const signOut = useSignOutAccount();
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut.mutateAsync();
          } catch {
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  }

  function handleExportData() {
    Alert.alert(
      'Export my data',
      'This creates a JSON file with all your personal data, which you can save or share.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              await exportData.mutateAsync();
            } catch {
              Alert.alert('Export failed', 'Could not export your data. Please try again.');
            }
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your health logs, reports, and goals will be lost forever.',
              [
                { text: 'Keep my account', style: 'cancel' },
                {
                  text: 'Delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount.mutateAsync();
                    } catch {
                      Alert.alert('Error', 'Could not delete account. Please contact support.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  function handlePrivacyPolicy() {
    if (!PRIVACY_POLICY_URL) {
      Alert.alert('Privacy policy', 'Privacy policy URL is not configured.');
      return;
    }
    Linking.openURL(PRIVACY_POLICY_URL).catch(() =>
      Alert.alert('Error', 'Could not open the privacy policy.'),
    );
  }

  const separator = <View style={{ height: 1, backgroundColor: tokens.hairline }} />;

  return (
    <Card className="gap-0 py-0">
      <MenuRow
        label="Privacy policy"
        onPress={handlePrivacyPolicy}
        icon={<Shield size={16} color={tokens.inkMuted} strokeWidth={2} />}
      />
      {separator}
      <MenuRow
        label="Export my data"
        onPress={handleExportData}
        loading={exportData.isPending}
        icon={<ExternalLink size={16} color={tokens.inkMuted} strokeWidth={2} />}
      />
      {separator}
      <MenuRow
        label="Sign out"
        onPress={handleSignOut}
        loading={signOut.isPending}
        danger
        icon={<LogOut size={16} color={tokens.danger} strokeWidth={2} />}
      />
      {separator}
      <MenuRow
        label="Delete account"
        onPress={handleDeleteAccount}
        loading={deleteAccount.isPending}
        danger
        icon={<Trash2 size={16} color={tokens.danger} strokeWidth={2} />}
      />
    </Card>
  );
}

export default function Profile() {
  const router = useRouter();
  const { tokens } = useTheme();
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
        {/* Header */}
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

        {/* Computed metrics */}
        {hasBasics ? <MetricsSummary profile={profile} /> : null}

        {/* Health profile */}
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

        {/* Reminders */}
        <View className="gap-3">
          <Pressable
            onPress={() => router.push('/(tabs)/profile/reminders')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 4,
              opacity: pressed ? 0.6 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Reminders settings"
          >
            <View className="gap-0.5">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Bell size={16} color={tokens.ink} strokeWidth={2} />
                <Text className="font-body-semibold text-sm text-ink">Reminders</Text>
              </View>
              <Text className="font-body text-xs text-ink-muted">
                Morning, afternoon, night — your schedule.
              </Text>
            </View>
            <ChevronRight size={16} color={tokens.inkMuted} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Subscription */}
        <SubscriptionCard />

        {/* Account & data */}
        <View className="gap-3">
          <Text className="font-body-semibold text-base text-ink">Account &amp; data</Text>
          <AccountCard />
        </View>

        {/* Disclaimer */}
        <View style={{ paddingBottom: 8 }}>
          <Text className="font-body text-xs text-ink-muted" style={{ lineHeight: 18 }}>
            Saathi is a wellness and habit-tracking app, not a medical device and not a substitute
            for professional medical advice. AI-generated content must never replace a doctor&apos;s
            guidance. For any medical concern, please consult a qualified healthcare professional.
          </Text>
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
