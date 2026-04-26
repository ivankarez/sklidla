import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { getMeasurementSystem, saveMacroGoals, saveMeasurementSystem, saveUserProfile } from '@/db/dao';
import { Pressable, Text, View } from '@/src/tw';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MacroCalculator } from '@/src/components/macro-calculator';
import { type MeasurementSystem } from '@/utils/measurements';

export default function MacroSetupScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [saving, setSaving] = useState(false);
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('metric');
  const screenBg = isDark ? '#000000' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const borderColor = isDark ? '#FFFFFF' : '#000000';
  const dividerBg = isDark ? '#FFFFFF' : '#000000';
  const buttonBg = isDark ? '#FFFFFF' : '#000000';
  const buttonText = isDark ? '#000000' : '#FFFFFF';

  useEffect(() => {
    async function loadMeasurementSystem() {
      const nextMeasurementSystem = await getMeasurementSystem();
      setMeasurementSystem(nextMeasurementSystem);
    }

    void loadMeasurementSystem();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={['top', 'bottom']}>
      <View className="py-4 px-5 border-b-4" style={{ borderColor }}>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-mono text-2xl font-black tracking-widest" style={{ color: textColor }}>MATH SCREEN</Text>
          <Pressable
            onPress={() => router.back()}
            className="px-3 py-1.5 border-2"
            style={{
              backgroundColor: buttonBg,
              borderColor,
            }}
          >
            <Text className="font-mono text-xs font-black" style={{ color: buttonText }}>BACK</Text>
          </Pressable>
        </View>
        <Text className="font-mono text-xs font-bold leading-4.5" style={{ color: textColor }}>
          TELL US ABOUT YOUR BODY AND GOALS. WE&apos;LL DO THE MATH YOU DON&apos;T WANT TO.
        </Text>
        <View className="flex-row mt-4">
          {[
            { id: 'metric', label: 'METRIC' },
            { id: 'imperial', label: 'IMPERIAL' },
          ].map((option, index) => (
            <Pressable
              key={option.id}
              onPress={() => setMeasurementSystem(option.id as MeasurementSystem)}
              className={`flex-1 border-2 py-2 items-center ${index === 0 ? 'mr-2' : ''}`}
              style={{
                borderColor,
                backgroundColor: measurementSystem === option.id ? buttonBg : screenBg,
              }}
            >
              <Text
                className="font-mono text-xs font-black"
                style={{ color: measurementSystem === option.id ? buttonText : textColor }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center mt-3 gap-2">
          <View className="w-8 h-2 opacity-25" style={{ backgroundColor: dividerBg }} />
          <View className="w-8 h-2" style={{ backgroundColor: dividerBg }} />
          <View className="w-8 h-2 opacity-25" style={{ backgroundColor: dividerBg }} />
        </View>
      </View>

      <MacroCalculator
        isDark={isDark}
        measurementSystem={measurementSystem}
        loading={saving}
        submitLabel="LOCK MACROS"
        initialProfile={{
          gender: 'nonbinary',
          age: '',
          weight: '',
          height: '',
          activityLevel: 'sedentary',
          goal: 'maintain',
          dietaryPreference: 'meathead',
        }}
        onCalculated={async ({ calories, protein, carbs, fats, profile }) => {
          setSaving(true);
          try {
            await Promise.all([
              saveMacroGoals({
                calories: calories.toString(),
                protein: protein.toString(),
                carbs: carbs.toString(),
                fats: fats.toString(),
              }),
              saveMeasurementSystem(measurementSystem),
              saveUserProfile(profile, { recordWeightHistory: true }),
            ]);
            router.push('/onboarding/ai-setup');
          } finally {
            setSaving(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
