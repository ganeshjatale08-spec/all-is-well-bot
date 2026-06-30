import type { ComponentType } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme';
import { Button } from './Button';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type EmptyStateProps = {
  icon?: IconComponent;
  title: string;
  description?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

/** FRONTEND_DESIGN §5 — centered icon + title + description + optional CTA. */
export function EmptyState({ icon: Icon, title, description, ctaLabel, onPressCta }: EmptyStateProps) {
  const { tokens } = useTheme();

  return (
    <View className="items-center gap-2 px-6 py-8">
      {Icon ? <Icon size={32} color={tokens.inkMuted} strokeWidth={1.5} /> : null}
      <Text className="text-center font-body-semibold text-base text-ink">{title}</Text>
      {description ? (
        <Text className="text-center font-body text-sm text-ink-muted">{description}</Text>
      ) : null}
      {ctaLabel && onPressCta ? (
        <View className="mt-2">
          <Button label={ctaLabel} onPress={onPressCta} variant="secondary" size="md" />
        </View>
      ) : null}
    </View>
  );
}
