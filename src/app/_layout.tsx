import '../../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { queryClient } from '../lib/queryClient';
import { asyncStoragePersister } from '../lib/persister';
import { setupNetworkListener } from '../lib/network';
import { configurePurchases } from '../lib/revenuecat';
import { SessionProvider, useSession } from '../features/auth/SessionProvider';
import { useProfile } from '../features/onboarding/hooks/useProfile';
import { registerJournalMutationDefaults } from '../features/journal/hooks/useLogMutations';
import { Toast } from '../components/ui/Toast';

SplashScreen.preventAutoHideAsync();

// Must run before PersistQueryClientProvider resumes paused mutations on
// rehydration — restored mutations have no component-supplied mutationFn
// and rely entirely on these registered defaults (TRD §7).
registerJournalMutationDefaults();

// Configure RevenueCat once at module load (before any session). logIn() is
// called from SessionProvider after the user authenticates (Phase 6).
configurePurchases();

function RootNavigator() {
  const { session, isLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (isLoading || (!!session && profileLoading)) {
    return null;
  }

  const onboardingComplete = !!profile?.onboarding_complete;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !onboardingComplete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && onboardingComplete}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="report/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => setupNetworkListener(), []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      <SessionProvider>
        <RootNavigator />
        <Toast />
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}
