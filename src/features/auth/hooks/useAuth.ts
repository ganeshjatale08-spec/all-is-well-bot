import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../../../lib/supabase';
import type { SignInInput, SignUpInput } from '../../../schemas/auth';

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ email, password }: SignUpInput) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInInput) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}

// Supabase's default `flowType` is 'implicit': the redirect URL carries the
// session as a `#access_token=...&refresh_token=...` fragment, not a query
// string, so `Linking.parse` (which only reads `URL.searchParams`) can't see
// it. Parse the fragment by hand instead.
function parseFragmentParams(url: string): Record<string, string> {
  const fragment = url.split('#')[1];
  if (!fragment) return {};

  return Object.fromEntries(
    fragment.split('&').map((pair) => {
      const [key, value = ''] = pair.split('=');
      return [decodeURIComponent(key), decodeURIComponent(value)];
    }),
  );
}

export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async () => {
      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        return null;
      }

      const fragmentParams = parseFragmentParams(result.url);
      if (fragmentParams.error) {
        throw new Error(fragmentParams.error_description ?? fragmentParams.error);
      }

      const accessToken = fragmentParams.access_token;
      const refreshToken = fragmentParams.refresh_token;
      if (!accessToken || !refreshToken) {
        throw new Error('Google sign-in did not return a session.');
      }

      const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setSessionError) throw setSessionError;
      return sessionData;
    },
  });
}
