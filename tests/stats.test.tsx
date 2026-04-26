import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import * as dao from '@/db/dao';
import { calculateLoggingStreak, calculateNutritionAverages } from '@/db/stats';
import * as expoRouter from 'expo-router';
import StatsScreen from '../app/(tabs)/stats';

const createLoggedAt = (daysAgo: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

describe('statistics helpers', () => {
  it('counts a streak across consecutive logged days', () => {
    const referenceDate = new Date('2026-04-25T12:00:00');

    expect(
      calculateLoggingStreak(
        ['2026-04-25', '2026-04-24', '2026-04-23', '2026-04-20'],
        referenceDate
      )
    ).toBe(3);
  });

  it('keeps the streak alive through yesterday when today is still empty', () => {
    const referenceDate = new Date('2026-04-25T12:00:00');

    expect(
      calculateLoggingStreak(['2026-04-24', '2026-04-23', '2026-04-22'], referenceDate)
    ).toBe(3);
  });

  it('resets the streak when the user missed both today and yesterday', () => {
    const referenceDate = new Date('2026-04-25T12:00:00');

    expect(calculateLoggingStreak(['2026-04-23', '2026-04-22'], referenceDate)).toBe(0);
  });

  it('averages nutrition across logged days only', () => {
    expect(
      calculateNutritionAverages([
        { loggedDate: '2026-04-25', calories: 600, protein: 40, carbs: 50, fats: 20 },
        { loggedDate: '2026-04-24', calories: 400, protein: 20, carbs: 30, fats: 10 },
      ])
    ).toEqual({
      averageCalories: 500,
      averageProtein: 30,
      averageCarbs: 40,
      averageFats: 15,
      daysLogged: 2,
    });
  });
});

describe('statistics screen', () => {
  beforeEach(() => {
    (expoRouter as any).__resetRouterMock();
    (dao as any).__resetMockDb();
  });

  it('shows the streak and 7-day averages from recent logged days', async () => {
    (dao as any).__setMockLogs([
      {
        id: 1,
        food_id: 1,
        serving_size_id: null,
        serving_size_name: null,
        amount_logged: 1,
        hardcoded_calories: 500,
        hardcoded_protein: 40,
        hardcoded_carbs: 50,
        hardcoded_fats: 20,
        logged_at: createLoggedAt(0),
        name: 'TODAY FOOD',
      },
      {
        id: 2,
        food_id: 2,
        serving_size_id: null,
        serving_size_name: null,
        amount_logged: 1,
        hardcoded_calories: 300,
        hardcoded_protein: 20,
        hardcoded_carbs: 30,
        hardcoded_fats: 10,
        logged_at: createLoggedAt(1),
        name: 'YESTERDAY FOOD',
      },
      {
        id: 3,
        food_id: 3,
        serving_size_id: null,
        serving_size_name: null,
        amount_logged: 1,
        hardcoded_calories: 700,
        hardcoded_protein: 60,
        hardcoded_carbs: 40,
        hardcoded_fats: 30,
        logged_at: createLoggedAt(2),
        name: 'TWO DAYS AGO FOOD',
      },
      {
        id: 4,
        food_id: 4,
        serving_size_id: null,
        serving_size_name: null,
        amount_logged: 1,
        hardcoded_calories: 500,
        hardcoded_protein: 30,
        hardcoded_carbs: 60,
        hardcoded_fats: 20,
        logged_at: createLoggedAt(5),
        name: 'FIVE DAYS AGO FOOD',
      },
      {
        id: 5,
        food_id: 5,
        serving_size_id: null,
        serving_size_name: null,
        amount_logged: 1,
        hardcoded_calories: 900,
        hardcoded_protein: 90,
        hardcoded_carbs: 80,
        hardcoded_fats: 40,
        logged_at: createLoggedAt(8),
        name: 'OLD FOOD',
      },
    ]);

    render(<StatsScreen />);

    await waitFor(() => {
      expect(screen.getByText('CURRENT STREAK')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('AVERAGED ACROSS 4 LOGGED DAYS')).toBeTruthy();
      expect(screen.getByText('500')).toBeTruthy();
      expect(screen.getByText('37.5')).toBeTruthy();
      expect(screen.getByText('45')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy();
    });
  });
});
