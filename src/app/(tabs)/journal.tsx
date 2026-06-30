import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../lib/theme';
import {
  todayDateString,
  useJournalDay,
  type JournalFoodEntry,
} from '../../features/journal/hooks/useDailyLog';
import {
  useDeleteEntry,
  useDeleteWaterEntry,
  useLogSupplement,
} from '../../features/journal/hooks/useLogMutations';
import { sumMacrosByMeal, type MealFoodEntryMacros } from '../../domain/nutrition';
import { MEAL_LABELS, MEAL_OPTIONS, MOOD_LABELS, WORKOUT_LABELS } from '../../constants/enums';

function addDays(dateString: string, delta: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateString: string, today: string): string {
  if (dateString === today) return 'Today';
  if (dateString === addDays(today, -1)) return 'Yesterday';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  const { tokens } = useTheme();
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-body-semibold text-base text-ink">{title}</Text>
      {onAdd ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add ${title.toLowerCase()}`}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken active:bg-hairline"
        >
          <Plus size={16} color={tokens.ink} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function DeleteRowButton({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Remove entry"
      className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-sunken"
    >
      <Trash2 size={16} color={tokens.inkMuted} strokeWidth={2} />
    </Pressable>
  );
}

function MealSection({
  meal,
  entries,
  isToday,
  onAdd,
  onDelete,
}: {
  meal: (typeof MEAL_OPTIONS)[number];
  entries: JournalFoodEntry[];
  isToday: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const totals = sumMacrosByMeal(
    entries.map<MealFoodEntryMacros>((entry) => ({
      meal,
      servings: entry.servings,
      kcal: entry.kcal,
      proteinG: entry.protein_g,
      carbsG: entry.carbs_g,
      fatG: entry.fat_g,
    })),
  )[meal];

  return (
    <Card className="gap-3">
      <SectionHeader title={MEAL_LABELS[meal]} onAdd={isToday ? onAdd : undefined} />
      {entries.length === 0 ? (
        <Text className="font-body text-sm text-ink-muted">No entries yet.</Text>
      ) : (
        <View className="gap-2">
          {entries.map((entry) => (
            <View key={entry.id} className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-body-medium text-sm text-ink">{entry.food_name ?? 'Food'}</Text>
                <Text className="font-body text-xs text-ink-muted">
                  {entry.servings} serving{entry.servings === 1 ? '' : 's'} ·{' '}
                  {Math.round(entry.kcal * entry.servings)} kcal · {Math.round(entry.protein_g * entry.servings)}g
                  protein
                </Text>
              </View>
              {isToday ? <DeleteRowButton onPress={() => onDelete(entry.id)} /> : null}
            </View>
          ))}
        </View>
      )}
      {entries.length > 0 ? (
        <Text className="font-body-medium text-xs text-ink-muted">
          {Math.round(totals.kcal)} kcal · {Math.round(totals.proteinG)}g protein
        </Text>
      ) : null}
    </Card>
  );
}

export default function Journal() {
  const router = useRouter();
  const { tokens } = useTheme();
  const today = todayDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  const { data, isLoading } = useJournalDay(selectedDate);
  const deleteFood = useDeleteEntry('food_entries');
  const deleteWater = useDeleteWaterEntry();
  const deleteWorkout = useDeleteEntry('workout_entries');
  const deleteSymptom = useDeleteEntry('symptom_entries');
  const deleteSupplement = useDeleteEntry('supplement_entries');
  const logSupplement = useLogSupplement();
  const [supplementName, setSupplementName] = useState('');

  const dailyLog = data?.dailyLog ?? null;
  const waterTotal = dailyLog?.water_l ?? 0;
  const foodTotal = (data?.foodEntries ?? []).reduce(
    (sum, entry) => sum + entry.kcal * entry.servings,
    0,
  );

  return (
    <Screen scroll>
      <View className="gap-5">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setSelectedDate((d) => addDays(d, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-sunken"
          >
            <ChevronLeft size={20} color={tokens.ink} strokeWidth={2} />
          </Pressable>
          <Text className="font-display text-lg text-ink">{formatDateLabel(selectedDate, today)}</Text>
          <Pressable
            onPress={() => !isToday && setSelectedDate((d) => addDays(d, 1))}
            disabled={isToday}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            className={`h-11 w-11 items-center justify-center rounded-full active:bg-surface-sunken ${isToday ? 'opacity-30' : ''}`}
          >
            <ChevronRight size={20} color={tokens.ink} strokeWidth={2} />
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator />
        ) : !dailyLog ? (
          <EmptyState
            title="No entries yet"
            description={isToday ? 'Add breakfast to start your score.' : 'Nothing was logged on this day.'}
          />
        ) : (
          <View className="gap-4">
            <Card className="flex-row justify-between">
              <Text className="font-body-medium text-sm text-ink-muted">
                {Math.round(foodTotal)} kcal · {waterTotal.toFixed(1)} L water
              </Text>
              {dailyLog.deterministic_score !== null ? (
                <Text className="font-body-semibold text-sm text-primary">{dailyLog.deterministic_score}/100</Text>
              ) : null}
            </Card>

            {MEAL_OPTIONS.map((meal) => (
              <MealSection
                key={meal}
                meal={meal}
                entries={(data?.foodEntries ?? []).filter((entry) => entry.meal === meal)}
                isToday={isToday}
                onAdd={() => router.push('/log/food')}
                onDelete={(id) => deleteFood.mutate(id)}
              />
            ))}

            <Card className="gap-3">
              <SectionHeader title="Water" onAdd={isToday ? () => router.push('/log/water') : undefined} />
              {(data?.waterEntries ?? []).length === 0 ? (
                <Text className="font-body text-sm text-ink-muted">No entries yet.</Text>
              ) : (
                <View className="gap-2">
                  {(data?.waterEntries ?? []).map((entry) => (
                    <View key={entry.id} className="flex-row items-center justify-between">
                      <Text className="font-body-medium text-sm text-ink">{entry.amount_l.toFixed(2)} L</Text>
                      {isToday ? (
                        <DeleteRowButton
                          onPress={() =>
                            dailyLog &&
                            deleteWater.mutate({ id: entry.id, dailyLogId: dailyLog.id, amountL: entry.amount_l })
                          }
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
              <Text className="font-body-medium text-xs text-ink-muted">{waterTotal.toFixed(1)} L total</Text>
            </Card>

            <Card className="gap-3">
              <SectionHeader title="Workout" onAdd={isToday ? () => router.push('/log/workout') : undefined} />
              {(data?.workoutEntries ?? []).length === 0 ? (
                <Text className="font-body text-sm text-ink-muted">No entries yet.</Text>
              ) : (
                <View className="gap-2">
                  {(data?.workoutEntries ?? []).map((entry) => (
                    <View key={entry.id} className="flex-row items-center justify-between">
                      <Text className="font-body-medium text-sm text-ink">
                        {WORKOUT_LABELS[entry.workout_type as keyof typeof WORKOUT_LABELS] ?? entry.workout_type} ·{' '}
                        {entry.duration_min} min
                      </Text>
                      {isToday ? <DeleteRowButton onPress={() => deleteWorkout.mutate(entry.id)} /> : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <Card className="gap-2">
              <SectionHeader title="Sleep" onAdd={isToday ? () => router.push('/log/sleep') : undefined} />
              <Text className="font-body text-sm text-ink-muted">
                {dailyLog.sleep_hours !== null ? `${dailyLog.sleep_hours} hours` : 'Not logged yet.'}
                {dailyLog.sleep_quality !== null ? ` · quality ${dailyLog.sleep_quality}/10` : ''}
              </Text>
            </Card>

            <Card className="gap-2">
              <SectionHeader title="Mood / Energy / Stress" onAdd={isToday ? () => router.push('/log/mood') : undefined} />
              <Text className="font-body text-sm text-ink-muted">
                {dailyLog.mood
                  ? (MOOD_LABELS[dailyLog.mood as keyof typeof MOOD_LABELS] ?? dailyLog.mood)
                  : 'Not logged yet.'}
                {dailyLog.energy_level !== null ? ` · energy ${dailyLog.energy_level}/10` : ''}
                {dailyLog.stress_level !== null ? ` · stress ${dailyLog.stress_level}/10` : ''}
              </Text>
            </Card>

            <Card className="gap-3">
              <SectionHeader title="Symptoms" onAdd={isToday ? () => router.push('/log/symptom') : undefined} />
              {(data?.symptomEntries ?? []).length === 0 ? (
                <Text className="font-body text-sm text-ink-muted">No entries yet.</Text>
              ) : (
                <View className="gap-2">
                  {(data?.symptomEntries ?? []).map((entry) => (
                    <View key={entry.id} className="flex-row items-center justify-between">
                      <Text className="font-body-medium text-sm text-ink">
                        {entry.symptom}
                        {entry.severity !== null ? ` · severity ${entry.severity}/10` : ''}
                      </Text>
                      {isToday ? <DeleteRowButton onPress={() => deleteSymptom.mutate(entry.id)} /> : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <Card className="gap-3">
              <SectionHeader title="Supplements" />
              {(data?.supplementEntries ?? []).length === 0 ? (
                <Text className="font-body text-sm text-ink-muted">No entries yet.</Text>
              ) : (
                <View className="gap-2">
                  {(data?.supplementEntries ?? []).map((entry) => (
                    <View key={entry.id} className="flex-row items-center justify-between">
                      <Text className="font-body-medium text-sm text-ink">{entry.name}</Text>
                      {isToday ? <DeleteRowButton onPress={() => deleteSupplement.mutate(entry.id)} /> : null}
                    </View>
                  ))}
                </View>
              )}
              {isToday ? (
                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <Input
                      label="Add supplement"
                      value={supplementName}
                      onChangeText={setSupplementName}
                      placeholder="e.g. Vitamin D"
                      onSubmitEditing={() => {
                        if (!supplementName.trim()) return;
                        logSupplement.mutate(supplementName.trim());
                        setSupplementName('');
                      }}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      if (!supplementName.trim()) return;
                      logSupplement.mutate(supplementName.trim());
                      setSupplementName('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Add supplement"
                    className="mt-6 h-11 w-11 items-center justify-center rounded-full bg-primary active:bg-primary-press"
                  >
                    <Plus size={18} color={tokens.surface} strokeWidth={2.5} />
                  </Pressable>
                </View>
              ) : null}
            </Card>
          </View>
        )}
      </View>
    </Screen>
  );
}
