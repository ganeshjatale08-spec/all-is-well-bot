import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { LogSheetHeader } from '../../features/journal/components/LogSheetHeader';
import { useLogWater } from '../../features/journal/hooks/useLogMutations';
import { waterEntrySchema } from '../../schemas/journal';

const QUICK_AMOUNTS_ML = [250, 500, 1000];

export default function LogWater() {
  const router = useRouter();
  const logWater = useLogWater();
  const [amountMl, setAmountMl] = useState(250);

  const onAdd = (amountMlToLog: number) => {
    const parsed = waterEntrySchema.safeParse({ amount_l: amountMlToLog / 1000 });
    if (!parsed.success) return;
    logWater.mutate(parsed.data);
    router.back();
  };

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <LogSheetHeader title="Log water" onClose={() => router.back()} />

        <View className="flex-row flex-wrap gap-2">
          {QUICK_AMOUNTS_ML.map((ml) => (
            <Pressable
              key={ml}
              onPress={() => onAdd(ml)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${ml >= 1000 ? `${ml / 1000} litre` : `${ml} millilitres`}`}
              className="h-11 items-center justify-center rounded-md border border-hairline bg-surface px-4 active:bg-surface-sunken"
            >
              <Text className="font-body-medium text-sm text-ink">
                +{ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`}
              </Text>
            </Pressable>
          ))}
        </View>

        <Stepper label="Custom amount (ml)" value={amountMl} onChange={setAmountMl} min={50} max={2000} step={50} />

        <Button label="Log water" onPress={() => onAdd(amountMl)} />
      </View>
    </Screen>
  );
}
