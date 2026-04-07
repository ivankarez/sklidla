import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setSetting } from '@/db/dao';
import { Pressable, ScrollView, Text, View } from '@/src/tw';
import { Animated } from '@/src/tw/animated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

export default function AiSetupScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [finishing, setFinishing] = useState(false);

  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(14);
  const bodyOpacity = useSharedValue(0);
  const bodyTranslate = useSharedValue(20);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslate = useSharedValue(24);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    headerTranslate.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });

    bodyOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    bodyTranslate.value = withDelay(200, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));

    ctaOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    ctaTranslate.value = withDelay(400, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [headerOpacity, headerTranslate, bodyOpacity, bodyTranslate, ctaOpacity, ctaTranslate]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
    transform: [{ translateY: bodyTranslate.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslate.value }],
  }));

  const finishOnboarding = async () => {
    setFinishing(true);
    try {
      await setSetting('onboarding_completed', 'true');
      router.replace('/(tabs)');
    } finally {
      setFinishing(false);
    }
  };

  const fg = isDark ? 'text-white' : 'text-black';
  const border = isDark ? 'border-white' : 'border-black';
  const iconColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="flex-grow justify-between px-6 pt-6 pb-8">
        <View>
          {/* Header */}
          <Animated.View style={headerStyle} className="mb-6">
            <Text className={`font-mono text-4xl font-black leading-tight mb-2 ${fg}`}>
              AI POWERS.{'\n'}YOUR KEYS.
            </Text>
            <View className={`w-full h-1 ${isDark ? 'bg-white' : 'bg-black'}`} />
          </Animated.View>

          <Animated.View style={bodyStyle}>
            {/* Main pitch card */}
            <View className={`w-full border-4 p-5 mb-5 ${border} ${isDark ? 'bg-black' : 'bg-white'}`}>
              <Text className={`font-mono text-lg font-black leading-7 mb-3 ${fg}`}>
                POINT. SHOOT. KNOW YOUR MACROS.
              </Text>
              <View className={`h-0.5 mb-3 ${isDark ? 'bg-white' : 'bg-black'}`} />
              <Text className={`font-mono text-sm font-bold leading-6 ${fg}`}>
                SNAP A NUTRITION LABEL AND SKLIDLA READS IT. PHOTOGRAPH YOUR PLATE AND AI ESTIMATES THE MACROS. NO MANUAL TYPING REQUIRED.
              </Text>
            </View>

            {/* Feature cards */}
            <View className="gap-3 mb-5">
              {[
                { icon: 'camera' as const, title: 'LABEL SCANNER', desc: 'POINT AT A NUTRITION LABEL. AI READS IT INSTANTLY.' },
                { icon: 'restaurant' as const, title: 'PLATE RECOGNITION', desc: 'SNAP YOUR MEAL. GET MACRO ESTIMATES IN SECONDS.' },
                { icon: 'key' as const, title: 'BYOK: BRING YOUR OWN KEY', desc: 'OPENROUTER, OPENAI, GEMINI, OR CLAUDE. YOUR KEY, YOUR COST CONTROL.' },
              ].map((card, i) => (
                <View key={i} className={`flex-row border-4 p-4 ${border} ${isDark ? 'bg-black' : 'bg-white'}`}>
                  <View className={`w-12 h-12 items-center justify-center border-2 mr-4 ${border} ${isDark ? 'bg-white' : 'bg-black'}`}>
                    <Ionicons name={card.icon} size={24} color={isDark ? '#000000' : '#FFFFFF'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-mono text-sm font-black mb-1 ${fg}`}>{card.title}</Text>
                    <Text className={`font-mono text-xs font-bold leading-4.5 ${fg}`}>{card.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Reassurance */}
            <View className={`w-full border-2 p-4 ${border} ${isDark ? 'bg-black' : 'bg-white'}`}>
              <Text className={`font-mono text-xs font-bold leading-5 text-center uppercase ${fg}`}>
                AI IS 100% OPTIONAL. KEYS STAY ENCRYPTED ON DEVICE. SET IT UP ANYTIME IN SETTINGS.
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Step indicator + CTA */}
        <Animated.View style={ctaStyle} className="mt-8">
          <View className="flex-row items-center justify-center mb-4 gap-2">
            <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'} opacity-25`} />
            <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'} opacity-25`} />
            <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'}`} />
          </View>
          <Pressable
            className={`py-5 items-center border-4 ${isDark ? 'bg-white border-white' : 'bg-black border-black'} ${finishing ? 'opacity-70' : ''}`}
            onPress={finishOnboarding}
            disabled={finishing}
          >
            <Text className={`font-mono text-2xl font-black tracking-widest ${isDark ? 'text-black' : 'text-white'}`}>
              ENTER SKLIDLA
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
