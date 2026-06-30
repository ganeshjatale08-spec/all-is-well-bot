import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiAnalysisSchema, type AiAnalysis } from '../../../schemas/aiAnalysis';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../auth/SessionProvider';
import { todayDateString } from '../../journal/hooks/useDailyLog';

export function dailyAnalysisQueryKey(userId: string | undefined, date: string) {
  return ['dailyAnalysis', userId, date] as const;
}

// Read-only — the row this reads is normally written by the overnight
// pg_cron batch (TRD §5/§6), never by the client (RLS: owner SELECT-only on
// ai_analyses, see the Phase 4 migration). Returns null until it exists.
export function useDailyAnalysis(date: string = todayDateString()) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: dailyAnalysisQueryKey(userId, date),
    queryFn: async (): Promise<AiAnalysis | null> => {
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('id, log_date, health_score, headline, insight, recommendation, tomorrow_focus, model, created_at')
        .eq('user_id', userId)
        .eq('log_date', date)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return aiAnalysisSchema.parse(data);
    },
    enabled: !!userId,
  });
}

// On-demand fallback for when the overnight batch hasn't run yet (e.g. a
// brand-new Pro user, or local dev without pg_cron live) — invokes the same
// Edge Function the cron calls. Entitlement + idempotency are enforced
// server-side either way, so this is safe to expose directly.
export function useGenerateDailyAnalysis() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string = todayDateString()): Promise<AiAnalysis> => {
      const { data, error } = await supabase.functions.invoke('daily-analysis', {
        body: { log_date: date },
      });
      if (error) throw error;
      return aiAnalysisSchema.parse(data);
    },
    onSuccess: (data, date) => {
      queryClient.setQueryData(dailyAnalysisQueryKey(userId, date ?? todayDateString()), data);
    },
  });
}
