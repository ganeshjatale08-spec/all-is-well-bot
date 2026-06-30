import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OptionPicker } from '../../components/ui/OptionPicker';
import { profileBasicsSchema, type ProfileBasicsInput } from '../../schemas/profile';
import { useUpsertProfile } from '../../features/onboarding/hooks/useProfile';
import {
  ACTIVITY_LABELS,
  ACTIVITY_OPTIONS,
  GOAL_LABELS,
  GOAL_OPTIONS,
  SEX_LABELS,
  SEX_OPTIONS,
} from '../../constants/enums';

const sexOptions = SEX_OPTIONS.map((value) => ({ value, label: SEX_LABELS[value] }));
const goalOptions = GOAL_OPTIONS.map((value) => ({ value, label: GOAL_LABELS[value] }));
const activityOptions = ACTIVITY_OPTIONS.map((value) => ({
  value,
  label: ACTIVITY_LABELS[value],
}));

export default function Step1Basics() {
  const router = useRouter();
  const upsertProfile = useUpsertProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileBasicsInput>({
    resolver: zodResolver(profileBasicsSchema),
    defaultValues: {
      full_name: '',
      age: undefined,
      sex: undefined,
      height_cm: undefined,
      weight_kg: undefined,
      primary_goal: undefined,
      activity_level: undefined,
    },
  });

  const onSubmit = handleSubmit((values) => {
    upsertProfile.mutate(values, {
      onSuccess: () => router.push('/(onboarding)/result'),
    });
  });

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">The basics</Text>
          <Text className="font-body text-base text-ink-muted">
            We use this to compute your metrics and daily targets.
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.full_name?.message}
                autoCapitalize="words"
              />
            )}
          />
          <Controller
            control={control}
            name="age"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Age"
                value={value === undefined ? '' : String(value)}
                onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                onBlur={onBlur}
                error={errors.age?.message}
                keyboardType="number-pad"
              />
            )}
          />
          <Controller
            control={control}
            name="sex"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Sex"
                options={sexOptions}
                value={value}
                onChange={onChange}
                error={errors.sex?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="height_cm"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Height (cm)"
                value={value === undefined ? '' : String(value)}
                onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                onBlur={onBlur}
                error={errors.height_cm?.message}
                keyboardType="decimal-pad"
              />
            )}
          />
          <Controller
            control={control}
            name="weight_kg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Weight (kg)"
                value={value === undefined ? '' : String(value)}
                onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                onBlur={onBlur}
                error={errors.weight_kg?.message}
                keyboardType="decimal-pad"
              />
            )}
          />
          <Controller
            control={control}
            name="activity_level"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Activity level"
                options={activityOptions}
                value={value}
                onChange={onChange}
                error={errors.activity_level?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="primary_goal"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Primary goal"
                options={goalOptions}
                value={value}
                onChange={onChange}
                error={errors.primary_goal?.message}
              />
            )}
          />
          {upsertProfile.isError ? (
            <Text className="font-body-medium text-sm text-danger">
              {upsertProfile.error instanceof Error
                ? upsertProfile.error.message
                : 'Couldn’t save your details.'}
            </Text>
          ) : null}
        </View>

        <Button label="Continue" onPress={onSubmit} loading={upsertProfile.isPending} />
      </View>
    </Screen>
  );
}
