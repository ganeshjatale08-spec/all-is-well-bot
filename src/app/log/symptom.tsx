import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Slider } from '../../components/ui/Slider';
import { OptionPicker } from '../../components/ui/OptionPicker';
import { LogSheetHeader } from '../../features/journal/components/LogSheetHeader';
import { useLogSymptom } from '../../features/journal/hooks/useLogMutations';
import { symptomEntrySchema } from '../../schemas/journal';
import { SYMPTOM_LABELS, SYMPTOM_OPTIONS } from '../../constants/enums';

const symptomOptions = SYMPTOM_OPTIONS.map((value) => ({ value, label: SYMPTOM_LABELS[value] }));

export default function LogSymptom() {
  const router = useRouter();
  const logSymptom = useLogSymptom();
  const [suggested, setSuggested] = useState<(typeof SYMPTOM_OPTIONS)[number] | undefined>(undefined);
  const [customSymptom, setCustomSymptom] = useState('');
  const [severity, setSeverity] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const onSubmit = () => {
    const symptom = customSymptom.trim() || (suggested ? SYMPTOM_LABELS[suggested] : '');
    const parsed = symptomEntrySchema.safeParse({ symptom, severity });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Add a symptom.');
      return;
    }
    setError(undefined);
    logSymptom.mutate(parsed.data);
    router.back();
  };

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <LogSheetHeader title="Log symptom" onClose={() => router.back()} />

        <OptionPicker
          label="Common symptoms"
          options={symptomOptions}
          value={suggested}
          onChange={(value) => {
            setSuggested(value);
            setCustomSymptom('');
          }}
        />
        <Input
          label="Or describe it"
          value={customSymptom}
          onChangeText={(text) => {
            setCustomSymptom(text);
            if (text) setSuggested(undefined);
          }}
          placeholder="e.g. sore throat"
        />
        <Slider label="Severity (optional)" value={severity} onChange={setSeverity} />

        {error ? <Text className="font-body-medium text-sm text-danger">{error}</Text> : null}

        <Button label="Log symptom" onPress={onSubmit} />
      </View>
    </Screen>
  );
}
