import { Pressable, Text, View } from 'react-native';

type Option<T extends string> = {
  value: T;
  label: string;
};

type OptionPickerProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
};

/** Single-select chip list — FRONTEND_DESIGN §4 token-driven, ≥44pt targets. */
export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: OptionPickerProps<T>) {
  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-sm text-ink-muted">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              className={`h-11 items-center justify-center rounded-md border px-4 ${
                selected ? 'border-primary bg-primary' : 'border-hairline bg-surface'
              }`}
            >
              <Text
                className={`font-body-medium text-sm ${selected ? 'text-surface' : 'text-ink'}`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="font-body-medium text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
