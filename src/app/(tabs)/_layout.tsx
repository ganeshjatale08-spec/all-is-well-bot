import { Activity, Droplet, Moon, Smile, Soup, Stethoscope } from 'lucide-react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import { ActionSheet, type ActionSheetOption } from '../../components/ui/ActionSheet';
import { TabBar } from '../../components/navigation/TabBar';

export default function TabsLayout() {
  const router = useRouter();
  const [quickLogVisible, setQuickLogVisible] = useState(false);

  // APP_FLOW §1: the center ⊕ opens a quick-log action sheet, not a tab.
  const quickLogOptions: ActionSheetOption[] = [
    { key: 'food', label: 'Food', icon: Soup, onPress: () => router.push('/log/food') },
    { key: 'water', label: 'Water', icon: Droplet, onPress: () => router.push('/log/water') },
    { key: 'sleep', label: 'Sleep', icon: Moon, onPress: () => router.push('/log/sleep') },
    { key: 'workout', label: 'Workout', icon: Activity, onPress: () => router.push('/log/workout') },
    { key: 'mood', label: 'Mood', icon: Smile, onPress: () => router.push('/log/mood') },
    { key: 'symptom', label: 'Symptom', icon: Stethoscope, onPress: () => router.push('/log/symptom') },
  ];

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} onPressQuickLog={() => setQuickLogVisible(true)} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="journal" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <ActionSheet
        visible={quickLogVisible}
        onClose={() => setQuickLogVisible(false)}
        title="Quick log"
        options={quickLogOptions}
      />
    </>
  );
}
