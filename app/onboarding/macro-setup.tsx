import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { setSetting } from '@/db/dao';
import { Pressable, Text, View } from '@/src/tw';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MacroCalculator } from '@/src/components/macro-calculator';

export default function MacroSetupScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [saving, setSaving] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} edges={['top', 'bottom']}>
      <View className={`py-4 px-5 border-b-4 ${isDark ? 'border-white' : 'border-black'}`}>
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`font-mono text-2xl font-black tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>MATH SCREEN</Text>
          <Pressable
            onPress={() => router.back()}
            className="px-3 py-1.5 border-2"
            style={{
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
              borderColor: isDark ? '#FFFFFF' : '#000000',
            }}
          >
            <Text className={`font-mono text-xs font-black ${isDark ? 'text-black' : 'text-white'}`}>BACK</Text>
          </Pressable>
        </View>
        <Text className={`font-mono text-xs font-bold leading-4.5 ${isDark ? 'text-white' : 'text-black'}`}>
          TELL US ABOUT YOUR BODY AND GOALS. WE&apos;LL DO THE MATH YOU DON&apos;T WANT TO.
        </Text>
        <View className="flex-row items-center mt-3 gap-2">
          <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'} opacity-25`} />
          <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'}`} />
          <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'} opacity-25`} />
        </View>
      </View>

      <MacroCalculator
        isDark={isDark}
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
            await setSetting('goal_calories', calories.toString());
            await setSetting('goal_protein', protein.toString());
            await setSetting('goal_carbs', carbs.toString());
            await setSetting('goal_fats', fats.toString());
            await setSetting('bio_gender', profile.gender);
            await setSetting('bio_age', profile.age);
            await setSetting('bio_weight', profile.weight);
            await setSetting('bio_height', profile.height);
            await setSetting('bio_activity', profile.activityLevel);
            await setSetting('bio_goal', profile.goal);
            await setSetting('bio_diet', profile.dietaryPreference);
            router.push('/onboarding/ai-setup');
          } finally {
            setSaving(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
