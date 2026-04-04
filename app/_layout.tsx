import '../src/global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { initDb } from '../db/database';
import { View, Text } from '@/src/tw';
import { useColorScheme, Appearance } from 'react-native';
import { getSetting } from '../db/dao';

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function setup() {
      try {
        await initDb();
        
        // Load theme preference
        const themePref = await getSetting('theme_preference') || 'system';
        if (themePref === 'dark' || themePref === 'light') {
          Appearance.setColorScheme(themePref);
        } else {
          Appearance.setColorScheme(null); // 'system'
        }
        
        setDbInitialized(true);
      } catch (e) {
        setError(e as Error);
      }
    }
    setup();
  }, []);

  if (error) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-black font-mono">DB INIT FAILED: {error.message}</Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-black font-mono text-2xl font-black">INITIALIZING...</Text>
      </View>
    );
  }

  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <View className={`flex-1 ${isDark ? 'dark' : ''} bg-white will-change-variable`}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
            },
            headerTintColor: isDark ? '#FFFFFF' : '#000000',
            headerShadowVisible: false,
            headerTitleStyle: {
              fontWeight: '900',
              fontFamily: 'Courier',
            },
            contentStyle: {
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="log-food" 
            options={{ 
              presentation: 'modal', 
              headerShown: false,
              animation: 'slide_from_bottom'
            }} 
          />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
