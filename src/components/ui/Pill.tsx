import { Text, View } from 'react-native';

type PillTone = 'default' | 'primary' | 'warn' | 'danger';

type PillProps = {
  label: string;
  tone?: PillTone;
};

const containerByTone: Record<PillTone, string> = {
  default: 'bg-surface-sunken',
  primary: 'bg-primary/10',
  warn: 'bg-warn/10',
  danger: 'bg-danger/10',
};

const labelByTone: Record<PillTone, string> = {
  default: 'text-ink-muted',
  primary: 'text-primary',
  warn: 'text-warn',
  danger: 'text-danger',
};

/** FRONTEND_DESIGN §5 — small status/tag chip. */
export function Pill({ label, tone = 'default' }: PillProps) {
  return (
    <View className={`items-center justify-center self-start rounded-full px-3 py-1 ${containerByTone[tone]}`}>
      <Text className={`font-body-medium text-xs ${labelByTone[tone]}`}>{label}</Text>
    </View>
  );
}
