import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { supabase } from '../../../lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in.');
  return `Bearer ${token}`;
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const auth = await getAuthHeader();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: auth },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to delete account.');
      }
    },
    onSuccess: async () => {
      // Sign out locally after the server-side deletion.
      await supabase.auth.signOut();
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const auth = await getAuthHeader();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/export-data`, {
        method: 'GET',
        headers: { Authorization: auth, Accept: 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to export data.');
      }
      const json = await res.text();

      // Write to a temp file so expo-sharing can offer Save / AirDrop / etc.
      const path = FileSystem.cacheDirectory + 'saathi-data-export.json';
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Save your Saathi data export',
        });
      }
      return path;
    },
  });
}

// Calls supabase.auth.signOut(); the SessionProvider listener clears state.
export function useSignOutAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
