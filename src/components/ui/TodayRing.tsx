import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { useReducedMotion, useTheme } from '../../lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STROKE_WIDTH = 12;
const ARC_GAP = 6;
const RING_SIZE = 240;

export type RingArcKey = 'caloriesProtein' | 'movement' | 'water' | 'sleep';

export type RingArc = {
  key: RingArcKey;
  /** 0-1 fill fraction for this goal. */
  progress: number;
  label: string;
  onPress?: () => void;
};

type TodayRingProps = {
  score: number;
  coachLine: string;
  arcs: readonly RingArc[];
  /** UI_UX_DESIGN §6 — e.g. "Today: 72 of 100. Water 1.2 of 3 litres." */
  accessibilitySummary: string;
  onPressRing?: () => void;
};

function RingArcLayer({
  radius,
  center,
  color,
  trackColor,
  progress,
  label,
  onPress,
}: {
  radius: number;
  center: number;
  color: string;
  trackColor: string;
  progress: number;
  label: string;
  onPress?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const circumference = 2 * Math.PI * radius;
  const fill = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(1, Math.max(0, progress));
    fill.value = reduceMotion ? target : withSpring(target, { damping: 16, stiffness: 120 });
  }, [progress, reduceMotion, fill]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  return (
    <G
      onPress={onPress}
      accessible={!!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? label : undefined}
    >
      <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={STROKE_WIDTH} fill="none" />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        fill="none"
      />
    </G>
  );
}

/** FRONTEND_DESIGN §6 — the signature Today Ring: 4 concentric arcs + center score. */
export function TodayRing({ score, coachLine, arcs, accessibilitySummary, onPressRing }: TodayRingProps) {
  const { tokens } = useTheme();
  const reduceMotion = useReducedMotion();
  const center = RING_SIZE / 2;
  const outerRadius = center - STROKE_WIDTH / 2 - 2;

  const colorByKey: Record<RingArcKey, string> = {
    caloriesProtein: tokens.energy,
    movement: tokens.primary,
    water: tokens.cool,
    sleep: tokens.indigo,
  };

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withSequence(withTiming(1.03, { duration: 120 }), withTiming(1, { duration: 130 }));
  }, [score, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Pressable
      onPress={onPressRing}
      accessibilityRole="summary"
      accessibilityLabel={accessibilitySummary}
      style={{ width: RING_SIZE, height: RING_SIZE }}
      className="items-center justify-center"
    >
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
        {arcs.map((arc, index) => (
          <RingArcLayer
            key={arc.key}
            radius={outerRadius - index * (STROKE_WIDTH + ARC_GAP)}
            center={center}
            color={colorByKey[arc.key]}
            trackColor={tokens.surfaceSunken}
            progress={arc.progress}
            label={arc.label}
            onPress={arc.onPress}
          />
        ))}
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[{ width: RING_SIZE, height: RING_SIZE }, pulseStyle]}
        className="absolute items-center justify-center px-8"
      >
        <Text
          className="font-display-bold text-ink"
          style={{ fontSize: 56, fontVariant: ['tabular-nums'] }}
        >
          {Math.round(score)}
        </Text>
        <Text className="font-body-medium text-xs text-ink-muted">of 100</Text>
        <Text numberOfLines={2} className="mt-1 text-center font-body text-sm text-ink-muted">
          {coachLine}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
