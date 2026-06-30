import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { OptionPicker } from '../../components/ui/OptionPicker';
import { LogSheetHeader } from '../../features/journal/components/LogSheetHeader';
import { useLogWorkout } from '../../features/journal/hooks/useLogMutations';
import { workoutEntrySchema } from '../../schemas/journal';
import { WORKOUT_LABELS, WORKOUT_OPTIONS } from '../../constants/enums';

const workoutOptions = WORKOUT_OPTIONS.map((value) => ({ value, label: WORKOUT_LABELS[value] }));

export default function LogWorkout() {
  const router = useRouter();
  const logWorkout = useLogWorkout();
  const [workoutType, setWorkoutType] = useState<(typeof WORKOUT_OPTIONS)[number] | undefined>(undefined);
  const [durationMin, setDurationMin] = useState(30);
  const [error, setError] = useState<string | undefined>(undefined);

  const onSubmit = () => {
    const parsed = workoutEntrySchema.safeParse({ workout_type: workoutType, duration_min: durationMin });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Choose a workout type.');
      return;
    }
    setError(undefined);
    logWorkout.mutate(parsed.data);
    router.back();
  };

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <LogSheetHeader title="Log workout" onClose={() => router.back()} />

        <OptionPicker label="Type" options={workoutOptions} value={workoutType} onChange={setWorkoutType} />
        <Stepper label="Duration" value={durationMin} onChange={setDurationMin} min={5} max={240} step={5} unit="min" />

        {error ? <Text className="font-body-medium text-sm text-danger">{error}</Text> : null}

        <Button label="Log workout" onPress={onSubmit} />
      </View>
    </Screen>
  );
}
