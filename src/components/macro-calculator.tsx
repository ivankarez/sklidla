import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Pressable, ScrollView, Text, TextInput, View } from '@/src/tw';

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
  initialProfile: MacroProfile;
  submitLabel?: string;
  loading?: boolean;
  onCalculated: (result: MacroResult) => void | Promise<void>;
}

export function MacroCalculator({
  isDark,
  initialProfile,
  submitLabel = 'DO THE MATH',
  loading = false,
  onCalculated,
}: MacroCalculatorProps) {
  const [gender, setGender] = useState(initialProfile.gender);
  const [age, setAge] = useState(initialProfile.age);
  const [weight, setWeight] = useState(initialProfile.weight);
  const [height, setHeight] = useState(initialProfile.height);
  const [activityLevel, setActivityLevel] = useState(initialProfile.activityLevel);
  const [goal, setGoal] = useState(initialProfile.goal);
  const [dietaryPreference, setDietaryPreference] = useState(initialProfile.dietaryPreference);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setGender(initialProfile.gender);
    setAge(initialProfile.age);
    setWeight(initialProfile.weight);
    setHeight(initialProfile.height);
    setActivityLevel(initialProfile.activityLevel);
    setGoal(initialProfile.goal);
    setDietaryPreference(initialProfile.dietaryPreference);
  }, [initialProfile]);

  const handleCalculate = async () => {
    if (!age || !weight || !height) {
      Alert.alert('NEED YOUR STATS', 'ADD AGE, WEIGHT, AND HEIGHT TO KEEP GOING.');
      return;
    }
    const a = parseInt(age, 10);
    const w = parseFloat(weight);
    const h = parseFloat(height);

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
        profile: { gender, age, weight, height, activityLevel, goal, dietaryPreference },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerClassName="p-5 pb-10" keyboardShouldPersistTaps="handled">
      <View className="mb-6 border-4 border-black p-4 bg-white shadow-[4px_4px_0px_0px_var(--color-shadow)]">
        <Text className="font-mono text-lg font-black text-black mb-4">BIOMETRICS</Text>

        <View className="flex-row justify-between mb-4">
          <Pressable
            className={`flex-1 mr-1 border-2 border-black py-3 items-center ${gender === 'male' ? 'bg-black' : 'bg-white'}`}
            onPress={() => setGender('male')}
          >
            <Text className={`font-mono text-[10px] font-bold ${gender === 'male' ? 'text-white' : 'text-black'}`}>MALE</Text>
          </Pressable>
          <Pressable
            className={`flex-1 mx-1 border-2 border-black py-3 items-center ${gender === 'nonbinary' ? 'bg-black' : 'bg-white'}`}
            onPress={() => setGender('nonbinary')}
          >
            <Text className={`font-mono text-[10px] font-bold ${gender === 'nonbinary' ? 'text-white' : 'text-black'}`}>OTHER</Text>
          </Pressable>
          <Pressable
            className={`flex-1 ml-1 border-2 border-black py-3 items-center ${gender === 'female' ? 'bg-black' : 'bg-white'}`}
            onPress={() => setGender('female')}
          >
            <Text className={`font-mono text-[10px] font-bold ${gender === 'female' ? 'text-white' : 'text-black'}`}>FEMALE</Text>
          </Pressable>
        </View>

        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <Text className="font-mono text-xs font-bold text-black mb-1">AGE</Text>
            <TextInput
              className="font-mono border-2 border-black bg-white p-3 text-black text-center text-lg"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="YRS"
              placeholderTextColor="#999"
            />
          </View>
          <View className="flex-1 mx-1">
            <Text className="font-mono text-xs font-bold text-black mb-1">WEIGHT</Text>
            <TextInput
              className="font-mono border-2 border-black bg-white p-3 text-black text-center text-lg"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="KG"
              placeholderTextColor="#999"
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="font-mono text-xs font-bold text-black mb-1">HEIGHT</Text>
            <TextInput
              className="font-mono border-2 border-black bg-white p-3 text-black text-center text-lg"
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="CM"
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </View>

      <View className="mb-6">
        <Text className={`font-mono text-lg font-black mb-3 ${isDark ? 'text-white' : 'text-black'}`}>ACTIVITY LEVEL</Text>
        {[
          { id: 'sedentary', label: 'SEDENTARY (LITTLE/NO EXERCISE)' },
          { id: 'light', label: 'LIGHT (1-3 DAYS/WEEK)' },
          { id: 'moderate', label: 'MODERATE (3-5 DAYS/WEEK)' },
          { id: 'active', label: 'ACTIVE (6-7 DAYS/WEEK)' },
          { id: 'very_active', label: 'VERY ACTIVE (PHYSICAL JOB)' },
        ].map((act) => (
          <Pressable
            key={act.id}
            className={`border-2 border-black p-3 mb-2 flex-row justify-between items-center ${activityLevel === act.id ? 'bg-black' : 'bg-white'}`}
            onPress={() => setActivityLevel(act.id)}
          >
            <Text className={`font-mono font-bold text-sm ${activityLevel === act.id ? 'text-white' : 'text-black'}`}>
              {act.label}
            </Text>
            {activityLevel === act.id && <Ionicons name="checkmark-sharp" size={20} color="white" />}
          </Pressable>
        ))}
      </View>

      <View className="mb-6">
        <Text className={`font-mono text-lg font-black mb-3 ${isDark ? 'text-white' : 'text-black'}`}>MAIN GOAL</Text>
        {[
          { id: 'cut', label: 'CUT (LOSE)' },
          { id: 'maintain', label: 'MAINTAIN' },
          { id: 'bulk', label: 'BULK (GAIN)' },
        ].map((item) => (
          <Pressable
            key={item.id}
            className={`border-4 border-black p-4 mb-3 items-center ${goal === item.id ? 'bg-black' : 'bg-white'}`}
            onPress={() => setGoal(item.id)}
          >
            <Text className={`font-mono text-lg font-black tracking-widest ${goal === item.id ? 'text-white' : 'text-black'}`}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-8">
        <Text className={`font-mono text-lg font-black mb-3 ${isDark ? 'text-white' : 'text-black'}`}>EATING STYLE</Text>
        {[
          { id: 'meathead', label: 'STANDARD' },
          { id: 'keto', label: 'KETO' },
          { id: 'sugar_hater', label: 'LOWER CARB' },
          { id: 'carb_loader', label: 'HIGHER CARB' },
        ].map((diet) => (
          <Pressable
            key={diet.id}
            className={`border-2 border-black p-3 mb-2 flex-row justify-between items-center ${dietaryPreference === diet.id ? 'bg-black' : 'bg-white'}`}
            onPress={() => setDietaryPreference(diet.id)}
          >
            <Text className={`font-mono font-bold text-sm ${dietaryPreference === diet.id ? 'text-white' : 'text-black'}`}>
              {diet.label}
            </Text>
            {dietaryPreference === diet.id && <Ionicons name="checkmark-sharp" size={20} color="white" />}
          </Pressable>
        ))}
      </View>

      <Pressable
        className={`bg-black py-6 items-center justify-center mb-4 border-4 border-black ${loading || isSubmitting ? 'opacity-70' : ''}`}
        onPress={handleCalculate}
        disabled={loading || isSubmitting}
      >
        <Text className="font-mono text-2xl font-black text-white tracking-widest">{submitLabel}</Text>
      </Pressable>

      <Text className={`font-mono text-xs text-center px-2 leading-5 uppercase mb-4 ${isDark ? 'text-white' : 'text-black'}`}>
        BUILT ON{' '}
        <Text
          className="underline"
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
