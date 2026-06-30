import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Slider } from '../../components/ui/Slider';
import { OptionPicker } from '../../components/ui/OptionPicker';
import { LogSheetHeader } from '../../features/journal/components/LogSheetHeader';
import { useLogMood } from '../../features/journal/hooks/useLogMutations';
import { moodEntrySchema } from '../../schemas/journal';
import { MOOD_LABELS, MOOD_OPTIONS } from '../../constants/enums';

const moodOptions = MOOD_OPTIONS.map((value) => ({ value, label: MOOD_LABELS[value] }));

export default function LogMood() {
  const router = useRouter();
  const logMood = useLogMood();
  const [mood, setMood] = useState<(typeof MOOD_OPTIONS)[number] | undefined>(undefined);
  const [energyLevel, setEnergyLevel] = useState<number | undefined>(undefined);
  const [stressLevel, setStressLevel] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const onSubmit = () => {
    const parsed = moodEntrySchema.safeParse({ mood, energy_level: energyLevel, stress_level: stressLevel });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Choose a mood.');
      return;
    }
    setError(undefined);
    logMood.mutate(parsed.data);
    router.back();
  };

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <LogSheetHeader title="Log mood" onClose={() => router.back()} />

        <OptionPicker label="Mood" options={moodOptions} value={mood} onChange={setMood} />
        <Slider label="Energy (optional)" value={energyLevel} onChange={setEnergyLevel} />
        <Slider label="Stress (optional)" value={stressLevel} onChange={setStressLevel} />

        {error ? <Text className="font-body-medium text-sm text-danger">{error}</Text> : null}

        <Button label="Log mood" onPress={onSubmit} />
      </View>
    </Screen>
  );
}
