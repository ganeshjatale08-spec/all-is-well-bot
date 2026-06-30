import { Flame } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme';

type StreakFlameProps = {
  count: number;
};

/** FRONTEND_DESIGN §5 — streak-day indicator, lit when count > 0. */
export function StreakFlame({ count }: StreakFlameProps) {
  const { tokens } = useTheme();
  const active = count > 0;

  return (
    <View
      className="flex-row items-center gap-1"
      accessibilityLabel={`${count} day streak`}
    >
      <Flame
        size={18}
        color={active ? tokens.energy : tokens.inkMuted}
        fill={active ? tokens.energy : 'transparent'}
        strokeWidth={2}
      />
      <Text
        className={`font-body-semibold text-sm ${active ? 'text-energy' : 'text-ink-muted'}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {count}
      </Text>
    </View>
  );
}
