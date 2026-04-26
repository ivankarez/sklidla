import type { Food } from '../db/dao';
import type { MealScanItemResult } from '../utils/ai';

type PendingCreatedLogFood = {
  food: Food;
  searchQuery: string;
};

let pendingCreatedLogFood: PendingCreatedLogFood | null = null;
let pendingScannedLogMealItems: MealScanItemResult[] | null = null;

export const setPendingCreatedLogFood = (value: PendingCreatedLogFood | null) => {
  pendingCreatedLogFood = value;
};

export const consumePendingCreatedLogFood = () => {
  const value = pendingCreatedLogFood;
  pendingCreatedLogFood = null;
  return value;
};

export const setPendingScannedLogMealItems = (value: MealScanItemResult[] | null) => {
  pendingScannedLogMealItems = value;
};

export const consumePendingScannedLogMealItems = () => {
  const value = pendingScannedLogMealItems;
  pendingScannedLogMealItems = null;
  return value;
};
