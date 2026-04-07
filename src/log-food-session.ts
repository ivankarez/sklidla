import type { Food } from '../db/dao';

type PendingCreatedLogFood = {
  food: Food;
  searchQuery: string;
};

let pendingCreatedLogFood: PendingCreatedLogFood | null = null;

export const setPendingCreatedLogFood = (value: PendingCreatedLogFood | null) => {
  pendingCreatedLogFood = value;
};

export const consumePendingCreatedLogFood = () => {
  const value = pendingCreatedLogFood;
  pendingCreatedLogFood = null;
  return value;
};
