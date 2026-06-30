import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { Slider } from '../../components/ui/Slider';
import { LogSheetHeader } from '../../features/journal/components/LogSheetHeader';
import { useLogSleep } from '../../features/journal/hooks/useLogMutations';
import { sleepEntrySchema } from '../../schemas/journal';

export default function LogSleep() {
  const router = useRouter();
  const logSleep = useLogSleep();
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState<number | undefined>(undefined);

  const onSubmit = () => {
    const parsed = sleepEntrySchema.safeParse({ sleep_hours: sleepHours, sleep_quality: sleepQuality });
    if (!parsed.success) return;
    logSleep.mutate(parsed.data);
    router.back();
  };

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <LogSheetHeader title="Log sleep" onClose={() => router.back()} />

        <Stepper label="Hours slept" value={sleepHours} onChange={setSleepHours} min={0} max={14} step={0.5} unit="h" />
        <Slider label="Sleep quality (optional)" value={sleepQuality} onChange={setSleepQuality} />

        <Button label="Log sleep" onPress={onSubmit} />
      </View>
    </Screen>
  );
}
