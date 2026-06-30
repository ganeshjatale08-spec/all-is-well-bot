import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../lib/theme';
import { BottomSheet } from './BottomSheet';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export type ActionSheetOption = {
  key: string;
  label: string;
  icon?: IconComponent;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: readonly ActionSheetOption[];
};

/** FRONTEND_DESIGN §5 — sheet listing tappable actions (e.g. ⊕ quick-log). */
export function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  const { tokens } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {title ? <Text className="mb-2 px-1 font-body-semibold text-base text-ink">{title}</Text> : null}
      <View className="gap-1">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                onClose();
                option.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              className="h-14 flex-row items-center gap-3 rounded-md px-1 active:bg-surface-sunken"
            >
              {Icon ? (
                <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken">
                  <Icon size={18} color={tokens.ink} strokeWidth={2} />
                </View>
              ) : null}
              <Text className="font-body-medium text-base text-ink">{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
