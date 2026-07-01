import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { Card } from '../../../components/ui/Card';
import { useTheme } from '../../../lib/theme';
import { useReminderSettings } from '../../../features/notifications/hooks/useReminderSettings';
import type { TimeOfDay } from '../../../features/notifications/lib/schedule';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(t: TimeOfDay) {
  return `${pad(t.hour)}:${pad(t.minute)}`;
}

// Simple inline time picker using +/- buttons (no native picker dep needed).
function TimePicker({ value, onChange }: { value: TimeOfDay; onChange: (t: TimeOfDay) => void }) {
  const { tokens } = useTheme();

  function adjustHour(delta: number) {
    onChange({ ...value, hour: (value.hour + delta + 24) % 24 });
  }
  function adjustMinute(delta: number) {
    const raw = value.minute + delta;
    const next = raw < 0 ? 45 : raw >= 60 ? 0 : raw;
    onChange({ ...value, minute: next });
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Pressable
        onPress={() => adjustHour(-1)}
        style={{ paddingHorizontal: 8, paddingVertical: 4, minWidth: 32, alignItems: 'center' }}
        accessibilityRole="button"
        accessibilityLabel="Decrease hour"
      >
        <Text style={{ color: tokens.primary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18 }}>−</Text>
      </Pressable>
      <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: tokens.ink, minWidth: 48, textAlign: 'center' }}>
        {formatTime(value)}
      </Text>
      <Pressable
        onPress={() => adjustHour(1)}
        style={{ paddingHorizontal: 8, paddingVertical: 4, minWidth: 32, alignItems: 'center' }}
        accessibilityRole="button"
        accessibilityLabel="Increase hour"
      >
        <Text style={{ color: tokens.primary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18 }}>+</Text>
      </Pressable>
      <Pressable
        onPress={() => adjustMinute(-15)}
        style={{ paddingHorizontal: 8, paddingVertical: 4, minWidth: 32, alignItems: 'center' }}
        accessibilityRole="button"
        accessibilityLabel="Decrease minutes by 15"
      >
        <Text style={{ color: tokens.inkMuted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18 }}>−</Text>
      </Pressable>
      <Pressable
        onPress={() => adjustMinute(15)}
        style={{ paddingHorizontal: 8, paddingVertical: 4, minWidth: 32, alignItems: 'center' }}
        accessibilityRole="button"
        accessibilityLabel="Increase minutes by 15"
      >
        <Text style={{ color: tokens.inkMuted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18 }}>+</Text>
      </Pressable>
    </View>
  );
}

type ReminderRowProps = {
  label: string;
  description: string;
  enabled: boolean;
  time: TimeOfDay;
  onToggle: (v: boolean) => void;
  onTimeChange: (t: TimeOfDay) => void;
};

function ReminderRow({ label, description, enabled, time, onToggle, onTimeChange }: ReminderRowProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text className="font-body-semibold text-sm text-ink">{label}</Text>
          <Text className="font-body text-xs text-ink-muted">{description}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: tokens.primary }}
          accessibilityLabel={`${label} reminder toggle`}
        />
      </View>
      {enabled ? <TimePicker value={time} onChange={onTimeChange} /> : null}
    </View>
  );
}

export default function RemindersScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { settings, updateSettings, isLoaded } = useReminderSettings();

  async function checkPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Notifications off',
        'Enable notifications in your device settings for reminders to work.',
      );
    }
  }

  if (!isLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.canvas }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.canvas }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={tokens.ink} strokeWidth={2} />
        </Pressable>
        <Text className="font-body-semibold text-base text-ink">Reminders</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-body text-sm text-ink-muted">
          Reminders only fire when they&apos;re actionable — we won&apos;t nag.
        </Text>

        <Card className="gap-4">
          <ReminderRow
            label="Morning"
            description="Daily targets + a motivational nudge"
            enabled={settings.morningEnabled}
            time={settings.morningTime}
            onToggle={(v) => { updateSettings({ morningEnabled: v }); checkPermission(); }}
            onTimeChange={(t) => updateSettings({ morningTime: t })}
          />
          <View style={{ height: 1, backgroundColor: tokens.hairline }} />
          <ReminderRow
            label="Afternoon"
            description="Water and movement check-in"
            enabled={settings.afternoonEnabled}
            time={settings.afternoonTime}
            onToggle={(v) => { updateSettings({ afternoonEnabled: v }); checkPermission(); }}
            onTimeChange={(t) => updateSettings({ afternoonTime: t })}
          />
          <View style={{ height: 1, backgroundColor: tokens.hairline }} />
          <ReminderRow
            label="Night"
            description="Close your day — log anything missed"
            enabled={settings.nightEnabled}
            time={settings.nightTime}
            onToggle={(v) => { updateSettings({ nightEnabled: v }); checkPermission(); }}
            onTimeChange={(t) => updateSettings({ nightTime: t })}
          />
        </Card>

        <Card className="gap-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text className="font-body-semibold text-sm text-ink">Quiet hours</Text>
              <Text className="font-body text-xs text-ink-muted">
                No reminders in this window ({formatTime(settings.quietStart)} – {formatTime(settings.quietEnd)})
              </Text>
            </View>
            <Switch
              value={settings.quietHoursEnabled}
              onValueChange={(v) => updateSettings({ quietHoursEnabled: v })}
              trackColor={{ true: tokens.primary }}
              accessibilityLabel="Quiet hours toggle"
            />
          </View>
          {settings.quietHoursEnabled ? (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text className="font-body text-xs text-ink-muted">Quiet from</Text>
                <TimePicker value={settings.quietStart} onChange={(t) => updateSettings({ quietStart: t })} />
              </View>
              <View style={{ gap: 4 }}>
                <Text className="font-body text-xs text-ink-muted">Quiet until</Text>
                <TimePicker value={settings.quietEnd} onChange={(t) => updateSettings({ quietEnd: t })} />
              </View>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
