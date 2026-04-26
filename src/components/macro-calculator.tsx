import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Pressable, ScrollView, Text, TextInput, View } from '@/src/tw';
import {
  formatHeightInputFromMetricString,
  formatWeightInputFromMetricString,
  getHeightUnitLabel,
  getWeightUnitLabel,
  normalizeHeightInputToMetricString,
  normalizeWeightInputToMetricString,
  type MeasurementSystem,
} from '@/utils/measurements';

export interface MacroProfile {
  gender: string;
  age: string;
  weight: string;
  height: string;
  activityLevel: string;
  goal: string;
  dietaryPreference: string;
}

export interface MacroResult {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  profile: MacroProfile;
}

interface MacroCalculatorProps {
  isDark: boolean;
  measurementSystem: MeasurementSystem;
  initialProfile: MacroProfile;
  submitLabel?: string;
  loading?: boolean;
  onCalculated: (result: MacroResult) => void | Promise<void>;
}

export function MacroCalculator({
  isDark,
  measurementSystem,
  initialProfile,
  submitLabel = 'DO THE MATH',
  loading = false,
  onCalculated,
}: MacroCalculatorProps) {
  const [gender, setGender] = useState(initialProfile.gender);
  const [age, setAge] = useState(initialProfile.age);
  const [weight, setWeight] = useState(
    formatWeightInputFromMetricString(initialProfile.weight, measurementSystem)
  );
  const [height, setHeight] = useState(
    formatHeightInputFromMetricString(initialProfile.height, measurementSystem)
  );
  const [activityLevel, setActivityLevel] = useState(initialProfile.activityLevel);
  const [goal, setGoal] = useState(initialProfile.goal);
  const [dietaryPreference, setDietaryPreference] = useState(initialProfile.dietaryPreference);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textColor = isDark ? '#FFFFFF' : '#000000';
  const borderColor = isDark ? '#FFFFFF' : '#000000';
  const panelBg = isDark ? '#000000' : '#FFFFFF';
  const selectedBg = isDark ? '#FFFFFF' : '#000000';
  const selectedText = isDark ? '#000000' : '#FFFFFF';
  const unselectedBg = isDark ? '#000000' : '#FFFFFF';
  const unselectedText = isDark ? '#FFFFFF' : '#000000';
  const inputBg = isDark ? '#000000' : '#FFFFFF';
  const inputText = isDark ? '#FFFFFF' : '#000000';
  const inputPlaceholder = isDark ? '#777777' : '#999999';
  const checkmarkColor = isDark ? '#000000' : '#FFFFFF';
  const shadowColor = isDark ? '#FFFFFF' : '#000000';

  useEffect(() => {
    setGender(initialProfile.gender);
    setAge(initialProfile.age);
    setWeight(formatWeightInputFromMetricString(initialProfile.weight, measurementSystem));
    setHeight(formatHeightInputFromMetricString(initialProfile.height, measurementSystem));
    setActivityLevel(initialProfile.activityLevel);
    setGoal(initialProfile.goal);
    setDietaryPreference(initialProfile.dietaryPreference);
  }, [initialProfile, measurementSystem]);

  const handleCalculate = async () => {
    if (!age || !weight || !height) {
      Alert.alert('NEED YOUR STATS', 'ADD AGE, WEIGHT, AND HEIGHT TO KEEP GOING.');
      return;
    }
    const a = parseInt(age, 10);
    const metricWeight = normalizeWeightInputToMetricString(weight, measurementSystem);
    const metricHeight = normalizeHeightInputToMetricString(height, measurementSystem);
    const w = parseFloat(metricWeight);
    const h = parseFloat(metricHeight);

    if (isNaN(a) || isNaN(w) || isNaN(h)) {
      Alert.alert('THOSE NUMBERS LOOK OFF', 'USE NUMBERS ONLY.');
      return;
    }

    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    if (gender === 'male') {
      bmr += 5;
    } else if (gender === 'female') {
      bmr -= 161;
    } else {
      bmr -= 78;
    }

    let multiplier = 1.2;
    if (activityLevel === 'light') multiplier = 1.375;
    if (activityLevel === 'moderate') multiplier = 1.55;
    if (activityLevel === 'active') multiplier = 1.725;
    if (activityLevel === 'very_active') multiplier = 1.9;

    let tdee = bmr * multiplier;
    if (goal === 'cut') tdee -= 500;
    if (goal === 'bulk') tdee += 500;

    const calories = Math.round(tdee);

    let protein = 0;
    let fats = 0;
    let carbs = 0;

    if (dietaryPreference === 'meathead') {
      protein = Math.round(w * 2.2);
      fats = Math.round((calories * 0.25) / 9);
      carbs = Math.round((calories - (protein * 4) - (fats * 9)) / 4);
    } else if (dietaryPreference === 'keto') {
      carbs = 30;
      protein = Math.round(w * 1.8);
      fats = Math.round((calories - (protein * 4) - (carbs * 4)) / 9);
    } else if (dietaryPreference === 'sugar_hater') {
      carbs = Math.round((calories * 0.20) / 4);
      protein = Math.round(w * 2.2);
      fats = Math.round((calories - (protein * 4) - (carbs * 4)) / 9);
    } else if (dietaryPreference === 'carb_loader') {
      protein = Math.round(w * 2.2);
      fats = Math.round((calories * 0.20) / 9);
      carbs = Math.round((calories - (protein * 4) - (fats * 9)) / 4);
    }

    if (carbs < 0) carbs = 0;
    if (fats < 0) fats = 0;

    setIsSubmitting(true);
    try {
        await onCalculated({
          calories,
          protein,
          carbs,
          fats,
          profile: {
            gender,
            age,
            weight: metricWeight,
            height: metricHeight,
            activityLevel,
            goal,
            dietaryPreference,
          },
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  const weightUnitLabel = getWeightUnitLabel(measurementSystem);
  const heightUnitLabel = getHeightUnitLabel(measurementSystem);

  return (
    <ScrollView contentContainerClassName="p-5 pb-10" keyboardShouldPersistTaps="handled">
      <View
        className="mb-6 border-4 p-4 shadow-[4px_4px_0px_0px_var(--color-shadow)]"
        style={{ borderColor, backgroundColor: panelBg, shadowColor }}
      >
        <Text className="font-mono text-lg font-black mb-4" style={{ color: textColor }}>BIOMETRICS</Text>

        <View className="flex-row justify-between mb-4">
          <Pressable
            className="flex-1 mr-1 border-2 py-3 items-center"
            style={{
              borderColor,
              backgroundColor: gender === 'male' ? selectedBg : unselectedBg,
            }}
            onPress={() => setGender('male')}
          >
            <Text
              className="font-mono text-[10px] font-bold"
              style={{ color: gender === 'male' ? selectedText : unselectedText }}
            >
              MALE
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 mx-1 border-2 py-3 items-center"
            style={{
              borderColor,
              backgroundColor: gender === 'nonbinary' ? selectedBg : unselectedBg,
            }}
            onPress={() => setGender('nonbinary')}
          >
            <Text
              className="font-mono text-[10px] font-bold"
              style={{ color: gender === 'nonbinary' ? selectedText : unselectedText }}
            >
              OTHER
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 ml-1 border-2 py-3 items-center"
            style={{
              borderColor,
              backgroundColor: gender === 'female' ? selectedBg : unselectedBg,
            }}
            onPress={() => setGender('female')}
          >
            <Text
              className="font-mono text-[10px] font-bold"
              style={{ color: gender === 'female' ? selectedText : unselectedText }}
            >
              FEMALE
            </Text>
          </Pressable>
        </View>

        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <Text className="font-mono text-xs font-bold mb-1" style={{ color: textColor }}>AGE</Text>
            <TextInput
              className="font-mono border-2 p-3 text-center text-lg"
              style={{ borderColor, backgroundColor: inputBg, color: inputText }}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="YRS"
              placeholderTextColor={inputPlaceholder}
            />
          </View>
          <View className="flex-1 mx-1">
            <Text className="font-mono text-xs font-bold mb-1" style={{ color: textColor }}>
              WEIGHT ({weightUnitLabel})
            </Text>
            <TextInput
              className="font-mono border-2 p-3 text-center text-lg"
              style={{ borderColor, backgroundColor: inputBg, color: inputText }}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder={measurementSystem === 'metric' ? 'KG' : 'LB'}
              placeholderTextColor={inputPlaceholder}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="font-mono text-xs font-bold mb-1" style={{ color: textColor }}>
              HEIGHT ({heightUnitLabel})
            </Text>
            <TextInput
              className="font-mono border-2 p-3 text-center text-lg"
              style={{ borderColor, backgroundColor: inputBg, color: inputText }}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder={measurementSystem === 'metric' ? 'CM' : 'IN'}
              placeholderTextColor={inputPlaceholder}
            />
          </View>
        </View>
      </View>

      <View className="mb-6">
        <Text className="font-mono text-lg font-black mb-3" style={{ color: textColor }}>ACTIVITY LEVEL</Text>
        {[
          { id: 'sedentary', label: 'SEDENTARY (LITTLE/NO EXERCISE)' },
          { id: 'light', label: 'LIGHT (1-3 DAYS/WEEK)' },
          { id: 'moderate', label: 'MODERATE (3-5 DAYS/WEEK)' },
          { id: 'active', label: 'ACTIVE (6-7 DAYS/WEEK)' },
          { id: 'very_active', label: 'VERY ACTIVE (PHYSICAL JOB)' },
        ].map((act) => (
          <Pressable
            key={act.id}
            className="border-2 p-3 mb-2 flex-row justify-between items-center"
            style={{
              borderColor,
              backgroundColor: activityLevel === act.id ? selectedBg : unselectedBg,
            }}
            onPress={() => setActivityLevel(act.id)}
          >
            <Text
              className="font-mono font-bold text-sm"
              style={{ color: activityLevel === act.id ? selectedText : unselectedText }}
            >
              {act.label}
            </Text>
            {activityLevel === act.id && <Ionicons name="checkmark-sharp" size={20} color={checkmarkColor} />}
          </Pressable>
        ))}
      </View>

      <View className="mb-6">
        <Text className="font-mono text-lg font-black mb-3" style={{ color: textColor }}>MAIN GOAL</Text>
        {[
          { id: 'cut', label: 'CUT (LOSE)' },
          { id: 'maintain', label: 'MAINTAIN' },
          { id: 'bulk', label: 'BULK (GAIN)' },
        ].map((item) => (
          <Pressable
            key={item.id}
            className="border-4 p-4 mb-3 items-center"
            style={{
              borderColor,
              backgroundColor: goal === item.id ? selectedBg : unselectedBg,
            }}
            onPress={() => setGoal(item.id)}
          >
            <Text
              className="font-mono text-lg font-black tracking-widest"
              style={{ color: goal === item.id ? selectedText : unselectedText }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-8">
        <Text className="font-mono text-lg font-black mb-3" style={{ color: textColor }}>EATING STYLE</Text>
        {[
          { id: 'meathead', label: 'STANDARD' },
          { id: 'keto', label: 'KETO' },
          { id: 'sugar_hater', label: 'LOWER CARB' },
          { id: 'carb_loader', label: 'HIGHER CARB' },
        ].map((diet) => (
          <Pressable
            key={diet.id}
            className="border-2 p-3 mb-2 flex-row justify-between items-center"
            style={{
              borderColor,
              backgroundColor: dietaryPreference === diet.id ? selectedBg : unselectedBg,
            }}
            onPress={() => setDietaryPreference(diet.id)}
          >
            <Text
              className="font-mono font-bold text-sm"
              style={{ color: dietaryPreference === diet.id ? selectedText : unselectedText }}
            >
              {diet.label}
            </Text>
            {dietaryPreference === diet.id && <Ionicons name="checkmark-sharp" size={20} color={checkmarkColor} />}
          </Pressable>
        ))}
      </View>

      <Pressable
        className={`py-6 items-center justify-center mb-4 border-4 ${loading || isSubmitting ? 'opacity-70' : ''}`}
        style={{ backgroundColor: selectedBg, borderColor }}
        onPress={handleCalculate}
        disabled={loading || isSubmitting}
      >
        <Text className="font-mono text-2xl font-black tracking-widest" style={{ color: selectedText }}>
          {submitLabel}
        </Text>
      </Pressable>

      <Text className="font-mono text-xs text-center px-2 leading-5 uppercase mb-4" style={{ color: textColor }}>
        BUILT ON{' '}
        <Text
          className="underline"
          style={{ color: textColor }}
          onPress={() =>
            Alert.alert(
              'THE SCIENCE',
              'The Mifflin-St Jeor equation (1990) is widely considered the most accurate predictive equation for basal metabolic rate (BMR) in healthy adults.\n\nIt forms the baseline for your calorie targets before activity multipliers and goals are applied. Your protein is calculated at 2.2g/kg (1g/lb) to help preserve muscle during a cut and support growth during a bulk.\n\nThe vibe is weird. The math is standard.'
            )
          }
        >
          MIFFLIN-ST JEOR MATHEMATICS
        </Text>
        .
      </Text>
    </ScrollView>
  );
}
