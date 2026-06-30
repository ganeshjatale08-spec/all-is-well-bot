import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';

export type FoodRow = {
  id: string;
  name: string;
  name_hi: string | null;
  serving_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const MIN_QUERY_LENGTH = 2;

// Fuzzy-ish search over the curated foods catalog (name + Hindi name),
// Indian foods first (UI_UX_DESIGN §4 "Food log"). pg_trgm GIN indexes on
// both columns back the ilike scan (BACKEND_SCHEMA §4).
export function useFoodSearch(query: string) {
  // Comma/parens are syntax-significant in PostgREST's `or` filter string —
  // strip them so user input can't alter the filter structure.
  const trimmed = query.trim().replace(/[,()]/g, '');

  return useQuery({
    queryKey: ['foodSearch', trimmed],
    queryFn: async (): Promise<FoodRow[]> => {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, name_hi, serving_label, kcal, protein_g, carbs_g, fat_g')
        .or(`name.ilike.%${trimmed}%,name_hi.ilike.%${trimmed}%`)
        .order('is_indian', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as FoodRow[];
    },
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
}
