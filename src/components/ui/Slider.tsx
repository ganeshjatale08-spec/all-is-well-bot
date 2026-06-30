import { Pressable, Text, View } from 'react-native';

type SliderProps = {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

/**
 * Discrete 1-10 scale picker — chip row, not a drag gesture (no slider
 * dependency installed; tap targets are also more accessible than fine-motor
 * dragging for mood/stress/energy/severity fields).
 */
export function Slider({ label, value, onChange, min = 1, max = 10 }: SliderProps) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-sm text-ink-muted">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {steps.map((step) => {
          const selected = step === value;
          return (
            <Pressable
              key={step}
              onPress={() => onChange(step)}
              accessibilityRole="button"
              accessibilityLabel={`${step}`}
              accessibilityState={{ selected }}
              className={`h-11 w-11 items-center justify-center rounded-full border ${
                selected ? 'border-primary bg-primary' : 'border-hairline bg-surface'
              }`}
            >
              <Text className={`font-body-medium text-sm ${selected ? 'text-surface' : 'text-ink'}`}>
                {step}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
