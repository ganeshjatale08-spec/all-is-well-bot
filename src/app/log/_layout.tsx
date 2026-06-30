import { Stack } from 'expo-router';

// All log/* routes are modals over whichever tab triggered them (APP_FLOW §2).
export default function LogLayout() {
  return <Stack screenOptions={{ headerShown: false, presentation: 'modal' }} />;
}
