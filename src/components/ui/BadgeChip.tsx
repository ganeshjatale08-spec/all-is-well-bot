import { Award } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme';

type BadgeChipProps = {
  label: string;
  earned: boolean;
};

/** FRONTEND_DESIGN §5 — gamification badge chip, dimmed when not yet earned. */
export function BadgeChip({ label, earned }: BadgeChipProps) {
  const { tokens } = useTheme();

  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5 ${
        earned ? 'border-primary bg-primary/10' : 'border-hairline bg-surface opacity-50'
      }`}
      accessibilityLabel={`${label}${earned ? ', earned' : ', not yet earned'}`}
    >
      <Award size={14} color={earned ? tokens.primary : tokens.inkMuted} strokeWidth={2} />
      <Text className={`font-body-medium text-xs ${earned ? 'text-primary' : 'text-ink-muted'}`}>
        {label}
      </Text>
    </View>
  );
}
