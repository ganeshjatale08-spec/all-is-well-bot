import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
};

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:bg-primary-press',
  secondary: 'bg-surface-sunken active:bg-hairline',
  ghost: 'bg-transparent active:bg-surface-sunken',
  destructive: 'bg-danger active:opacity-90',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'text-surface',
  secondary: 'text-ink',
  ghost: 'text-ink',
  destructive: 'text-surface',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'h-11 px-4',
  lg: 'h-14 px-6',
};

/** FRONTEND_DESIGN §5 — primary/secondary/ghost/destructive, ≥44pt targets. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`items-center justify-center rounded-md ${containerByVariant[variant]} ${sizeClasses[size]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'destructive' ? '#FFFFFF' : undefined} />
      ) : (
        <Text className={`font-body-semibold text-base ${labelByVariant[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
