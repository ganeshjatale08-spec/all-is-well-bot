import { Pressable, View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** FRONTEND_DESIGN §5 — surface container, 20px radius, base padding. */
export function Card({ onPress, accessibilityLabel, className = '', children, ...viewProps }: CardProps) {
  const classes = `rounded-card bg-surface p-4 ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={`active:opacity-90 ${classes}`}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={classes} {...viewProps}>
      {children}
    </View>
  );
}
