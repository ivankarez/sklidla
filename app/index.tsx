import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { getSetting } from '@/db/dao';
import { Text, View } from '@/src/tw';

export default function EntryGate() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function routeUser() {
      const onboardingDone = await getSetting('onboarding_completed');
      if (onboardingDone === 'true') {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
      setReady(true);
    }
    routeUser();
  }, [router]);

  return (
    <View className={`flex-1 items-center justify-center ${isDark ? 'bg-black' : 'bg-white'}`}>
      <Text className={`font-mono text-xl font-black ${isDark ? 'text-white' : 'text-black'}`}>
        {ready ? 'ENTERING...' : 'BOOTING...'}
      </Text>
    </View>
  );
}
