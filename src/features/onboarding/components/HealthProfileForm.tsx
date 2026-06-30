import { useState } from 'react';
import { Text, View } from 'react-native';

import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { OptionPicker } from '../../../components/ui/OptionPicker';
import { useUpsertHealthProfile, type HealthProfileRow } from '../hooks/useProfile';

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

function splitList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toOptionalNumber(text: string): number | undefined {
  return text === '' ? undefined : Number(text);
}

function toOptionalBoolean(value: 'yes' | 'no' | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'yes';
}

function toBooleanOption(value: boolean | null | undefined): 'yes' | 'no' | undefined {
  if (value == null) return undefined;
  return value ? 'yes' : 'no';
}

type HealthProfileFormProps = {
  initialValues?: Partial<HealthProfileRow>;
  onSaved: () => void;
};

// Shared by onboarding Step 3 (skippable) and the Profile entry point for
// progressive completion. All fields are optional (BACKEND_SCHEMA.md §2),
// so this uses plain local state rather than zod-validated react-hook-form.
export function HealthProfileForm({ initialValues, onSaved }: HealthProfileFormProps) {
  const upsertHealthProfile = useUpsertHealthProfile();

  const [medicalConditions, setMedicalConditions] = useState(
    initialValues?.medical_conditions?.join(', ') ?? '',
  );
  const [familyHistory, setFamilyHistory] = useState(
    initialValues?.family_history?.join(', ') ?? '',
  );
  const [foodAllergies, setFoodAllergies] = useState(
    initialValues?.food_allergies?.join(', ') ?? '',
  );
  const [currentMedications, setCurrentMedications] = useState(
    initialValues?.current_medications ?? '',
  );
  const [dailyScreenTimeHours, setDailyScreenTimeHours] = useState(
    initialValues?.daily_screen_time_hours?.toString() ?? '',
  );
  const [avgStressLevel, setAvgStressLevel] = useState(
    initialValues?.avg_stress_level?.toString() ?? '',
  );
  const [digestionIssues, setDigestionIssues] = useState<'yes' | 'no' | undefined>(
    toBooleanOption(initialValues?.digestion_issues),
  );
  const [chronicPain, setChronicPain] = useState<'yes' | 'no' | undefined>(
    toBooleanOption(initialValues?.chronic_pain),
  );
  const [previousInjuries, setPreviousInjuries] = useState(
    initialValues?.previous_injuries ?? '',
  );
  const [dailyEnergyLevel, setDailyEnergyLevel] = useState(
    initialValues?.daily_energy_level?.toString() ?? '',
  );

  const onSave = () => {
    upsertHealthProfile.mutate(
      {
        medical_conditions: splitList(medicalConditions),
        family_history: splitList(familyHistory),
        food_allergies: splitList(foodAllergies),
        current_medications: currentMedications || undefined,
        daily_screen_time_hours: toOptionalNumber(dailyScreenTimeHours),
        avg_stress_level: toOptionalNumber(avgStressLevel),
        digestion_issues: toOptionalBoolean(digestionIssues),
        chronic_pain: toOptionalBoolean(chronicPain),
        previous_injuries: previousInjuries || undefined,
        daily_energy_level: toOptionalNumber(dailyEnergyLevel),
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <View className="gap-6">
      <View className="gap-4">
        <Input
          label="Medical conditions (comma-separated)"
          value={medicalConditions}
          onChangeText={setMedicalConditions}
        />
        <Input
          label="Family history (comma-separated)"
          value={familyHistory}
          onChangeText={setFamilyHistory}
        />
        <Input
          label="Food allergies (comma-separated)"
          value={foodAllergies}
          onChangeText={setFoodAllergies}
        />
        <Input
          label="Current medications"
          value={currentMedications}
          onChangeText={setCurrentMedications}
        />
        <Input
          label="Daily screen time (hours)"
          value={dailyScreenTimeHours}
          onChangeText={setDailyScreenTimeHours}
          keyboardType="decimal-pad"
        />
        <Input
          label="Average stress level (1-10)"
          value={avgStressLevel}
          onChangeText={setAvgStressLevel}
          keyboardType="number-pad"
        />
        <OptionPicker
          label="Digestion issues?"
          options={YES_NO_OPTIONS}
          value={digestionIssues}
          onChange={setDigestionIssues}
        />
        <OptionPicker
          label="Chronic pain?"
          options={YES_NO_OPTIONS}
          value={chronicPain}
          onChange={setChronicPain}
        />
        <Input
          label="Previous injuries"
          value={previousInjuries}
          onChangeText={setPreviousInjuries}
        />
        <Input
          label="Daily energy level (1-10)"
          value={dailyEnergyLevel}
          onChangeText={setDailyEnergyLevel}
          keyboardType="number-pad"
        />
        {upsertHealthProfile.isError ? (
          <Text className="font-body-medium text-sm text-danger">
            {upsertHealthProfile.error instanceof Error
              ? upsertHealthProfile.error.message
              : 'Couldn’t save your details.'}
          </Text>
        ) : null}
      </View>

      <Button label="Save" onPress={onSave} loading={upsertHealthProfile.isPending} />
    </View>
  );
}
