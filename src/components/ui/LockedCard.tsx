import { Lock } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme';
import { Button } from './Button';
import { Card } from './Card';

type LockedCardProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

/** FRONTEND_DESIGN §5 — Free-tier placeholder for a Pro feature; contextual
 * paywall entry point (UI_UX_DESIGN §4: "Free: locked card → contextual
 * paywall"). The real Paywall screen is Phase 6 — `onPressCta` is whatever
 * the caller currently has available (paywall route once it exists). */
export function LockedCard({ title, description, ctaLabel = 'Unlock with Pro', onPressCta }: LockedCardProps) {
  const { tokens } = useTheme();

  return (
    <Card className="items-center gap-2 py-6">
      <Lock size={24} color={tokens.inkMuted} strokeWidth={1.5} />
      <Text className="text-center font-body-semibold text-base text-ink">{title}</Text>
      <Text className="text-center font-body text-sm text-ink-muted">{description}</Text>
      {onPressCta ? (
        <View className="mt-2">
          <Button label={ctaLabel} onPress={onPressCta} variant="secondary" size="md" />
        </View>
      ) : null}
    </Card>
  );
}
