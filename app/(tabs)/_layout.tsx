import { Tabs, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';

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
  return (
    <Animated.View style={{ 
      width: 60, height: 60, borderRadius: 30, backgroundColor: 'black', 
      justifyContent: 'center', alignItems: 'center', 
      marginTop: -30, // Pop out perfectly over the top border
      borderWidth: 4, borderColor: 'white',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5
    }}>
      <Ionicons name="add" size={36} color="white" />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: '#FFFFFF' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 4,
          borderTopColor: '#000000',
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#A0A0A0',
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
            router.push('/action-sheet');
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
