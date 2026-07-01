import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { Calendar, ChartLine, TrendingUp } from 'lucide-react-native';

import { Card } from '../../components/ui/Card';
import { LockedCard } from '../../components/ui/LockedCard';
import { Screen } from '../../components/ui/Screen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../lib/theme';
import { useEntitlement } from '../../features/subscription/hooks/useEntitlement';
import { useTrends, type TrendRange, type TrendDay, type WeightPoint } from '../../features/reports/hooks/useTrends';
import { useLatestWeeklyReport, useLatestMonthlyReport, useGenerateWeeklyReport, useGenerateMonthlyReport, currentMonthEnd } from '../../features/reports/hooks/useReports';
import { useCurrentGoals } from '../../features/reports/hooks/useGoals';
import { RangePicker } from '../../features/reports/components/RangePicker';
import { todayDateString } from '../../features/journal/hooks/useDailyLog';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_HEIGHT = 160;
const HORIZONTAL_PADDING = 40;

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return DAY_LABELS[d.getUTCDay()];
}

function shortDate(dateStr: string): string {
  return dateStr.slice(5); // MM-DD
}

function formatDate(dateStr: string, range: TrendRange, index: number, total: number): string {
  if (range === 'week') return dayLabel(dateStr);
  if (range === 'month') return index % 5 === 0 ? shortDate(dateStr) : '';
  // 3month: show every ~15th entry
  return index % 15 === 0 ? shortDate(dateStr) : '';
}

function toLineData(days: readonly TrendDay[], pick: (d: TrendDay) => number, range: TrendRange) {
  return days.map((d, i) => ({
    value: Math.round(pick(d) * 10) / 10,
    label: formatDate(d.date, range, i, days.length),
  }));
}

function toBarData(days: readonly TrendDay[], pick: (d: TrendDay) => number, range: TrendRange, color: string) {
  return days.map((d, i) => ({
    value: Math.round(pick(d)),
    label: formatDate(d.date, range, i, days.length),
    frontColor: color,
  }));
}

function toWeightLineData(points: readonly WeightPoint[]) {
  return points.map((p) => ({ value: p.weightKg, label: shortDate(p.date) }));
}

type ChartCardProps = {
  title: string;
  unit?: string;
  children: React.ReactNode;
};

function ChartCard({ title, unit, children }: ChartCardProps) {
  return (
    <Card className="gap-2">
      <View className="flex-row items-baseline gap-1">
        <Text className="font-body-semibold text-sm text-ink">{title}</Text>
        {unit ? <Text className="font-body text-xs text-ink-muted">{unit}</Text> : null}
      </View>
      {children}
    </Card>
  );
}

function ReportCard({ period, onPress }: { period: 'weekly' | 'monthly'; onPress?: () => void }) {
  const router = useRouter();
  const { tokens } = useTheme();

  const latestWeekly = useLatestWeeklyReport();
  const latestMonthly = useLatestMonthlyReport();
  const generateWeekly = useGenerateWeeklyReport();
  const generateMonthly = useGenerateMonthlyReport();

  const report = period === 'weekly' ? latestWeekly.data : latestMonthly.data;
  const isLoading = period === 'weekly' ? latestWeekly.isLoading : latestMonthly.isLoading;
  const generate = period === 'weekly' ? generateWeekly : generateMonthly;
  const label = period === 'weekly' ? 'This week' : 'This month';

  if (isLoading) {
    return (
      <Card className="items-center py-6">
        <ActivityIndicator />
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="gap-3">
        <View className="flex-row items-center gap-2">
          <Calendar size={16} color={tokens.inkMuted} strokeWidth={2} />
          <Text className="font-body-semibold text-sm text-ink">{label} report</Text>
        </View>
        <Text className="font-body text-sm text-ink-muted">
          {period === 'weekly'
            ? 'Your weekly report is ready Sunday night.'
            : 'Your monthly report is ready at month end.'}
        </Text>
        <Pressable
          onPress={() => {
            if (period === 'weekly') {
              generateWeekly.mutate(todayDateString());
            } else {
              generateMonthly.mutate(currentMonthEnd());
            }
          }}
          disabled={generate.isPending}
          accessibilityRole="button"
          accessibilityLabel={`Generate ${label} report`}
        >
          {generate.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="font-body-medium text-sm text-primary">Generate now</Text>
          )}
        </Pressable>
      </Card>
    );
  }

  return (
    <Card
      onPress={() => router.push(`/report/${report.id}`)}
      accessibilityLabel={`Open ${label} report, score ${report.score ?? 'unavailable'}`}
      className="gap-2"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <TrendingUp size={16} color={tokens.primary} strokeWidth={2} />
          <Text className="font-body-semibold text-sm text-ink">{label} report</Text>
        </View>
        {report.score !== null ? (
          <Text className="font-display text-lg text-primary">{report.score}</Text>
        ) : null}
      </View>
      <Text className="font-body text-xs text-ink-muted">
        {report.period_start} – {report.period_end}
      </Text>
    </Card>
  );
}

function GoalsCard() {
  const { data: goals, isLoading } = useCurrentGoals();

  if (isLoading) {
    return (
      <Card className="items-center py-4">
        <ActivityIndicator />
      </Card>
    );
  }

  if (!goals) {
    return (
      <Card className="gap-1">
        <Text className="font-body-semibold text-sm text-ink">This month&apos;s goals</Text>
        <Text className="font-body text-sm text-ink-muted">
          Goals are set at month end. Check back after the first of the month.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="gap-3">
      <Text className="font-body-semibold text-sm text-ink">This month&apos;s goals</Text>
      <View className="gap-1">
        {goals.daily_step_goal ? (
          <Text className="font-body text-sm text-ink">Steps: {goals.daily_step_goal.toLocaleString()} / day</Text>
        ) : null}
        {goals.sleep_goal_hours ? (
          <Text className="font-body text-sm text-ink">Sleep: {goals.sleep_goal_hours}h / night</Text>
        ) : null}
        {goals.water_goal_l ? (
          <Text className="font-body text-sm text-ink">Water: {goals.water_goal_l}L / day</Text>
        ) : null}
        {goals.protein_goal_g ? (
          <Text className="font-body text-sm text-ink">Protein: {goals.protein_goal_g}g / day</Text>
        ) : null}
        {goals.workout_goal_per_week ? (
          <Text className="font-body text-sm text-ink">Workouts: {goals.workout_goal_per_week} / week</Text>
        ) : null}
      </View>
      {goals.sugar_reduction_note ? (
        <Text className="font-body text-xs text-ink-muted">{goals.sugar_reduction_note}</Text>
      ) : null}
    </Card>
  );
}

export default function Insights() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const chartWidth = width - HORIZONTAL_PADDING - 32; // minus padding + card padding

  const [range, setRange] = useState<TrendRange>('week');
  const { data: entitlement } = useEntitlement();
  const isPro = entitlement?.isProPlus ?? false;
  const { data: trends, isLoading: trendsLoading } = useTrends(range);

  const days = trends?.days ?? [];
  const weightPoints = trends?.weightPoints ?? [];
  const hasData = days.length > 0;

  return (
    <Screen scroll>
      <View className="gap-6">
        <Text className="font-display text-xl text-ink">Insights</Text>

        <RangePicker value={range} onChange={setRange} />

        {/* Trend charts */}
        {trendsLoading ? (
          <Card className="items-center py-8">
            <ActivityIndicator />
          </Card>
        ) : !hasData ? (
          <Card>
            <EmptyState
              icon={ChartLine}
              title="No data yet"
              description={`Log a few days to see your ${range === 'week' ? 'weekly' : range === 'month' ? 'monthly' : '3-month'} trends.`}
            />
          </Card>
        ) : (
          <View className="gap-4">
            <ChartCard title="Daily Score" unit="/ 100">
              <LineChart
                data={toLineData(days, (d) => d.score, range)}
                width={chartWidth}
                height={CHART_HEIGHT}
                color={tokens.primary}
                thickness={2}
                curved
                hideRules
                noOfSections={4}
                maxValue={100}
                initialSpacing={4}
                hideYAxisText={false}
              />
            </ChartCard>

            <ChartCard title="Steps" unit="per day">
              <BarChart
                data={toBarData(days, (d) => d.steps, range, tokens.cool)}
                width={chartWidth}
                height={CHART_HEIGHT}
                barWidth={range === 'week' ? 28 : range === 'month' ? 6 : 2}
                noOfSections={4}
                hideRules
                initialSpacing={4}
              />
            </ChartCard>

            <ChartCard title="Sleep" unit="hours">
              <LineChart
                data={toLineData(days, (d) => d.sleepHours ?? 0, range)}
                width={chartWidth}
                height={CHART_HEIGHT}
                color={tokens.indigo}
                thickness={2}
                curved
                hideRules
                noOfSections={4}
                initialSpacing={4}
              />
            </ChartCard>

            <ChartCard title="Water" unit="litres/day">
              <BarChart
                data={toBarData(days, (d) => d.waterL, range, tokens.cool)}
                width={chartWidth}
                height={CHART_HEIGHT}
                barWidth={range === 'week' ? 28 : range === 'month' ? 6 : 2}
                noOfSections={4}
                hideRules
                initialSpacing={4}
              />
            </ChartCard>

            <ChartCard title="Protein" unit="g/day">
              <BarChart
                data={toBarData(days, (d) => d.proteinG, range, tokens.energy)}
                width={chartWidth}
                height={CHART_HEIGHT}
                barWidth={range === 'week' ? 28 : range === 'month' ? 6 : 2}
                noOfSections={4}
                hideRules
                initialSpacing={4}
              />
            </ChartCard>

            {weightPoints.length >= 2 ? (
              <ChartCard title="Weight" unit="kg">
                <LineChart
                  data={toWeightLineData(weightPoints)}
                  width={chartWidth}
                  height={CHART_HEIGHT}
                  color={tokens.warn}
                  thickness={2}
                  curved
                  hideRules
                  noOfSections={4}
                  initialSpacing={8}
                />
              </ChartCard>
            ) : null}
          </View>
        )}

        {/* Report cards — Pro only */}
        <View className="gap-3">
          <Text className="font-body-semibold text-base text-ink">Reports</Text>
          {isPro ? (
            <>
              <ReportCard period="weekly" />
              <ReportCard period="monthly" />
            </>
          ) : (
            <LockedCard
              title="Weekly &amp; monthly reports"
              description="Get AI-written insights on your week and month — included with Pro."
              onPressCta={() => router.push('/paywall')}
            />
          )}
        </View>

        {/* Goals — Pro only */}
        <View className="gap-3">
          <Text className="font-body-semibold text-base text-ink">Goals</Text>
          {isPro ? (
            <GoalsCard />
          ) : (
            <LockedCard
              title="Monthly goals"
              description="Formula-driven targets set each month based on your pace — included with Pro."
              onPressCta={() => router.push('/paywall')}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
