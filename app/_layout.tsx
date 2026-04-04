import '../src/global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { initDb } from '../db/database';
import { View, Text } from '@/src/tw';

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        await initDb();
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

  return (
    <SafeAreaProvider className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#000000',
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '900',
            fontFamily: 'Courier',
          },
          contentStyle: {
            backgroundColor: '#FFFFFF',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="action-sheet" 
          options={{ 
            presentation: 'transparentModal', 
            headerShown: false,
            animation: 'fade'
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
