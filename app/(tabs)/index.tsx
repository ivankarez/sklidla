import { View, Text, ScrollView, Pressable, TextInput } from '@/src/tw';
import { Alert, Modal, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  addActivity,
  calculateEffectiveActivityCalories,
  deleteActivity,
  deleteLog,
  getActivitiesByDate,
  getActivityCalorieSettings,
  getLogsByDate,
  getMacroGoals,
  updateActivity,
  type ActivityCalorieSettings,
  type ActivityEntry,
  type ActivityType,
  type LogEntry,
} from '@/db/dao';
import { Animated } from '@/src/tw/animated';
import { useSharedValue, withTiming, withDelay, Easing, useAnimatedStyle } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { getRandomLedgerEmptyMessage } from '@/constants/unhinged-toast';

function AnimatedProgressBar({ percent, delay = 0, label, value }: { percent: number, delay?: number, label: string, value: string }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(delay, withTiming(percent, {
      duration: 800,
      easing: Easing.out(Easing.exp)
    }));
  }, [percent, delay, width]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${width.value}%`,
    };
  });

  return (
    <View className="w-full h-12 bg-white border-4 border-black relative justify-center">
      <Animated.View 
        className="absolute left-0 top-0 bottom-0 bg-black z-0 pointer-events-none" 
        style={[{ position: 'absolute', left: 0, top: 0, bottom: 0 }, animatedStyle]}
      />

      <View className="absolute inset-0 flex-row justify-between items-center px-3 z-10 pointer-events-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <Text className="font-mono text-base font-black" style={{ color: '#FFFFFF', mixBlendMode: 'difference' } as any}>{label}</Text>
        <Text className="font-mono text-base font-bold" style={{ color: '#FFFFFF', mixBlendMode: 'difference' } as any}>{value}</Text>
      </View>
    </View>
  );
}

const ACTIVITY_TYPE_OPTIONS: { id: ActivityType; label: string }[] = [
  { id: 'walking', label: 'WALKING' },
  { id: 'running', label: 'RUNNING' },
  { id: 'cycling', label: 'CYCLING' },
  { id: 'other', label: 'OTHER' },
];

const formatActivityNumber = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(1);
};

const formatActivityInclusionMode = (settings: ActivityCalorieSettings) => {
  if (!settings.enabled) {
    return 'OFF';
  }

  if (settings.inclusionMode === 'none') {
    return '0%';
  }

  if (settings.inclusionMode === 'half') {
    return '50%';
  }

  return '100%';
};

export default function Dashboard() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [goals, setGoals] = useState({ cal: 2500, pro: 150, car: 200, fat: 65 });
  const [activitySettings, setActivitySettings] = useState<ActivityCalorieSettings>({
    enabled: false,
    inclusionMode: 'half',
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastMounted, setIsToastMounted] = useState(false);
  const [emptyLedgerMessage, setEmptyLedgerMessage] = useState(() => getRandomLedgerEmptyMessage());
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>('walking');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityCalories, setActivityCalories] = useState('');
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ toastMessage?: string }>();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const isActivitiesVisible = activitySettings.enabled;
  const activityAddButtonBg = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const activityAddButtonFg = colorScheme === 'dark' ? '#000000' : '#FFFFFF';
  const toastOpacity = useSharedValue(0);
  const toastTranslateY = useSharedValue(16);
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastUnmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSqlDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = useCallback(async (date: Date) => {
    const sqlDate = getSqlDate(date);
    const [dayLogs, dayActivities, macroGoals, nextActivitySettings] = await Promise.all([
      getLogsByDate(sqlDate),
      getActivitiesByDate(sqlDate),
      getMacroGoals(),
      getActivityCalorieSettings(),
    ]);

    setLogs(dayLogs);
    setActivities(dayActivities);
    setActivitySettings(nextActivitySettings);

    const cal = Number.parseInt(macroGoals.calories, 10);
    const pro = Number.parseInt(macroGoals.protein, 10);
    const car = Number.parseInt(macroGoals.carbs, 10);
    const fat = Number.parseInt(macroGoals.fats, 10);

    setGoals({
      cal: Number.isFinite(cal) ? cal : 2500,
      pro: Number.isFinite(pro) ? pro : 150,
      car: Number.isFinite(car) ? car : 200,
      fat: Number.isFinite(fat) ? fat : 65,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(currentDate);
    }, [currentDate, loadData])
  );

  const toastAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: toastOpacity.value,
      transform: [{ translateY: toastTranslateY.value }],
    };
  });

  const clearToastTimers = useCallback(() => {
    if (toastHideTimerRef.current) {
      clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }
    if (toastUnmountTimerRef.current) {
      clearTimeout(toastUnmountTimerRef.current);
      toastUnmountTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const incomingToast = Array.isArray(params.toastMessage) ? params.toastMessage[0] : params.toastMessage;
    if (!incomingToast) return;
    clearToastTimers();
    setIsToastMounted(true);
    setToastMessage(incomingToast);

    toastOpacity.value = 0;
    toastTranslateY.value = 16;
    toastOpacity.value = withTiming(1, { duration: 160 });
    toastTranslateY.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });

    toastHideTimerRef.current = setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 220 });
      toastTranslateY.value = withTiming(16, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      });
      toastUnmountTimerRef.current = setTimeout(() => {
        setIsToastMounted(false);
        setToastMessage(null);
      }, 230);
    }, 2200);

    router.setParams({ toastMessage: undefined });
  }, [params.toastMessage, router, clearToastTimers, toastOpacity, toastTranslateY]);

  useEffect(() => {
    return () => clearToastTimers();
  }, [clearToastTimers]);

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleDelete = async (id: number) => {
    Alert.alert('DELETE ENTRY', 'REMOVE THIS LOG?', [
      { text: 'CANCEL', style: 'cancel' },
      { text: 'DELETE', style: 'destructive', onPress: async () => {
        await deleteLog(id);
        loadData(currentDate);
      }}
    ]);
  };

  const handleEdit = (log: LogEntry) => {
    router.push({
      pathname: '/verification',
      params: { 
        logId: log.id,
        foodId: log.food_id
      }
    });
  };

  const resetActivityForm = useCallback(() => {
    setEditingActivityId(null);
    setActivityType('walking');
    setActivityDuration('');
    setActivityCalories('');
  }, []);

  const handleOpenNewActivityDialog = useCallback(() => {
    if (!isActivitiesVisible) {
      return;
    }

    resetActivityForm();
    setIsActivityDialogOpen(true);
  }, [isActivitiesVisible, resetActivityForm]);

  const handleCloseActivityDialog = useCallback(() => {
    if (isSavingActivity) {
      return;
    }

    setIsActivityDialogOpen(false);
    resetActivityForm();
  }, [isSavingActivity, resetActivityForm]);

  const handleEditActivity = useCallback((activity: ActivityEntry) => {
    if (!isActivitiesVisible) {
      return;
    }

    setEditingActivityId(activity.id);
    setActivityType(activity.activity_type);
    setActivityDuration(formatActivityNumber(activity.duration_minutes));
    setActivityCalories(formatActivityNumber(activity.calories_burned));
    setIsActivityDialogOpen(true);
  }, [isActivitiesVisible]);

  useEffect(() => {
    if (!isActivitiesVisible) {
      setIsActivityDialogOpen(false);
      resetActivityForm();
    }
  }, [isActivitiesVisible, resetActivityForm]);

  const handleDeleteActivity = useCallback((id: number) => {
    Alert.alert('DELETE ACTIVITY', 'REMOVE THIS ACTIVITY?', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          await deleteActivity(id);
          loadData(currentDate);
        },
      },
    ]);
  }, [currentDate, loadData]);

  const buildLoggedAtForSelectedDate = useCallback((date: Date) => {
    const now = new Date();
    const localDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      0
    );
    return localDateTime.toISOString();
  }, []);

  const handleSaveActivity = useCallback(async () => {
    const durationMinutes = Number.parseFloat(activityDuration);
    const caloriesBurned = Number.parseFloat(activityCalories);

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      Alert.alert('NEED THE TIME', 'ADD HOW LONG YOU WERE MOVING IN MINUTES.');
      return;
    }

    if (!Number.isFinite(caloriesBurned) || caloriesBurned <= 0) {
      Alert.alert('NEED THE BURN', 'ADD HOW MANY CALORIES THIS THING TORCHED.');
      return;
    }

    setIsSavingActivity(true);

    try {
      if (editingActivityId === null) {
        await addActivity({
          activityType,
          durationMinutes,
          caloriesBurned,
          loggedAt: buildLoggedAtForSelectedDate(currentDate),
        });
      } else {
        await updateActivity(editingActivityId, activityType, durationMinutes, caloriesBurned);
      }
      setIsActivityDialogOpen(false);
      resetActivityForm();
      await loadData(currentDate);
    } catch (error) {
      console.error('Failed to save activity', error);
      Alert.alert('ERROR', 'COULD NOT SAVE THAT ACTIVITY.');
    } finally {
      setIsSavingActivity(false);
    }
  }, [
    activityCalories,
    activityDuration,
    activityType,
    buildLoggedAtForSelectedDate,
    currentDate,
    editingActivityId,
    loadData,
    resetActivityForm,
  ]);

  const totalCals = logs.reduce((sum, log) => sum + log.hardcoded_calories, 0);
  const totalPro = logs.reduce((sum, log) => sum + log.hardcoded_protein, 0);
  const totalCar = logs.reduce((sum, log) => sum + log.hardcoded_carbs, 0);
  const totalFat = logs.reduce((sum, log) => sum + log.hardcoded_fats, 0);
  const totalActivityCalories = activities.reduce((sum, activity) => sum + activity.calories_burned, 0);
  const effectiveActivityCalories = calculateEffectiveActivityCalories(
    totalActivityCalories,
    activitySettings
  );
  const adjustedCalorieGoal = goals.cal + effectiveActivityCalories;

  const remainingCals = adjustedCalorieGoal - totalCals;

  const proPercent = Math.min(100, (totalPro / goals.pro) * 100);
  const carPercent = Math.min(100, (totalCar / goals.car) * 100);
  const fatPercent = Math.min(100, (totalFat / goals.fat) * 100);

  const displayDate = currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  useEffect(() => {
    if (logs.length === 0) {
      setEmptyLedgerMessage(getRandomLedgerEmptyMessage());
    }
  }, [currentDate, logs.length]);

  const renderRightActions = (prog: any, drag: any, log: LogEntry) => {
    return (
      <View className="flex-row items-center h-full">
        <Pressable 
          onPress={() => handleEdit(log)} 
          className="bg-white w-20 h-full justify-center items-center border-l-4 border-b-4 border-black"
        >
          <MaterialIcons name="edit" size={28} color={iconColor} />
        </Pressable>
        <Pressable 
          onPress={() => handleDelete(log.id)} 
          className="bg-white w-20 h-full justify-center items-center border-l-4 border-b-4 border-black"
        >
          <MaterialIcons name="delete" size={28} color={iconColor} />
        </Pressable>
      </View>
    );
  };

  const renderActivityRightActions = (prog: any, drag: any, activity: ActivityEntry) => {
    return (
      <View className="flex-row items-center h-full">
        <Pressable
          testID={`edit-activity-${activity.id}`}
          onPress={() => handleEditActivity(activity)}
          className="bg-white w-20 h-full justify-center items-center border-l-4 border-b-4 border-black"
        >
          <MaterialIcons name="edit" size={28} color={iconColor} />
        </Pressable>
        <Pressable
          testID={`delete-activity-${activity.id}`}
          onPress={() => handleDeleteActivity(activity.id)}
          className="bg-white w-20 h-full justify-center items-center border-l-4 border-b-4 border-black"
        >
          <MaterialIcons name="delete" size={28} color={iconColor} />
        </Pressable>
      </View>
    );
  };

  const formatAmountAndUnit = (log: LogEntry) => {
    const unit = log.serving_size_id ? (log.serving_size_name || 'unit') : 'g';
    return `${log.amount_logged} ${unit}`;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      {/* Header section with Date Navigation */}
      <View className="px-5 py-4 border-b-8 border-black mb-4 flex-row justify-between items-center">
        <Pressable onPress={goToPreviousDay} className="p-2">
          <MaterialIcons name="chevron-left" size={36} color={iconColor} />
        </Pressable>
        <Text className="font-mono text-2xl font-black text-black tracking-tighter">{displayDate}</Text>
        <Pressable onPress={goToNextDay} className="p-2">
          <MaterialIcons name="chevron-right" size={36} color={iconColor} />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-10">
        
        {/* Main Stats Area */}
        <View className="mb-10 items-center">
          <Text 
            className="font-mono font-black text-black tracking-tighter" 
            style={{ fontSize: 96, lineHeight: 96 }}
          >
            {Math.round(totalCals)}
          </Text>
          <Text className="font-mono text-sm font-bold text-black bg-black text-white px-3 py-1 mt-2">
            {remainingCals >= 0 ? `REMAINING: ${Math.round(remainingCals)} KCAL` : `OVER: ${Math.round(Math.abs(remainingCals))} KCAL`}
          </Text>
        </View>
          
        {/* Progress bars */}
        <View className="gap-4 mb-10">
          <AnimatedProgressBar 
            label="PROTEIN" 
            value={`${Math.round(totalPro)} / ${goals.pro}G`} 
            percent={proPercent} 
            delay={100} 
          />
          <AnimatedProgressBar 
            label="CARBS" 
            value={`${Math.round(totalCar)} / ${goals.car}G`} 
            percent={carPercent} 
            delay={300} 
          />
          <AnimatedProgressBar 
            label="FATS" 
            value={`${Math.round(totalFat)} / ${goals.fat}G`} 
            percent={fatPercent} 
            delay={500} 
          />
        </View>

        {isActivitiesVisible ? (
          <View className="mt-2 mb-10">
            <View className="flex-row items-center justify-between mb-4 gap-3">
              <View className="flex-1 flex-row items-center">
                <Text className="font-mono text-2xl font-black text-black bg-white pr-2 z-10">
                  ACTIVITIES
                </Text>
                <View className="flex-1 h-1 bg-black -ml-2" />
              </View>
              <Pressable
                testID="open-activity-dialog"
                onPress={handleOpenNewActivityDialog}
                className="bg-black border-2 border-black px-3 py-2 flex-row items-center"
                style={{
                  backgroundColor: activityAddButtonBg,
                  borderColor: activityAddButtonBg,
                }}
              >
                <MaterialIcons name="add" size={18} color={activityAddButtonFg} />
                <Text
                  className="font-mono text-xs font-black ml-1"
                  style={{ color: activityAddButtonFg }}
                >
                  ADD
                </Text>
              </Pressable>
            </View>

            <Text className="font-mono text-xs font-bold text-black mb-4">
              {activities.length > 0
                ? `GOAL BOOST: +${Math.round(effectiveActivityCalories)} KCAL [${formatActivityInclusionMode(activitySettings)} OF ${Math.round(totalActivityCalories)} KCAL]`
                : `GOAL BOOST READY. CURRENT MODE: ${formatActivityInclusionMode(activitySettings)}`}
            </Text>

            {activities.length === 0 ? (
              <View className="border-4 border-black border-dashed p-6 items-center">
                <Text className="font-mono text-base font-black text-black text-center">
                  NO MOVEMENT LOGGED YET. ADD THE WALK. ADD THE RUN. ADD THE WEIRD BIKE THING.
                </Text>
              </View>
            ) : (
              <View className="border-4 border-black border-b-0">
                {activities.map((activity) => (
                  <Swipeable
                    key={activity.id}
                    renderRightActions={(prog, drag) =>
                      renderActivityRightActions(prog, drag, activity)
                    }
                    containerStyle={{ overflow: 'hidden' }}
                  >
                    <View className="flex-row justify-between items-center p-4 border-b-4 border-black bg-white">
                      <View className="flex-1 pr-4">
                        <Text className="font-mono text-lg font-black text-black leading-tight uppercase">
                          {activity.activity_type}
                        </Text>
                        <Text className="font-mono text-sm font-bold text-black mt-1">
                          [{formatActivityNumber(activity.duration_minutes)} MIN]
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-mono text-2xl font-black text-black">
                          {Math.round(activity.calories_burned)}
                        </Text>
                        <Text className="font-mono text-xs font-bold text-black">BURNED</Text>
                      </View>
                    </View>
                  </Swipeable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Ledger Section */}
        <View className="mt-2">
          <View className="flex-row items-center mb-4">
            <Text className="font-mono text-2xl font-black text-black bg-white pr-2 z-10">THE LEDGER</Text>
            <View className="flex-1 h-1 bg-black -ml-2" />
          </View>
          
          {logs.length === 0 ? (
            <View className="border-4 border-black border-dashed p-6 items-center">
              <Text className="font-mono text-base font-black text-black text-center">{emptyLedgerMessage}</Text>
            </View>
          ) : (
            <View key="ledger-list" className="border-4 border-black border-b-0 will-change-variable">
              {logs.map((log) => (
                <Swipeable 
                  key={log.id}
                  renderRightActions={(prog, drag) => renderRightActions(prog, drag, log)}
                  containerStyle={{ overflow: 'hidden' }}
                >
                  <View className="flex-row justify-between items-center p-4 border-b-4 border-black bg-white">
                    <View className="flex-1 pr-4">
                      <Text className="font-mono text-lg font-black text-black leading-tight uppercase">{log.name}</Text>
                      <Text className="font-mono text-sm font-bold text-black mt-1">[{formatAmountAndUnit(log)}]</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-mono text-2xl font-black text-black">{Math.round(log.hardcoded_calories)}</Text>
                      <Text className="font-mono text-xs font-bold text-black">KCAL</Text>
                    </View>
                  </View>
                </Swipeable>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {isToastMounted && toastMessage ? (
        <Animated.View
          className="absolute left-4 right-4 bg-black border-4 border-white px-4 py-3"
          style={[{ bottom: insets.bottom + 12 }, toastAnimatedStyle]}
        >
          <Text className="font-mono text-sm font-black text-white text-center uppercase">
            {toastMessage}
          </Text>
        </Animated.View>
      ) : null}

      <Modal visible={isActivitiesVisible && isActivityDialogOpen} animationType="fade" transparent onRequestClose={handleCloseActivityDialog}>
        <View className="flex-1 justify-center px-5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
          <View className="bg-white border-4 border-black p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-mono text-2xl font-black text-black">
                {editingActivityId === null ? 'ADD ACTIVITY' : 'EDIT ACTIVITY'}
              </Text>
              <Pressable onPress={handleCloseActivityDialog} className="border-2 border-black px-3 py-1.5">
                <Text className="font-mono text-xs font-black text-black">CLOSE</Text>
              </Pressable>
            </View>

            <Text className="font-mono text-sm font-bold text-black mb-2">TYPE</Text>
            <View className="flex-row flex-wrap mb-5">
              {ACTIVITY_TYPE_OPTIONS.map((option, index) => (
                <Pressable
                  key={option.id}
                  onPress={() => setActivityType(option.id)}
                  className={`border-2 border-black px-3 py-2 mb-2 ${activityType === option.id ? 'bg-black' : 'bg-white'} ${index % 2 === 0 ? 'mr-2' : ''}`}
                  style={{ minWidth: '47%' }}
                >
                  <Text
                    className={`font-mono text-xs font-black text-center ${
                      activityType === option.id ? 'text-white' : 'text-black'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mb-5">
              <Text className="font-mono text-sm font-bold text-black mb-2">TIME (MIN)</Text>
              <TextInput
                testID="activity-duration-input"
                className="font-mono border-2 border-black bg-white p-4 text-base text-black"
                value={activityDuration}
                onChangeText={setActivityDuration}
                keyboardType="numeric"
                placeholder="45"
                placeholderTextColor="#999"
              />
            </View>

            <View className="mb-6">
              <Text className="font-mono text-sm font-bold text-black mb-2">CALORIES BURNED</Text>
              <TextInput
                testID="activity-calories-input"
                className="font-mono border-2 border-black bg-white p-4 text-base text-black"
                value={activityCalories}
                onChangeText={setActivityCalories}
                keyboardType="numeric"
                placeholder="300"
                placeholderTextColor="#999"
              />
            </View>

            <Pressable
              testID="save-activity-cta"
              onPress={() => {
                void handleSaveActivity();
              }}
              className="bg-black border-2 border-black py-4 items-center"
            >
              <Text className="font-mono text-base font-black text-white">
                {isSavingActivity
                  ? editingActivityId === null
                    ? 'SAVING...'
                    : 'UPDATING...'
                  : editingActivityId === null
                    ? 'SAVE ACTIVITY'
                    : 'UPDATE ACTIVITY'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
