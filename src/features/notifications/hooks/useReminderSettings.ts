import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_REMINDER_SETTINGS,
  scheduleReminders,
  type ReminderSettings,
} from '../lib/schedule';

const STORAGE_KEY = 'saathi:reminder_settings';

async function loadSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

async function saveSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setIsLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<ReminderSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
    await scheduleReminders(next);
  }, [settings]);

  return { settings, updateSettings, isLoaded };
}
