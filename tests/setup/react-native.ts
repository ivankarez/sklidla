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
let mockWeightLogs = [];
let mockFoods = [];
let mockServingSizes = [];
let nextFoodId = 1;
let nextServingSizeId = 1;
let nextLogId = 1;
let nextWeightLogId = 1;
let pendingCreatedLogFood = null;

const resetMockState = () => {
  mockSettings.clear();
  mockLogs = [];
  mockWeightLogs = [];
  mockFoods = [];
  mockServingSizes = [];
  nextFoodId = 1;
  nextServingSizeId = 1;
  nextLogId = 1;
  nextWeightLogId = 1;
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

const getMockLast7DayCalorieGoalStatuses = () => {
  const today = toLocalSqlDate(new Date());
  const calorieGoal = Number.parseInt(mockSettings.get('goal_calories') ?? '2000', 10);
  const normalizedCalorieGoal = Number.isFinite(calorieGoal) ? calorieGoal : 2000;
  const dailyCalories = new Map();

  mockLogs.forEach((log) => {
    const loggedDate = toLocalSqlDate(log.logged_at);
    const currentCalories = dailyCalories.get(loggedDate) ?? 0;
    dailyCalories.set(loggedDate, currentCalories + log.hardcoded_calories);
  });

  return Array.from({ length: 7 }, (_, index) => {
    const loggedDate = shiftSqlDate(today, index - 6);
    const calories = dailyCalories.get(loggedDate) ?? 0;

    if (!dailyCalories.has(loggedDate)) {
      return { loggedDate, status: 'no_logs', calories: 0 };
    }

    return {
      loggedDate,
      status: calories > normalizedCalorieGoal ? 'over' : 'met',
      calories,
    };
  });
};

const getWeightRangeStartDate = (timeframe) => {
  const today = toLocalSqlDate(new Date());

  if (timeframe === 'all') {
    return null;
  }

  if (timeframe === '30d') {
    return shiftSqlDate(today, -29);
  }

  return shiftSqlDate(today, -364);
};

const getMockWeightHistory = (timeframe) => {
  const startDate = getWeightRangeStartDate(timeframe);
  const latestEntryByDay = new Map();

  mockWeightLogs
    .filter((entry) => startDate === null || toLocalSqlDate(entry.logged_at) >= startDate)
    .sort((left, right) => left.logged_at.localeCompare(right.logged_at))
    .forEach((entry) => {
      const loggedDate = toLocalSqlDate(entry.logged_at);
      latestEntryByDay.set(loggedDate, {
        loggedDate,
        loggedAt: entry.logged_at,
        weight: entry.weight,
      });
    });

  return Array.from(latestEntryByDay.values()).sort((left, right) =>
    left.loggedDate.localeCompare(right.loggedDate)
  );
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

vi.mock('react-native-svg', async () => {
  const createSvgComponent = (displayName) => {
    const Component = ({ children, ...props }) => {
      const { onPress, ...restProps } = props;
      return React.createElement(
        'div',
        { ...restProps, onClick: onPress, 'aria-label': displayName },
        children
      );
    };
    Component.displayName = displayName;
    return Component;
  };

  return {
    default: createSvgComponent('Svg'),
    Circle: createSvgComponent('Circle'),
    Line: createSvgComponent('Line'),
    Path: createSvgComponent('Path'),
    Rect: createSvgComponent('Rect'),
    Text: createSvgComponent('SvgText'),
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
  getUserProfile: vi.fn(async () => ({
    gender: mockSettings.get('bio_gender') ?? 'nonbinary',
    age: mockSettings.get('bio_age') ?? '',
    weight: mockSettings.get('bio_weight') ?? '',
    height: mockSettings.get('bio_height') ?? '',
    activityLevel: mockSettings.get('bio_activity') ?? 'sedentary',
    goal: mockSettings.get('bio_goal') ?? 'maintain',
    dietaryPreference: mockSettings.get('bio_diet') ?? 'meathead',
  })),
  saveUserProfile: vi.fn(async (profile, options = {}) => {
    const previousWeight = mockSettings.get('bio_weight') ?? '';

    mockSettings.set('bio_gender', profile.gender);
    mockSettings.set('bio_age', profile.age);
    mockSettings.set('bio_weight', profile.weight);
    mockSettings.set('bio_height', profile.height);
    mockSettings.set('bio_activity', profile.activityLevel);
    mockSettings.set('bio_goal', profile.goal);
    mockSettings.set('bio_diet', profile.dietaryPreference);

    if (options.recordWeightHistory && previousWeight !== profile.weight && profile.weight) {
      mockWeightLogs.push({
        id: nextWeightLogId++,
        weight: Number.parseFloat(profile.weight),
        logged_at: options.recordedAt ?? new Date().toISOString(),
      });
    }
  }),
  getMacroGoals: vi.fn(async () => ({
    calories: mockSettings.get('goal_calories') ?? '2000',
    protein: mockSettings.get('goal_protein') ?? '150',
    carbs: mockSettings.get('goal_carbs') ?? '200',
    fats: mockSettings.get('goal_fats') ?? '65',
  })),
  saveMacroGoals: vi.fn(async (goals) => {
    mockSettings.set('goal_calories', goals.calories || '2000');
    mockSettings.set('goal_protein', goals.protein || '150');
    mockSettings.set('goal_carbs', goals.carbs || '200');
    mockSettings.set('goal_fats', goals.fats || '65');
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
  getLast7DayCalorieGoalStatuses: vi.fn(async () => getMockLast7DayCalorieGoalStatuses()),
  getWeightHistory: vi.fn(async (timeframe) => getMockWeightHistory(timeframe)),
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
  __setMockWeightLogs: (weightLogs) => {
    mockWeightLogs = weightLogs;
  },
}));

afterEach(() => {
  cleanup();
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
