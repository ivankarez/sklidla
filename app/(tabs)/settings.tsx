import { Pressable, ScrollView, Text, TextInput, View } from '@/src/tw';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Alert, Modal, Appearance, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, setSetting, clearAllData } from '../../db/dao';
import { useRouter } from 'expo-router';
import { MacroCalculator } from '@/src/components/macro-calculator';

export default function SettingsScreen() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiProvider, setAiProvider] = useState('OpenRouter');
  const [apiKey, setApiKey] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const router = useRouter();
  
  const [goalCalories, setGoalCalories] = useState('');
  const [goalProtein, setGoalProtein] = useState('');
  const [goalCarbs, setGoalCarbs] = useState('');
  const [goalFats, setGoalFats] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);

  // Theme State
  const [themePreference, setThemePreference] = useState('system');

  // Calculator State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [gender, setGender] = useState('nonbinary');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('sedentary');
  const [goal, setGoal] = useState('maintain');
  const [dietaryPreference, setDietaryPreference] = useState('meathead');

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedAiEnabled = await getSetting('ai_enabled');
        if (storedAiEnabled !== null) setAiEnabled(storedAiEnabled === 'true');
        
        const storedProvider = await getSetting('ai_provider');
        if (storedProvider) setAiProvider(storedProvider);

        const storedKey = await SecureStore.getItemAsync('apiKey');
        if (storedKey) {
          setApiKey(storedKey);
        } else {
          // Fallback migration
          const storedRouter = await SecureStore.getItemAsync('openRouterKey');
          const storedAi = await SecureStore.getItemAsync('openAiKey');
          if (storedRouter) setApiKey(storedRouter);
          else if (storedAi) setApiKey(storedAi);
        }

        const cal = await getSetting('goal_calories');
        const pro = await getSetting('goal_protein');
        const car = await getSetting('goal_carbs');
        const fat = await getSetting('goal_fats');

        if (cal) setGoalCalories(cal);
        if (pro) setGoalProtein(pro);
        if (car) setGoalCarbs(car);
        if (fat) setGoalFats(fat);

        const sGender = await getSetting('bio_gender');
        const sAge = await getSetting('bio_age');
        const sWeight = await getSetting('bio_weight');
        const sHeight = await getSetting('bio_height');
        const sActivity = await getSetting('bio_activity');
        const sGoal = await getSetting('bio_goal');
        const sDiet = await getSetting('bio_diet');

        if (sGender) setGender(sGender);
        if (sAge) setAge(sAge);
        if (sWeight) setWeight(sWeight);
        if (sHeight) setHeight(sHeight);
        if (sActivity) setActivityLevel(sActivity);
        if (sGoal) setGoal(sGoal);
        if (sDiet) setDietaryPreference(sDiet);

        const storedTheme = await getSetting('theme_preference');
        if (storedTheme) setThemePreference(storedTheme);
      } catch {
        Alert.alert('ERROR', 'FAILED TO LOAD SETTINGS.');
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(async () => {
      try {
        await setSetting('ai_enabled', aiEnabled ? 'true' : 'false');
        await setSetting('ai_provider', aiProvider);
        await SecureStore.setItemAsync('apiKey', apiKey);

        await setSetting('goal_calories', goalCalories || '2000');
        await setSetting('goal_protein', goalProtein || '150');
        await setSetting('goal_carbs', goalCarbs || '200');
        await setSetting('goal_fats', goalFats || '65');

        await setSetting('bio_gender', gender);
        await setSetting('bio_age', age);
        await setSetting('bio_weight', weight);
        await setSetting('bio_height', height);
        await setSetting('bio_activity', activityLevel);
        await setSetting('bio_goal', goal);
        await setSetting('bio_diet', dietaryPreference);

        await setSetting('theme_preference', themePreference);
      } catch (e) {
        console.error('Failed to auto-save settings', e);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [aiEnabled, aiProvider, apiKey, goalCalories, goalProtein, goalCarbs, goalFats, gender, age, weight, height, activityLevel, goal, dietaryPreference, themePreference, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="font-mono text-xl font-black text-black">OPENING SETTINGS...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View className="items-center py-2.5 mb-2.5">
        <Text className="font-mono text-xl font-black text-black">SETTINGS</Text>
      </View>
      <ScrollView contentContainerClassName="p-5 pb-10" keyboardShouldPersistTaps="handled">
        
        <View className="mb-10">
          <View className="flex-row justify-between items-end mb-1.5">
            <Text className="font-mono text-xl font-black text-black">MACRO GOALS</Text>
            <Pressable onPress={() => setIsCalculatorOpen(true)} className="bg-black px-3 py-1.5 border-2 border-black">
              <Text className="font-mono text-xs font-black text-white">RUN THE MATH</Text>
            </Pressable>
          </View>
          <View className="h-1 bg-black mb-5" />

          <View className="mb-5">
            <Text className="font-mono text-sm font-bold text-black mb-2">CALORIES</Text>
            <TextInput
              className="font-mono border-2 border-black bg-white p-4 text-base text-black"
              value={goalCalories}
              onChangeText={setGoalCalories}
              keyboardType="numeric"
              placeholder="e.g. 2500"
              placeholderTextColor="#999"
            />
          </View>
          <View className="flex-row justify-between">
            <View className="flex-1 mr-2.5 mb-5">
              <Text className="font-mono text-sm font-bold text-black mb-2">PROTEIN (g)</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-4 text-base text-black"
                value={goalProtein}
                onChangeText={setGoalProtein}
                keyboardType="numeric"
                placeholder="150"
                placeholderTextColor="#999"
              />
            </View>
            <View className="flex-1 mr-2.5 mb-5">
              <Text className="font-mono text-sm font-bold text-black mb-2">CARBS (g)</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-4 text-base text-black"
                value={goalCarbs}
                onChangeText={setGoalCarbs}
                keyboardType="numeric"
                placeholder="200"
                placeholderTextColor="#999"
              />
            </View>
            <View className="flex-1 mb-5">
              <Text className="font-mono text-sm font-bold text-black mb-2">FAT (g)</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-4 text-base text-black"
                value={goalFats}
                onChangeText={setGoalFats}
                keyboardType="numeric"
                placeholder="65"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        <View className="mb-10">
          <Text className="font-mono text-xl font-black text-black mb-1.5">OPTIONAL AI (BYOK)</Text>
          <View className="h-1 bg-black mb-5" />
          
          <Pressable 
            className="flex-row items-center mb-5" 
            onPress={() => setAiEnabled(!aiEnabled)}
          >
            <View className={`w-8 h-8 border-2 border-black mr-4 items-center justify-center ${aiEnabled ? 'bg-black' : 'bg-white'}`}>
              {aiEnabled && <Ionicons name="checkmark" size={24} color={colorScheme === 'dark' ? 'black' : 'white'} />}
            </View>
            <Text className="font-mono text-base font-bold text-black">TURN ON AI FEATURES</Text>
          </Pressable>

          {aiEnabled && (
            <View className="pl-2 border-l-4 border-black ml-3">
              <View className="mb-5 ml-4">
                <Text className="font-mono text-sm font-bold text-black mb-2">AI PROVIDER</Text>
                <Pressable 
                  className="border-2 border-black bg-white p-4 flex-row justify-between items-center"
                  onPress={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                >
                  <Text className="font-mono text-base font-bold text-black">{aiProvider}</Text>
                  <Ionicons name={isProviderDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={iconColor} />
                </Pressable>
                {isProviderDropdownOpen && (
                  <View className="border-2 border-t-0 border-black bg-white">
                    {['OpenRouter', 'OpenAI', 'Gemini', 'Claude'].map((provider, index, arr) => (
                      <Pressable 
                        key={provider} 
                        className={`p-4 ${index !== arr.length - 1 ? 'border-b-2 border-black' : ''}`}
                        onPress={() => {
                          setAiProvider(provider);
                          setIsProviderDropdownOpen(false);
                        }}
                      >
                        <Text className="font-mono text-base text-black">{provider}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View className="mb-5 ml-4">
                <Text className="font-mono text-sm font-bold text-black mb-2">API KEY</Text>
                <TextInput
                  className="font-mono border-2 border-black bg-white p-4 text-base text-black"
                  value={apiKey}
                  onChangeText={setApiKey}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder={`Paste your ${aiProvider} key here`}
                  placeholderTextColor="#999"
                />
              </View>
              <Text className="font-mono text-xs text-black ml-4 -mt-2.5 leading-4.5">KEYS STAY ENCRYPTED ON THIS DEVICE. NO SERVER MIDDLEMAN.</Text>
            </View>
          )}
        </View>

        <View className="mb-10">
          <Text className="font-mono text-xl font-black text-black mb-1.5">APPEARANCE</Text>
          <View className="h-1 bg-black mb-5" />
          
          <View className="flex-row">
            {[
              { id: 'light', label: 'LIGHT' },
              { id: 'dark', label: 'DARK' },
              { id: 'system', label: 'SYSTEM' },
            ].map((t) => (
              <Pressable 
                key={t.id}
                className={`flex-1 border-2 border-black p-3 items-center mr-2 last:mr-0 ${themePreference === t.id ? 'bg-black' : 'bg-white'}`}
                onPress={() => {
                  setThemePreference(t.id);
                  if (t.id === 'system') {
                    Appearance.setColorScheme(null);
                  } else {
                    Appearance.setColorScheme(t.id as 'light' | 'dark');
                  }
                }}
              >
                <Text className={`font-mono text-xs font-black ${themePreference === t.id ? 'text-white' : 'text-black'}`}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

      <View className="mb-10">
        <Text className="font-mono text-xl font-black text-black mb-1.5">DELETE EVERYTHING</Text>
        <View className="h-1 bg-black mb-5" />
        <Pressable
          className="bg-white border-2 border-black p-4 items-center"
          onPress={() => {
            Alert.alert(
              'DELETE ALL DATA',
              'This permanently deletes all local data on this device, including your database and saved keys. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, delete it', onPress: () => {
                    Alert.alert(
                      'LAST CHECK',
                      'Delete everything on this device? This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'DELETE', style: 'destructive', onPress: async () => {
                            try {
                              setIsLoading(true);
                              await clearAllData();
                              await SecureStore.deleteItemAsync('apiKey');
                              await SecureStore.deleteItemAsync('openRouterKey');
                               await SecureStore.deleteItemAsync('openAiKey');
                               setIsLoading(false);
                               router.replace('/onboarding');
                               Alert.alert('DONE', 'All local data has been removed.');
                             } catch (e) {
                               console.error('Failed to clear data', e);
                               setIsLoading(false);
                               Alert.alert('ERROR', 'FAILED TO DELETE YOUR LOCAL DATA.');
                             }
                           } },
                      ],
                      { cancelable: false }
                    );
                  } },
              ],
              { cancelable: false }
            );
          }}
        >
          <Text className="font-mono text-base font-black text-black">DELETE ALL DATA</Text>
        </Pressable>
      </View>

      </ScrollView>

      {/* Math Screen Calculator Modal */}
      <Modal visible={isCalculatorOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} edges={['top', 'bottom']}>
          <View className={`flex-row items-center py-4 mb-2 border-b-4 px-5 justify-between ${isDark ? 'border-white' : 'border-black'}`}>
            <Text className={`font-mono text-2xl font-black tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>MATH SCREEN</Text>
            <Pressable
              onPress={() => setIsCalculatorOpen(false)}
              className="p-1 border-2"
              style={{
                backgroundColor: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#FFFFFF' : '#000000',
              }}
            >
              <Ionicons name="close" size={24} color={isDark ? '#000000' : '#FFFFFF'} />
            </Pressable>
          </View>
          
          <MacroCalculator
            isDark={isDark}
            initialProfile={{
              gender,
              age,
              weight,
              height,
              activityLevel,
              goal,
              dietaryPreference,
            }}
            onCalculated={({ calories, protein, carbs, fats, profile }) => {
              setGoalCalories(calories.toString());
              setGoalProtein(protein.toString());
              setGoalCarbs(carbs.toString());
              setGoalFats(fats.toString());
              setGender(profile.gender);
              setAge(profile.age);
              setWeight(profile.weight);
              setHeight(profile.height);
              setActivityLevel(profile.activityLevel);
              setGoal(profile.goal);
              setDietaryPreference(profile.dietaryPreference);
              setIsCalculatorOpen(false);
            }}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
