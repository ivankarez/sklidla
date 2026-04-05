import { Pressable, ScrollView, Text, TextInput, View } from '@/src/tw';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Alert, Modal, Appearance, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, setSetting } from '../../db/dao';

export default function SettingsScreen() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiProvider, setAiProvider] = useState('OpenRouter');
  const [apiKey, setApiKey] = useState('');
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  
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
        Alert.alert('ERROR', 'FAILED TO LOAD PROTOCOLS');
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

  const handleCalculate = () => {
    if (!age || !weight || !height) {
      Alert.alert('WEAKNESS DETECTED', 'PROVIDE AGE, WEIGHT, AND HEIGHT TO PROCEED.');
      return;
    }
    const a = parseInt(age, 10);
    const w = parseFloat(weight);
    const h = parseFloat(height);

    if (isNaN(a) || isNaN(w) || isNaN(h)) {
      Alert.alert('INVALID DATA', 'NUMBERS ONLY.');
      return;
    }

    // Mifflin-St Jeor
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    if (gender === 'male') {
      bmr += 5;
    } else if (gender === 'female') {
      bmr -= 161;
    } else {
      // Non-binary average
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

    const totalCals = Math.round(tdee);
    
    let proteinGrams = 0;
    let fatGrams = 0;
    let carbGrams = 0;

    if (dietaryPreference === 'meathead') {
      // STANDARD: Protein 2.2g/kg, Fats 25%, Carbs fill the rest
      proteinGrams = Math.round(w * 2.2);
      fatGrams = Math.round((totalCals * 0.25) / 9);
      carbGrams = Math.round((totalCals - (proteinGrams * 4) - (fatGrams * 9)) / 4);
    } else if (dietaryPreference === 'keto') {
      // KETO: Carbs 30g, Protein 1.8g/kg, Fats fill the rest
      carbGrams = 30;
      proteinGrams = Math.round(w * 1.8);
      fatGrams = Math.round((totalCals - (proteinGrams * 4) - (carbGrams * 4)) / 9);
    } else if (dietaryPreference === 'sugar_hater') {
      // LOW-CARB: Carbs 20%, Protein 2.2g/kg, Fats fill the rest
      carbGrams = Math.round((totalCals * 0.20) / 4);
      proteinGrams = Math.round(w * 2.2);
      fatGrams = Math.round((totalCals - (proteinGrams * 4) - (carbGrams * 4)) / 9);
    } else if (dietaryPreference === 'carb_loader') {
      // BULKING/CARBS: Protein 2.2g/kg, Fats 20%, Carbs fill the rest
      proteinGrams = Math.round(w * 2.2);
      fatGrams = Math.round((totalCals * 0.20) / 9);
      carbGrams = Math.round((totalCals - (proteinGrams * 4) - (fatGrams * 9)) / 4);
    }

    // Failsafe against negative carbs/fats on extreme cuts
    if (carbGrams < 0) carbGrams = 0;
    if (fatGrams < 0) fatGrams = 0;

    setGoalCalories(totalCals.toString());
    setGoalProtein(proteinGrams.toString());
    setGoalFats(fatGrams.toString());
    setGoalCarbs(carbGrams.toString());
    setIsCalculatorOpen(false);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="font-mono text-xl font-black text-black">ACCESSING SETTINGS...</Text>
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
            <Text className="font-mono text-xl font-black text-black">MACRO DIRECTIVES</Text>
            <Pressable onPress={() => setIsCalculatorOpen(true)} className="bg-black px-3 py-1.5 border-2 border-black">
              <Text className="font-mono text-xs font-black text-white">Calculate</Text>
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
          <Text className="font-mono text-xl font-black text-black mb-1.5">AI STUFF (BYOK)</Text>
          <View className="h-1 bg-black mb-5" />
          
          <Pressable 
            className="flex-row items-center mb-5" 
            onPress={() => setAiEnabled(!aiEnabled)}
          >
            <View className={`w-8 h-8 border-2 border-black mr-4 items-center justify-center ${aiEnabled ? 'bg-black' : 'bg-white'}`}>
              {aiEnabled && <Ionicons name="checkmark" size={24} color={colorScheme === 'dark' ? 'black' : 'white'} />}
            </View>
            <Text className="font-mono text-base font-bold text-black">ENABLE AI FUNCTIONS</Text>
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
                  placeholder={`Paste your ${aiProvider} key here...`}
                  placeholderTextColor="#999"
                />
              </View>
              <Text className="font-mono text-xs text-black ml-4 -mt-2.5 leading-4.5">KEYS ARE ENCRYPTED AND STORED LOCALLY. ZERO SERVER CONNECTION.</Text>
            </View>
          )}
        </View>

        <View className="mb-10">
          <Text className="font-mono text-xl font-black text-black mb-1.5">VISUAL PROTOCOL</Text>
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
      </ScrollView>

      {/* Math Screen Calculator Modal */}
      <Modal visible={isCalculatorOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View className="flex-row items-center py-4 mb-2 border-b-4 border-black px-5 justify-between">
            <Text className="font-mono text-2xl font-black text-black tracking-widest">MATH SCREEN</Text>
            <Pressable onPress={() => setIsCalculatorOpen(false)} className="bg-black p-1">
              <Ionicons name="close" size={24} color={colorScheme === 'dark' ? 'black' : 'white'} />
            </Pressable>
          </View>
          
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
                  <Text className={`font-mono text-[10px] font-bold ${gender === 'nonbinary' ? 'text-white' : 'text-black'}`}>DON&apos;T CARE</Text>
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
              <Text className="font-mono text-lg font-black text-black mb-3">ACTIVITY LEVEL</Text>
              {[
                { id: 'sedentary', label: 'SEDENTARY (WEAK/NO EXERCISE)' },
                { id: 'light', label: 'LIGHT (1-3 DAYS/WEEK)' },
                { id: 'moderate', label: 'MODERATE (3-5 DAYS/WEEK)' },
                { id: 'active', label: 'ACTIVE (6-7 DAYS/WEEK)' },
                { id: 'very_active', label: 'VERY ACTIVE (MANUAL LABOR)' },
              ].map((act) => (
                <Pressable 
                  key={act.id}
                  className={`border-2 border-black p-3 mb-2 flex-row justify-between items-center ${activityLevel === act.id ? 'bg-black' : 'bg-white'}`}
                  onPress={() => setActivityLevel(act.id)}
                >
                  <Text className={`font-mono font-bold text-sm ${activityLevel === act.id ? 'text-white' : 'text-black'}`}>
                    {act.label}
                  </Text>
                  {activityLevel === act.id && <Ionicons name="checkmark-sharp" size={20} color={colorScheme === 'dark' ? 'black' : 'white'} />}
                </Pressable>
              ))}
            </View>

            <View className="mb-6">
              <Text className="font-mono text-lg font-black text-black mb-3">PRIMARY OBJECTIVE</Text>
              {[
                { id: 'cut', label: 'STARVE THE WEAKNESS (CUT)' },
                { id: 'maintain', label: 'MAINTAIN' },
                { id: 'bulk', label: 'FEED THE BEAST (BULK)' },
              ].map((g) => (
                <Pressable 
                  key={g.id}
                  className={`border-4 border-black p-4 mb-3 items-center ${goal === g.id ? 'bg-black' : 'bg-white'}`}
                  onPress={() => setGoal(g.id)}
                >
                  <Text className={`font-mono text-lg font-black tracking-widest ${goal === g.id ? 'text-white' : 'text-black'}`}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mb-8">
              <Text className="font-mono text-lg font-black text-black mb-3">DIETARY DOCTRINE</Text>
              {[
                { id: 'meathead', label: 'STANDARD (MEATHEAD)' },
                { id: 'keto', label: 'KETO (FAT BURNING)' },
                { id: 'sugar_hater', label: 'LOW-CARB (SUGAR HATER)' },
                { id: 'carb_loader', label: 'CARB LOADER (PURE ENERGY)' },
              ].map((diet) => (
                <Pressable 
                  key={diet.id}
                  className={`border-2 border-black p-3 mb-2 flex-row justify-between items-center ${dietaryPreference === diet.id ? 'bg-black' : 'bg-white'}`}
                  onPress={() => setDietaryPreference(diet.id)}
                >
                  <Text className={`font-mono font-bold text-sm ${dietaryPreference === diet.id ? 'text-white' : 'text-black'}`}>
                    {diet.label}
                  </Text>
                  {dietaryPreference === diet.id && <Ionicons name="checkmark-sharp" size={20} color={colorScheme === 'dark' ? 'black' : 'white'} />}
                </Pressable>
              ))}
            </View>

            <Pressable className="bg-black py-6 items-center justify-center mb-4 border-4 border-black" onPress={handleCalculate}>
              <Text className="font-mono text-2xl font-black text-white tracking-widest">LET&apos;S SUFFER</Text>
            </Pressable>
            
            <Text className="font-mono text-xs text-center text-black px-2 leading-5 uppercase mb-4">
              WARNING: RELIES ON <Text className="underline" onPress={() => Alert.alert(
                'THE SCIENCE',
                'The Mifflin-St Jeor equation (1990) is widely considered the most accurate predictive equation for basal metabolic rate (BMR) in healthy adults.\n\nIt forms the baseline for your calorie targets before activity multipliers and goals are applied. Your protein is calculated at 2.2g/kg (1g/lb) to prevent muscle wasting during a cut and maximize synthesis during a bulk.\n\n"The app talks like a drill sergeant, but it calculates like a registered dietitian."'
              )}>MIFFLIN-ST JEOR MATHEMATICS</Text>.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
