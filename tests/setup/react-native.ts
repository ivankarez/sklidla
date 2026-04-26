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
let mockFoods = [];
let mockServingSizes = [];
let nextFoodId = 1;
let nextServingSizeId = 1;
let nextLogId = 1;
let pendingCreatedLogFood = null;

const resetMockState = () => {
  mockSettings.clear();
  mockLogs = [];
  mockFoods = [];
  mockServingSizes = [];
  nextFoodId = 1;
  nextServingSizeId = 1;
  nextLogId = 1;
  pendingCreatedLogFood = null;
};

const toLocalSqlDate = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftSqlDate = (dateString, deltaDays) => {
  const shiftedDate = new Date(`${dateString}T12:00:00`);
  shiftedDate.setDate(shiftedDate.getDate() + deltaDays);
  return toLocalSqlDate(shiftedDate);
};

const getMockLoggingStreak = () => {
  const loggedDates = new Set(mockLogs.map((log) => toLocalSqlDate(log.logged_at)));
  const today = toLocalSqlDate(new Date());
  const yesterday = shiftSqlDate(today, -1);

  let cursor = today;
  if (!loggedDates.has(today)) {
    if (!loggedDates.has(yesterday)) {
      return 0;
    }

    cursor = yesterday;
  }

  let streak = 0;
  while (loggedDates.has(cursor)) {
    streak += 1;
    cursor = shiftSqlDate(cursor, -1);
  }

  return streak;
};

const getMockLast7DayNutritionAverages = () => {
  const today = toLocalSqlDate(new Date());
  const earliestDate = shiftSqlDate(today, -6);
  const groupedDays = new Map();

  mockLogs.forEach((log) => {
    const loggedDate = toLocalSqlDate(log.logged_at);
    if (loggedDate < earliestDate || loggedDate > today) {
      return;
    }

    const currentDay = groupedDays.get(loggedDate) ?? {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFats: 0,
    };

    groupedDays.set(loggedDate, {
      averageCalories: currentDay.averageCalories + log.hardcoded_calories,
      averageProtein: currentDay.averageProtein + log.hardcoded_protein,
      averageCarbs: currentDay.averageCarbs + log.hardcoded_carbs,
      averageFats: currentDay.averageFats + log.hardcoded_fats,
    });
  });

  const loggedDays = Array.from(groupedDays.values());
  if (loggedDays.length === 0) {
    return {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFats: 0,
      daysLogged: 0,
    };
  }

  const totals = loggedDays.reduce(
    (acc, day) => ({
      averageCalories: acc.averageCalories + day.averageCalories,
      averageProtein: acc.averageProtein + day.averageProtein,
      averageCarbs: acc.averageCarbs + day.averageCarbs,
      averageFats: acc.averageFats + day.averageFats,
    }),
    { averageCalories: 0, averageProtein: 0, averageCarbs: 0, averageFats: 0 }
  );

  return {
    averageCalories: totals.averageCalories / loggedDays.length,
    averageProtein: totals.averageProtein / loggedDays.length,
    averageCarbs: totals.averageCarbs / loggedDays.length,
    averageFats: totals.averageFats / loggedDays.length,
    daysLogged: loggedDays.length,
  };
};

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

vi.mock('@/src/log-food-session', () => ({
  setPendingCreatedLogFood: (value) => {
    pendingCreatedLogFood = value;
  },
  consumePendingCreatedLogFood: () => {
    const value = pendingCreatedLogFood;
    pendingCreatedLogFood = null;
    return value;
  },
  __resetPendingCreatedLogFood: () => {
    pendingCreatedLogFood = null;
  },
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
  addFood: vi.fn(async (food) => {
    const createdFood = { id: nextFoodId++, ...food };
    mockFoods.push(createdFood);
    return createdFood.id;
  }),
  updateFood: vi.fn(async (id, food) => {
    mockFoods = mockFoods.map((item) => (item.id === id ? { id, ...food } : item));
  }),
  getAllFoods: vi.fn(async () => mockFoods),
  searchFoods: vi.fn(async (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    return mockFoods.filter((food) => {
      const haystacks = [food.name, food.brand ?? ''];
      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }),
  addServingSize: vi.fn(async (foodId, name, weightInGrams) => {
    const createdServingSize = {
      id: nextServingSizeId++,
      food_id: foodId,
      name,
      weight_in_grams: weightInGrams,
    };
    mockServingSizes.push(createdServingSize);
    return createdServingSize.id;
  }),
  deleteServingSizes: vi.fn(async (foodId) => {
    mockServingSizes = mockServingSizes.filter((item) => item.food_id !== foodId);
  }),
  getServingSizes: vi.fn(async (foodId) =>
    mockServingSizes.filter((item) => item.food_id === foodId)
  ),
  getLogsByDate: vi.fn(async (dateString) =>
    mockLogs.filter((log) => toLocalSqlDate(log.logged_at) === dateString)
  ),
  getLoggingStreak: vi.fn(async () => getMockLoggingStreak()),
  getLast7DayNutritionAverages: vi.fn(async () => getMockLast7DayNutritionAverages()),
  deleteLog: vi.fn(async (id) => {
    mockLogs = mockLogs.filter((log) => log.id !== id);
  }),
  getLogById: vi.fn(async (id) => {
    const log = mockLogs.find((item) => item.id === id);
    if (!log) return null;
    const food = mockFoods.find((item) => item.id === log.food_id);
    if (!food) return null;
    return {
      ...log,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fats_per_100g: food.fats_per_100g,
    };
  }),
  logFood: vi.fn(async (foodId, servingSizeId, amountLogged, hardcodedCalories, hardcodedProtein, hardcodedCarbs, hardcodedFats) => {
    const food = mockFoods.find((item) => item.id === foodId);
    const servingSize = servingSizeId
      ? mockServingSizes.find((item) => item.id === servingSizeId)
      : null;

    const createdLog = {
      id: nextLogId++,
      food_id: foodId,
      serving_size_id: servingSizeId,
      serving_size_name: servingSize?.name ?? null,
      amount_logged: amountLogged,
      hardcoded_calories: hardcodedCalories,
      hardcoded_protein: hardcodedProtein,
      hardcoded_carbs: hardcodedCarbs,
      hardcoded_fats: hardcodedFats,
      logged_at: new Date().toISOString(),
      name: food?.name ?? 'UNKNOWN FOOD',
    };
    mockLogs.push(createdLog);
    return createdLog.id;
  }),
  updateLog: vi.fn(async (id, servingSizeId, amountLogged, hardcodedCalories, hardcodedProtein, hardcodedCarbs, hardcodedFats) => {
    const servingSize = servingSizeId
      ? mockServingSizes.find((item) => item.id === servingSizeId)
      : null;

    mockLogs = mockLogs.map((log) =>
      log.id === id
        ? {
            ...log,
            serving_size_id: servingSizeId,
            serving_size_name: servingSize?.name ?? null,
            amount_logged: amountLogged,
            hardcoded_calories: hardcodedCalories,
            hardcoded_protein: hardcodedProtein,
            hardcoded_carbs: hardcodedCarbs,
            hardcoded_fats: hardcodedFats,
          }
        : log
    );
  }),
  clearAllData: vi.fn(async () => {}),
  __resetMockDb: () => {
    resetMockState();
  },
  __setMockSetting: (key, value) => {
    mockSettings.set(key, value);
  },
  __setMockFoods: (foods) => {
    mockFoods = foods;
  },
  __setMockServingSizes: (servingSizes) => {
    mockServingSizes = servingSizes;
  },
  __setMockLogs: (logs) => {
    mockLogs = logs;
  },
}));

afterEach(() => {
  cleanup();
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
