import * as Notifications from 'expo-notifications';

export type TimeOfDay = { hour: number; minute: number };

export type ReminderSettings = {
  morningEnabled: boolean;
  morningTime: TimeOfDay;   // default 07:30
  afternoonEnabled: boolean;
  afternoonTime: TimeOfDay; // default 14:00
  nightEnabled: boolean;
  nightTime: TimeOfDay;     // default 21:00
  quietHoursEnabled: boolean;
  quietStart: TimeOfDay;    // default 22:00
  quietEnd: TimeOfDay;      // default 07:00
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  morningEnabled: true,
  morningTime: { hour: 7, minute: 30 },
  afternoonEnabled: true,
  afternoonTime: { hour: 14, minute: 0 },
  nightEnabled: true,
  nightTime: { hour: 21, minute: 0 },
  quietHoursEnabled: true,
  quietStart: { hour: 22, minute: 0 },
  quietEnd: { hour: 7, minute: 0 },
};

// Identifiers for the three recurring local reminders — cancel and re-create
// rather than updating, since expo-notifications has no update API.
const MORNING_ID = 'saathi-morning';
const AFTERNOON_ID = 'saathi-afternoon';
const NIGHT_ID = 'saathi-night';

function isInQuietHours(time: TimeOfDay, settings: ReminderSettings): boolean {
  if (!settings.quietHoursEnabled) return false;
  const t = time.hour * 60 + time.minute;
  const qs = settings.quietStart.hour * 60 + settings.quietStart.minute;
  const qe = settings.quietEnd.hour * 60 + settings.quietEnd.minute;
  if (qs < qe) return t >= qs && t < qe;           // same-day quiet window
  return t >= qs || t < qe;                         // overnight quiet window
}

// Cancel + recreate all three daily reminders based on current settings.
// Call when the user changes any reminder preference.
export async function scheduleReminders(settings: ReminderSettings): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MORNING_ID).catch(() => null);
  await Notifications.cancelScheduledNotificationAsync(AFTERNOON_ID).catch(() => null);
  await Notifications.cancelScheduledNotificationAsync(NIGHT_ID).catch(() => null);

  if (settings.morningEnabled && !isInQuietHours(settings.morningTime, settings)) {
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_ID,
      content: {
        title: 'Good morning!',
        body: 'Check your daily targets and start strong.',
        data: { type: 'morning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.morningTime.hour,
        minute: settings.morningTime.minute,
      },
    });
  }

  if (settings.afternoonEnabled && !isInQuietHours(settings.afternoonTime, settings)) {
    await Notifications.scheduleNotificationAsync({
      identifier: AFTERNOON_ID,
      content: {
        title: 'Stay on track',
        body: 'Time for water and a short move. You\'re doing great.',
        data: { type: 'afternoon' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.afternoonTime.hour,
        minute: settings.afternoonTime.minute,
      },
    });
  }

  if (settings.nightEnabled && !isInQuietHours(settings.nightTime, settings)) {
    await Notifications.scheduleNotificationAsync({
      identifier: NIGHT_ID,
      content: {
        title: 'Close your day',
        body: 'Log anything you missed. Every entry counts.',
        data: { type: 'night' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.nightTime.hour,
        minute: settings.nightTime.minute,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
