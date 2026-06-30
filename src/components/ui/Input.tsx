import { forwardRef } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../../lib/theme';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

/** FRONTEND_DESIGN §4 — 12px radius, 1px hairline border, label + error text. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, ...textInputProps },
  ref,
) {
  const { tokens } = useTheme();

  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-sm text-ink-muted">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={tokens.inkMuted}
        className={`h-11 rounded-md border px-3.5 font-body text-base text-ink ${
          error ? 'border-danger' : 'border-hairline'
        } bg-surface`}
        {...textInputProps}
      />
      {error ? <Text className="font-body-medium text-xs text-danger">{error}</Text> : null}
    </View>
  );
});
