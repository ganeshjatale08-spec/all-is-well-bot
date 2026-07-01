import { Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LockedCard } from '../../../components/ui/LockedCard';
import { useTheme } from '../../../lib/theme';
import { useEntitlement } from '../../subscription/hooks/useEntitlement';
import { useDailyAnalysis, useGenerateDailyAnalysis } from '../hooks/useDailyAnalysis';
import { todayDateString } from '../../journal/hooks/useDailyLog';

// Home AI insight card (UI_UX_DESIGN §4: "headline + 1 recommendation +
// tomorrow's focus"); Free tier sees LockedCard instead. The row is
// normally written overnight by pg_cron (TRD §6), so most opens just read
// it; the "Get today's insight" button is the on-demand fallback for users
// without a generated row yet (new Pro signups, or before the cron job
// exists in this environment).
export function AiInsightCard() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { data: entitlement, isLoading: entitlementLoading } = useEntitlement();
  const { data: analysis, isLoading: analysisLoading } = useDailyAnalysis();
  const generate = useGenerateDailyAnalysis();

  if (entitlementLoading) return null;

  if (!entitlement?.isProPlus) {
    return (
      <LockedCard
        title="AI daily insight"
        description="Get a personalized headline, recommendation, and tomorrow's focus — included with Pro."
        onPressCta={() => router.push('/paywall')}
      />
    );
  }

  if (analysisLoading) {
    return (
      <Card className="items-center py-6">
        <ActivityIndicator />
      </Card>
    );
  }

  // AI/API failure: deterministic fallback, never an error wall (APP_FLOW §9).
  if (generate.isError) {
    return (
      <Card className="gap-2">
        <View className="flex-row items-center gap-2">
          <Sparkles size={18} color={tokens.inkMuted} strokeWidth={2} />
          <Text className="font-body-semibold text-base text-ink">Keep going today</Text>
        </View>
        <Text className="font-body text-sm text-ink-muted">
          Your coach will have fresh insights once your data syncs. Logging consistently is the best thing you can do.
        </Text>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="items-center gap-2 py-6">
        <Sparkles size={24} color={tokens.primary} strokeWidth={1.5} />
        <Text className="text-center font-body-semibold text-base text-ink">
          Your coach is reviewing last night&apos;s data
        </Text>
        <Text className="text-center font-body text-sm text-ink-muted">
          Insights are usually ready by morning. You can also generate one now.
        </Text>
        <View className="mt-2">
          <Button
            label="Get today's insight"
            onPress={() => generate.mutate(todayDateString())}
            variant="secondary"
            size="md"
            loading={generate.isPending}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-2">
        <Sparkles size={18} color={tokens.primary} strokeWidth={2} />
        <Text className="font-body-semibold text-base text-ink">{analysis.headline}</Text>
      </View>
      {analysis.insight ? (
        <Text className="font-body text-sm text-ink-muted">{analysis.insight}</Text>
      ) : null}
      {analysis.recommendation ? (
        <Text className="font-body-medium text-sm text-ink">{analysis.recommendation}</Text>
      ) : null}
      {analysis.tomorrow_focus ? (
        <Text className="font-body text-xs text-ink-muted">
          Tomorrow: {analysis.tomorrow_focus}
        </Text>
      ) : null}
    </Card>
  );
}
