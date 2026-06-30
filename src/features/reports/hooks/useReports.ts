import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  reportListItemSchema,
  reportSchema,
  type Report,
  type ReportListItem,
} from '../../../schemas/reports';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../auth/SessionProvider';
import { todayDateString } from '../../journal/hooks/useDailyLog';

function monthStartForDate(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

function weekStartForDate(dateStr: string): string {
  const end = new Date(`${dateStr}T00:00:00Z`);
  const isoDow = end.getUTCDay() === 0 ? 7 : end.getUTCDay();
  end.setUTCDate(end.getUTCDate() - (isoDow - 1));
  return end.toISOString().slice(0, 10);
}

const SELECT_LIST = 'id, period, period_start, period_end, score, pdf_url, share_token, model, created_at';
const SELECT_FULL = 'id, period, period_start, period_end, score, summary, pdf_url, share_token, model, created_at';

export function reportsListQueryKey(userId: string | undefined, period?: 'weekly' | 'monthly') {
  return ['reports', 'list', userId, period ?? 'all'] as const;
}

export function reportDetailQueryKey(id: string) {
  return ['reports', 'detail', id] as const;
}

// Ordered list of report cards for the Insights tab — does NOT include the
// full `summary` JSON (only list-row fields) so the scroll list is light.
export function useReportsList(period?: 'weekly' | 'monthly') {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: reportsListQueryKey(userId, period),
    queryFn: async (): Promise<ReportListItem[]> => {
      let query = supabase
        .from('reports')
        .select(SELECT_LIST)
        .eq('user_id', userId)
        .order('period_start', { ascending: false })
        .limit(24);
      if (period) query = query.eq('period', period);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => reportListItemSchema.parse(row));
    },
    enabled: !!userId,
  });
}

// Full report with parsed `summary`, used by the report/[id] screen.
export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: reportDetailQueryKey(id ?? ''),
    queryFn: async (): Promise<Report> => {
      const { data, error } = await supabase
        .from('reports')
        .select(SELECT_FULL)
        .eq('id', id)
        .single();
      if (error) throw error;
      return reportSchema.parse(data);
    },
    enabled: !!id,
  });
}

// On-demand weekly report generation — normally written by the Sunday cron,
// this is the fallback for Pro users checking before it ran.
export function useGenerateWeeklyReport() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodEnd: string = todayDateString()): Promise<Report> => {
      const { data, error } = await supabase.functions.invoke('weekly-report', {
        body: { period_end: periodEnd },
      });
      if (error) throw error;
      return reportSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(reportDetailQueryKey(data.id), data);
      queryClient.invalidateQueries({ queryKey: reportsListQueryKey(userId, 'weekly') });
      queryClient.invalidateQueries({ queryKey: reportsListQueryKey(userId) });
    },
  });
}

// On-demand monthly report generation — fallback for the month-end cron.
export function useGenerateMonthlyReport() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodEnd: string = todayDateString()): Promise<Report> => {
      const { data, error } = await supabase.functions.invoke('monthly-report', {
        body: { period_end: periodEnd },
      });
      if (error) throw error;
      return reportSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(reportDetailQueryKey(data.id), data);
      queryClient.invalidateQueries({ queryKey: reportsListQueryKey(userId, 'monthly') });
      queryClient.invalidateQueries({ queryKey: reportsListQueryKey(userId) });
    },
  });
}

// Convenience: last completed weekly report (Sunday → today) for the Insights
// tab "This week" card.
export function useLatestWeeklyReport() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['reports', 'latest', 'weekly', userId],
    queryFn: async (): Promise<ReportListItem | null> => {
      const { data, error } = await supabase
        .from('reports')
        .select(SELECT_LIST)
        .eq('user_id', userId)
        .eq('period', 'weekly')
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return reportListItemSchema.parse(data);
    },
    enabled: !!userId,
  });
}

// Convenience: last completed monthly report for the Insights tab "This month"
// card.
export function useLatestMonthlyReport() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['reports', 'latest', 'monthly', userId],
    queryFn: async (): Promise<ReportListItem | null> => {
      const { data, error } = await supabase
        .from('reports')
        .select(SELECT_LIST)
        .eq('user_id', userId)
        .eq('period', 'monthly')
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return reportListItemSchema.parse(data);
    },
    enabled: !!userId,
  });
}

// Generates a share_token for a monthly report via the report-share Edge
// Function. Returns the token, which the caller can embed into a shareable URL.
export function useShareReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('report-share', {
        body: { report_id: reportId },
      });
      if (error) throw error;
      if (typeof (data as { share_token?: unknown }).share_token !== 'string') {
        throw new Error('Invalid response from report-share');
      }
      return (data as { share_token: string }).share_token;
    },
    onSuccess: (_token, reportId) => {
      // Invalidate the detail cache so the updated share_token is visible.
      queryClient.invalidateQueries({ queryKey: reportDetailQueryKey(reportId) });
    },
  });
}

// Helper: what period_end value to send for "current week/month" on-demand.
export function currentWeekEnd(): string {
  return weekStartForDate(todayDateString());
}

export function currentMonthEnd(): string {
  const today = todayDateString();
  const monthStart = monthStartForDate(today);
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(nextMonth.getUTCDate() - 1);
  return nextMonth.toISOString().slice(0, 10);
}
