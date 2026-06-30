import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Stepper } from '../../components/ui/Stepper';
import { Card } from '../../components/ui/Card';
import { OptionPicker } from '../../components/ui/OptionPicker';
import { LogSheetHeader } from '../../features/journal/components/LogSheetHeader';
import { useFoodSearch, type FoodRow } from '../../features/journal/hooks/useFoodSearch';
import { useLogCustomFood, useLogFoodFromDb } from '../../features/journal/hooks/useLogMutations';
import { foodCustomEntrySchema } from '../../schemas/journal';
import { MEAL_LABELS, MEAL_OPTIONS } from '../../constants/enums';

const mealOptions = MEAL_OPTIONS.map((value) => ({ value, label: MEAL_LABELS[value] }));
const customFormSchema = foodCustomEntrySchema.omit({ meal: true });
type CustomFormInput = z.infer<typeof customFormSchema>;

export default function LogFood() {
  const router = useRouter();
  const [meal, setMeal] = useState<(typeof MEAL_OPTIONS)[number] | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodRow | null>(null);
  const [servings, setServings] = useState(1);
  const [customMode, setCustomMode] = useState(false);
  const [mealError, setMealError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isFetching } = useFoodSearch(debouncedQuery);
  const logFoodFromDb = useLogFoodFromDb();
  const logCustomFood = useLogCustomFood();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomFormInput>({
    resolver: zodResolver(customFormSchema),
    defaultValues: { custom_name: '', kcal: undefined, protein_g: undefined, carbs_g: undefined, fat_g: undefined },
  });

  const requireMeal = (): boolean => {
    if (!meal) {
      setMealError('Choose a meal first');
      return false;
    }
    setMealError(undefined);
    return true;
  };

  const onAddSelectedFood = () => {
    if (!requireMeal() || !selectedFood || !meal) return;
    logFoodFromDb.mutate({
      meal,
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      servings,
      kcal: selectedFood.kcal,
      protein_g: selectedFood.protein_g,
      carbs_g: selectedFood.carbs_g,
      fat_g: selectedFood.fat_g,
    });
    router.back();
  };

  const onSubmitCustom = handleSubmit((values) => {
    if (!requireMeal() || !meal) return;
    logCustomFood.mutate({ ...values, meal });
    router.back();
  });

  return (
    <Screen scroll>
      <View className="flex-1 gap-6">
        <LogSheetHeader title="Log food" onClose={() => router.back()} />

        <OptionPicker label="Meal" options={mealOptions} value={meal} onChange={setMeal} error={mealError} />

        {!selectedFood && !customMode ? (
          <View className="gap-3">
            <Input
              label="Search foods"
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. dal, roti, paneer"
              autoCapitalize="none"
            />
            {isFetching ? <ActivityIndicator /> : null}
            <View className="gap-2">
              {(results ?? []).map((food) => (
                <Card key={food.id} onPress={() => setSelectedFood(food)} accessibilityLabel={`Add ${food.name}`}>
                  <Text className="font-body-semibold text-base text-ink">{food.name}</Text>
                  <Text className="font-body text-sm text-ink-muted">
                    {food.serving_label} · {Math.round(food.kcal)} kcal · {food.protein_g}g protein
                  </Text>
                </Card>
              ))}
            </View>
            <Pressable
              onPress={() => setCustomMode(true)}
              accessibilityRole="button"
              accessibilityLabel="Can't find it? Add a custom entry"
              className="h-11 items-center justify-center"
            >
              <Text className="font-body-medium text-sm text-primary">Can&apos;t find it? Add custom</Text>
            </Pressable>
          </View>
        ) : null}

        {selectedFood ? (
          <View className="gap-4">
            <Card>
              <Text className="font-body-semibold text-base text-ink">{selectedFood.name}</Text>
              <Text className="font-body text-sm text-ink-muted">{selectedFood.serving_label}</Text>
            </Card>
            <Stepper label="Servings" value={servings} onChange={setServings} min={0.5} max={10} step={0.5} />
            <Text className="font-body text-sm text-ink-muted">
              ≈ {Math.round(selectedFood.kcal * servings)} kcal · {Math.round(selectedFood.protein_g * servings)}g
              protein
            </Text>
            <Pressable
              onPress={() => setSelectedFood(null)}
              accessibilityRole="button"
              accessibilityLabel="Choose a different food"
              className="h-11 items-center justify-center"
            >
              <Text className="font-body-medium text-sm text-primary">Choose a different food</Text>
            </Pressable>
            <Button label="Add to today" onPress={onAddSelectedFood} />
          </View>
        ) : null}

        {customMode ? (
          <View className="gap-4">
            <Controller
              control={control}
              name="custom_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.custom_name?.message}
                  autoCapitalize="words"
                />
              )}
            />
            <Controller
              control={control}
              name="kcal"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Calories (kcal)"
                  value={value === undefined ? '' : String(value)}
                  onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                  onBlur={onBlur}
                  error={errors.kcal?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="protein_g"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Protein (g)"
                  value={value === undefined ? '' : String(value)}
                  onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                  onBlur={onBlur}
                  error={errors.protein_g?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="carbs_g"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Carbs (g)"
                  value={value === undefined ? '' : String(value)}
                  onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                  onBlur={onBlur}
                  error={errors.carbs_g?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="fat_g"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Fat (g)"
                  value={value === undefined ? '' : String(value)}
                  onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                  onBlur={onBlur}
                  error={errors.fat_g?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />
            <Pressable
              onPress={() => setCustomMode(false)}
              accessibilityRole="button"
              accessibilityLabel="Back to search"
              className="h-11 items-center justify-center"
            >
              <Text className="font-body-medium text-sm text-primary">Back to search</Text>
            </Pressable>
            <Button label="Add to today" onPress={onSubmitCustom} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
