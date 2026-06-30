import { BookOpen, ChartLine, CircleUserRound, House, Plus } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';

import { useTheme } from '../../lib/theme';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICON_BY_ROUTE: Record<string, IconComponent> = {
  index: House,
  journal: BookOpen,
  insights: ChartLine,
  profile: CircleUserRound,
};

const LABEL_BY_ROUTE: Record<string, string> = {
  index: 'Home',
  journal: 'Journal',
  insights: 'Insights',
  profile: 'Profile',
};

type TabBarProps = BottomTabBarProps & {
  onPressQuickLog: () => void;
};

// Custom 5-slot tab bar — Home · Journal · center ⊕ quick-log · Insights ·
// Profile (APP_FLOW §1). The center slot opens a quick-log action sheet
// rather than navigating, so it can't be expressed as a Tabs.Screen.
export function TabBar({ state, navigation, insets, onPressQuickLog }: TabBarProps) {
  const { tokens } = useTheme();
  const [homeRoute, journalRoute, ...rest] = state.routes;
  const insightsRoute = rest[0];
  const profileRoute = rest[1];

  function renderTab(route: (typeof state.routes)[number]) {
    const index = state.routes.indexOf(route);
    const isFocused = state.index === index;
    const Icon = ICON_BY_ROUTE[route.name] ?? House;
    const label = LABEL_BY_ROUTE[route.name] ?? route.name;
    const color = isFocused ? tokens.primary : tokens.inkMuted;

    return (
      <Pressable
        key={route.key}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={label}
        className="flex-1 items-center justify-center gap-1 py-2"
      >
        <Icon size={22} color={color} strokeWidth={2} />
        <Text className="font-body-medium text-xs" style={{ color }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      className="flex-row items-center border-t border-hairline bg-surface px-2"
      style={{ paddingBottom: insets.bottom }}
    >
      {renderTab(homeRoute)}
      {renderTab(journalRoute)}
      <View className="flex-1 items-center justify-center">
        <Pressable
          onPress={onPressQuickLog}
          accessibilityRole="button"
          accessibilityLabel="Quick log"
          className="-mt-6 h-14 w-14 items-center justify-center rounded-full bg-primary active:bg-primary-press"
          style={{
            shadowColor: tokens.ink,
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Plus size={26} color={tokens.surface} strokeWidth={2.5} />
        </Pressable>
      </View>
      {renderTab(insightsRoute)}
      {renderTab(profileRoute)}
    </View>
  );
}
