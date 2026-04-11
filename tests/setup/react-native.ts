import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  setParams: vi.fn(),
};

let localSearchParams = {};

const mockSettings = new Map();
let mockLogs = [];

vi.mock('expo-router', () => {
  const Tabs = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  Tabs.Screen = ({ children }) =>
    React.createElement(React.Fragment, null, children);

  const Stack = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  Stack.Screen = ({ children }) =>
    React.createElement(React.Fragment, null, children);

  return {
    useRouter: () => routerMock,
    useLocalSearchParams: () => localSearchParams,
    useFocusEffect: (callback) => {
      React.useEffect(() => callback(), [callback]);
    },
    Tabs,
    Stack,
    __routerMock: routerMock,
    __resetRouterMock: () => {
      routerMock.push.mockReset();
      routerMock.replace.mockReset();
      routerMock.back.mockReset();
      routerMock.setParams.mockReset();
      localSearchParams = {};
    },
    __setLocalSearchParams: (params) => {
      localSearchParams = params;
    },
  };
});

vi.mock('react-native-safe-area-context', async () => {
  const reactNative = await import('react-native');

  return {
    SafeAreaProvider: reactNative.View,
    SafeAreaView: reactNative.View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

vi.mock('react-native-reanimated', async () => {
  const reactNative = await import('react-native');

  const createAnimatedComponent = (Component) => Component;

  return {
    default: {
      View: reactNative.View,
      ScrollView: reactNative.ScrollView,
      createAnimatedComponent,
    },
    View: reactNative.View,
    ScrollView: reactNative.ScrollView,
    createAnimatedComponent,
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (callback) => callback(),
    withTiming: (value) => value,
    withDelay: (_delay, value) => value,
    withSpring: (value) => value,
    Easing: {
      out: (value) => value,
      in: (value) => value,
      back: () => 0,
      cubic: 0,
      exp: 0,
    },
  };
});

vi.mock('@expo/vector-icons', async () => {
  const reactNative = await import('react-native');

  return {
    Ionicons: ({ name }) => React.createElement(reactNative.Text, null, name),
    MaterialIcons: ({ name }) => React.createElement(reactNative.Text, null, name),
  };
});

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  default: ({ children }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: {
    Medium: 'Medium',
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  deleteItemAsync: vi.fn(async () => {}),
}));

vi.mock('@/src/tw', async () => {
  const reactNative = await import('react-native');

  return {
    View: reactNative.View,
    Text: reactNative.Text,
    Pressable: reactNative.Pressable,
    ScrollView: reactNative.ScrollView,
    TextInput: reactNative.TextInput,
    SafeAreaView: reactNative.View,
    TouchableHighlight: reactNative.TouchableHighlight,
  };
});

vi.mock('@/src/tw/animated', async () => {
  const reactNative = await import('react-native');

  return {
    Animated: {
      View: reactNative.View,
      ScrollView: reactNative.ScrollView,
    },
  };
});

vi.mock('@/src/tw/image', async () => {
  const reactNative = await import('react-native');

  return {
    Image: reactNative.Image,
  };
});

vi.mock('@/db/dao', () => ({
  getSetting: vi.fn(async (key) => mockSettings.get(key) ?? null),
  setSetting: vi.fn(async (key, value) => {
    mockSettings.set(key, value);
  }),
  getLogsByDate: vi.fn(async () => mockLogs),
  deleteLog: vi.fn(async () => {}),
  getLogById: vi.fn(async () => null),
  getServingSizes: vi.fn(async () => []),
  logFood: vi.fn(async () => 1),
  updateLog: vi.fn(async () => {}),
  clearAllData: vi.fn(async () => {}),
  __resetMockDb: () => {
    mockSettings.clear();
    mockLogs = [];
  },
  __setMockSetting: (key, value) => {
    mockSettings.set(key, value);
  },
  __setMockLogs: (logs) => {
    mockLogs = logs;
  },
}));

afterEach(() => {
  cleanup();
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
