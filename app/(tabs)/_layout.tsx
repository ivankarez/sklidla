import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

function TabIcon({ name, focused, size, color }: { name: any, focused: boolean, size: number, color: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.2, { damping: 10, stiffness: 100 });
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

function AddTabIcon() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View style={{ 
      width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? 'white' : 'black', 
      justifyContent: 'center', alignItems: 'center', 
      marginTop: -30, // Pop out perfectly over the top border
      borderWidth: 4, borderColor: isDark ? 'black' : 'white',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5
    }}>
      <Ionicons name="add" size={36} color={isDark ? 'black' : 'white'} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopWidth: 4,
          borderTopColor: isDark ? '#FFFFFF' : '#000000',
        },
        tabBarActiveTintColor: isDark ? '#FFFFFF' : '#000000',
        tabBarInactiveTintColor: isDark ? '#555555' : '#A0A0A0',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="foods"
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name={focused ? 'fast-food' : 'fast-food-outline'} focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="_add"
        options={{
          tabBarIcon: () => <AddTabIcon />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/log-food');
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
