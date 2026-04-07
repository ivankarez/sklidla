import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Image } from '@/src/tw/image';
import { Pressable, ScrollView, Text, View } from '@/src/tw';
import { Animated } from '@/src/tw/animated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

export default function WelcomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(12);
  const bodyOpacity = useSharedValue(0);
  const bodyTranslate = useSharedValue(20);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslate = useSharedValue(24);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.4)) });

    titleOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    titleTranslate.value = withDelay(200, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));

    bodyOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    bodyTranslate.value = withDelay(400, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));

    ctaOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    ctaTranslate.value = withDelay(600, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [logoScale, logoOpacity, titleOpacity, titleTranslate, bodyOpacity, bodyTranslate, ctaOpacity, ctaTranslate]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
    transform: [{ translateY: bodyTranslate.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslate.value }],
  }));

  const fg = isDark ? 'text-white' : 'text-black';
  const border = isDark ? 'border-white' : 'border-black';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="flex-grow justify-between px-6 pt-6 pb-8">
        {/* Hero */}
        <View className="items-center">
          <Animated.View style={logoStyle} className="items-center mb-2">
            <Image
              source={require('../../assets/images/logo-round.png')}
              className={`w-36 h-36 border-4 ${border}`}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.View style={titleStyle} className="items-center mb-6">
            <Text className={`font-mono text-5xl font-black tracking-tighter ${fg}`}>
              SKLIDLA
            </Text>
            <View className={`w-full h-1 mt-2 ${isDark ? 'bg-white' : 'bg-black'}`} />
          </Animated.View>

          <Animated.View style={bodyStyle} className="w-full">
            {/* Main pitch card */}
            <View className={`w-full border-4 p-5 mb-5 ${border} ${isDark ? 'bg-black' : 'bg-white'}`}>
              <Text className={`font-mono text-lg font-black leading-7 mb-3 ${fg}`}>
                YOUR DATA. YOUR DEVICE.{'\n'}NO CREEPY CLOUDS. NO SUBSCRIPTIONS.
              </Text>
              <View className={`h-0.5 mb-3 ${isDark ? 'bg-white' : 'bg-black'}`} />
              <Text className={`font-mono text-sm font-bold leading-6 ${fg}`}>
                SKLIDLA IS A FREE, OPEN-SOURCE CALORIE TRACKER THAT RESPECTS YOUR PRIVACY. EVERYTHING STAYS ON YOUR PHONE. PERIOD.
              </Text>
            </View>

            {/* Feature bullets */}
            <View className="mb-5 gap-3">
              {[
                { icon: '■', text: 'FREE FOREVER. NO ADS. NO UPSELLS.' },
                { icon: '■', text: 'PRIVATE BY DEFAULT. ZERO DATA LEAVES.' },
                { icon: '■', text: 'OPEN SOURCE. INSPECT THE CODE YOURSELF.' },
              ].map((item, i) => (
                <View key={i} className={`flex-row items-start border-l-4 pl-4 ${border}`}>
                  <Text className={`font-mono text-base font-black mr-3 ${fg}`}>{item.icon}</Text>
                  <Text className={`font-mono text-sm font-bold leading-5 flex-1 ${fg}`}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Setup teaser */}
            <View className={`w-full border-2 p-4 ${border} ${isDark ? 'bg-black' : 'bg-white'}`}>
              <Text className={`font-mono text-xs font-bold leading-5 text-center uppercase ${fg}`}>
                FIRST, LET&apos;S DIAL YOUR DAILY MACROS SO THIS APP ACTUALLY FITS YOUR CHAOS.
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Step indicator + CTA */}
        <Animated.View style={ctaStyle} className="mt-8">
          <View className="flex-row items-center justify-center mb-4 gap-2">
            <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'}`} />
            <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'} opacity-25`} />
            <View className={`w-8 h-2 ${isDark ? 'bg-white' : 'bg-black'} opacity-25`} />
          </View>
          <Pressable
            className={`py-5 items-center border-4 ${isDark ? 'bg-white border-white' : 'bg-black border-black'}`}
            onPress={() => router.push('/onboarding/macro-setup')}
          >
            <Text className={`font-mono text-2xl font-black tracking-widest ${isDark ? 'text-black' : 'text-white'}`}>
              LET&apos;S GO
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
