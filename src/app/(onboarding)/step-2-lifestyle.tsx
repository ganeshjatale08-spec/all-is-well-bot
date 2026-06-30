import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OptionPicker } from '../../components/ui/OptionPicker';
import { profileLifestyleSchema, type ProfileLifestyleInput } from '../../schemas/profile';
import { useUpsertProfile } from '../../features/onboarding/hooks/useProfile';
import { DIET_LABELS, DIET_OPTIONS } from '../../constants/enums';

const dietOptions = DIET_OPTIONS.map((value) => ({ value, label: DIET_LABELS[value] }));

export default function Step2Lifestyle() {
  const router = useRouter();
  const upsertProfile = useUpsertProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileLifestyleInput>({
    resolver: zodResolver(profileLifestyleSchema),
    defaultValues: { diet_type: undefined, target_weight_kg: undefined },
  });

  const onSubmit = handleSubmit((values) => {
    upsertProfile.mutate(values, {
      onSuccess: () => router.push('/(onboarding)/step-3-health'),
    });
  });

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">Your lifestyle</Text>
          <Text className="font-body text-base text-ink-muted">
            A little more context helps us tailor your plan.
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="diet_type"
            render={({ field: { onChange, value } }) => (
              <OptionPicker
                label="Diet type"
                options={dietOptions}
                value={value}
                onChange={onChange}
                error={errors.diet_type?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="target_weight_kg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Target weight (kg)"
                value={value === undefined ? '' : String(value)}
                onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                onBlur={onBlur}
                error={errors.target_weight_kg?.message}
                keyboardType="decimal-pad"
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
