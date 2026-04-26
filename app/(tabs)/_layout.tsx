import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

type TabGlyph = 'home' | 'foods' | 'stats' | 'settings';

function BrutalistSvgIcon({
  glyph,
  color,
  cutoutColor,
  size = 28,
}: {
  glyph: TabGlyph;
  color: string;
  cutoutColor: string;
  size?: number;
}) {
  switch (glyph) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 10L12 3L21 10V21H15V14H9V21H3V10Z" fill={color} />
          <Rect x="10" y="14" width="4" height="7" fill={cutoutColor} />
        </Svg>
      );
    case 'foods':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="6" width="20" height="4" fill={color} />
          <Rect x="4" y="11" width="16" height="4" fill={color} />
          <Rect x="6" y="16" width="12" height="4" fill={color} />
        </Svg>
      );
    case 'stats':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="12" width="4" height="9" fill={color} />
          <Rect x="10" y="8" width="4" height="13" fill={color} />
          <Rect x="17" y="4" width="4" height="17" fill={color} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="5" width="18" height="3" fill={color} />
          <Rect x="6" y="3" width="4" height="7" fill={color} />
          <Rect x="3" y="11" width="18" height="3" fill={color} />
          <Rect x="14" y="9" width="4" height="7" fill={color} />
          <Rect x="3" y="17" width="18" height="3" fill={color} />
          <Rect x="9" y="15" width="4" height="7" fill={color} />
        </Svg>
      );
  }
}

function TabIcon({
  glyph,
  focused,
  color,
  cutoutColor,
}: {
  glyph: TabGlyph;
  focused: boolean;
  color: string;
  cutoutColor: string;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.2, { damping: 12, stiffness: 180 });
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
    } else {
      scale.value = withTiming(1, { duration: 160 });
    }
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className="items-center justify-center">
      <BrutalistSvgIcon glyph={glyph} color={color} cutoutColor={cutoutColor} />
    </Animated.View>
  );
}

function AddTabIcon({ isDark }: { isDark: boolean }) {
  return (
    <View
      style={{
        width: 68,
        height: 68,
        backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -34,
        borderWidth: 4,
        borderColor: '#000000',
        boxShadow: '4px 4px 0px #000000',
      }}
    >
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <Rect x="10" y="3" width="4" height="18" fill="#000000" />
        <Rect x="3" y="10" width="18" height="4" fill="#000000" />
      </Svg>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const surfaceColor = isDark ? '#000000' : '#FFFFFF';
  const glyphColor = isDark ? '#FFFFFF' : '#000000';
  const cutoutColor = surfaceColor;
  const borderColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: surfaceColor },
        tabBarStyle: {
          backgroundColor: surfaceColor,
          borderTopWidth: 4,
          borderTopColor: borderColor,
          height: 88,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: glyphColor,
        tabBarInactiveTintColor: glyphColor,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="home" focused={focused} color={glyphColor} cutoutColor={cutoutColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="foods"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="foods" focused={focused} color={glyphColor} cutoutColor={cutoutColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="_add"
        options={{
          tabBarIcon: () => <AddTabIcon isDark={isDark} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push('/log-food');
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="stats" focused={focused} color={glyphColor} cutoutColor={cutoutColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="settings" focused={focused} color={glyphColor} cutoutColor={cutoutColor} />
          ),
        }}
      />
    </Tabs>
  );
}
