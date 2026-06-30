import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { useSession } from '../../auth/SessionProvider';
import type {
  ConsentInput,
  HealthProfileInput,
  ProfileBasicsInput,
  ProfileLifestyleInput,
} from '../../../schemas/profile';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  age: number | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  diet_type: string | null;
  activity_level: string | null;
  primary_goal: string | null;
  onboarding_complete: boolean;
  consent_dpdp_at: string | null;
};

export type HealthProfileRow = {
  user_id: string;
  medical_conditions: string[];
  family_history: string[];
  food_allergies: string[];
  current_medications: string | null;
  daily_screen_time_hours: number | null;
  avg_stress_level: number | null;
  digestion_issues: boolean | null;
  chronic_pain: boolean | null;
  previous_injuries: string | null;
  daily_energy_level: number | null;
};

function profileQueryKey(userId: string | undefined) {
  return ['profile', userId] as const;
}

function healthProfileQueryKey(userId: string | undefined) {
  return ['healthProfile', userId] as const;
}

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
    enabled: !!userId,
  });
}

export function useHealthProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: healthProfileQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as HealthProfileRow | null;
    },
    enabled: !!userId,
  });
}

// Step 1 (Basics) and Step 2 (Lifestyle) both write into `profiles`; each
// upsert only touches the columns for that step, leaving the rest untouched.
export function useUpsertProfile() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (input: ProfileBasicsInput | ProfileLifestyleInput) => {
      if (!userId) throw new Error('No active session');

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...input }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
    },
  });
}

export function useUpsertHealthProfile() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (input: HealthProfileInput) => {
      if (!userId) throw new Error('No active session');

      const { data, error } = await supabase
        .from('health_profiles')
        .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data as HealthProfileRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthProfileQueryKey(userId) });
    },
  });
}

// Consent step (APP_FLOW.md §3.7): records consent_dpdp_at and flips
// onboarding_complete so the root layout can route to Home.
export function useCompleteOnboarding() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (_input: ConsentInput) => {
      if (!userId) throw new Error('No active session');

      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true, consent_dpdp_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
    },
  });
}
