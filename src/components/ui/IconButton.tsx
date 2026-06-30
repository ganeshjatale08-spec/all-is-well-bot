import type { ComponentType } from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../../lib/theme';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type IconButtonProps = {
  icon: IconComponent;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  disabled?: boolean;
};

const containerByVariant: Record<IconButtonVariant, string> = {
  primary: 'bg-primary active:bg-primary-press',
  secondary: 'bg-surface-sunken active:bg-hairline',
  ghost: 'bg-transparent active:bg-surface-sunken',
};

/** FRONTEND_DESIGN §5 — circular icon-only control, ≥44pt target. */
export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'secondary',
  disabled = false,
}: IconButtonProps) {
  const { tokens } = useTheme();
  const color = variant === 'primary' ? tokens.surface : tokens.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className={`h-11 w-11 items-center justify-center rounded-full ${containerByVariant[variant]} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <Icon size={20} color={color} strokeWidth={2} />
    </Pressable>
  );
}
