import { useReducedMotion } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';

/**
 * Raw hex tokens — FRONTEND_DESIGN.md §2. NativeWind's `bg-canvas`/`text-ink`
 * classes are the default way to consume these; use this object only where a
 * className can't reach (e.g. SVG `stroke`, icon `color` props).
 */
export const tokens = {
  light: {
    canvas: '#F6F8F4',
    surface: '#FFFFFF',
    surfaceSunken: '#EEF1EB',
    ink: '#14201B',
    inkMuted: '#5C6B63',
    primary: '#12A06A',
    primaryPress: '#0C8757',
    energy: '#FF7A4D',
    cool: '#4C8DF5',
    indigo: '#6C6CE0',
    warn: '#E0A82E',
    danger: '#D8503C',
    hairline: '#E2E7DD',
  },
  dark: {
    canvas: '#0E1512',
    surface: '#16201B',
    surfaceSunken: '#1E2A24',
    ink: '#EAF1EC',
    inkMuted: '#9DB0A6',
    primary: '#2DBE83',
    primaryPress: '#24A874',
    energy: '#FF8C63',
    cool: '#6AA0F7',
    indigo: '#8A8AEC',
    warn: '#E8B94A',
    danger: '#E0654F',
    hairline: '#26332C',
  },
} as const;

export type ThemeTokens = typeof tokens.light;

/** Current theme's raw tokens + scheme state, for contexts NativeWind can't style. */
export function useTheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    colorScheme: colorScheme ?? 'light',
    isDark,
    setColorScheme,
    toggleColorScheme,
    tokens: isDark ? tokens.dark : tokens.light,
  };
}

/** Wraps Reanimated's reduced-motion signal — UI_UX_DESIGN.md §5 / FRONTEND_DESIGN.md §6. */
export { useReducedMotion };
