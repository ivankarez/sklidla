import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dao from '@/db/dao';
import {
  buildSvgLinePath,
  buildWeightChartPoints,
  calculateLoggingStreak,
  calculateNutritionAverages,
  summarizeWeightChange,
} from '@/db/stats';
import * as expoRouter from 'expo-router';
import * as reactNative from 'react-native';
import StatsScreen from '../app/(tabs)/stats';

const createLoggedAt = (daysAgo: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const createWeightLoggedAt = (daysAgo: number, hour: number = 8) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
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

  it('summarizes and charts weight history', () => {
    const points = [
      { loggedDate: '2026-04-01', loggedAt: '2026-04-01T08:00:00.000Z', weight: 82 },
      { loggedDate: '2026-04-05', loggedAt: '2026-04-05T08:00:00.000Z', weight: 80 },
      { loggedDate: '2026-04-10', loggedAt: '2026-04-10T08:00:00.000Z', weight: 79.5 },
    ];

    expect(summarizeWeightChange(points)).toEqual({
      startWeight: 82,
      endWeight: 79.5,
      change: -2.5,
    });

    const chartPoints = buildWeightChartPoints(points, 320, 180, 16);
    expect(chartPoints).toHaveLength(3);
    expect(chartPoints[0].x).toBeLessThan(chartPoints[2].x);
    expect(chartPoints[0].y).toBeLessThan(chartPoints[2].y);
    expect(buildSvgLinePath(chartPoints)).toMatch(/^M /);
  });
});

describe('statistics screen', () => {
  beforeEach(() => {
    (expoRouter as any).__resetRouterMock();
    (dao as any).__resetMockDb();
  });

  it('shows the streak and 7-day averages from recent logged days', async () => {
    await dao.setSetting('goal_calories', '450');
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
    (dao as any).__setMockWeightLogs([
      { id: 1, weight: 81.4, logged_at: createWeightLoggedAt(40) },
      { id: 2, weight: 80.8, logged_at: createWeightLoggedAt(9) },
      { id: 3, weight: 80.1, logged_at: createWeightLoggedAt(1) },
      { id: 4, weight: 79.8, logged_at: createWeightLoggedAt(0, 7) },
      { id: 5, weight: 79.6, logged_at: createWeightLoggedAt(0, 18) },
    ]);

    render(<StatsScreen />);

    await waitFor(() => {
      expect(screen.getByText('WEIGHT TREND')).toBeTruthy();
      expect(screen.queryByText('LATEST WEIGHT')).toBeNull();
      expect(screen.getByText('79.6 KG')).toBeTruthy();
      expect(screen.getByText('TOTAL CHANGE: DOWN 1.2 KG')).toBeTruthy();
      expect(screen.getByText('CURRENT STREAK')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('AVERAGED ACROSS 4 LOGGED DAYS')).toBeTruthy();
      expect(screen.getByText('500')).toBeTruthy();
      expect(screen.getByText('37.5')).toBeTruthy();
      expect(screen.getByText('45')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy();
      expect(screen.getAllByLabelText('streak-day-over')).toHaveLength(3);
      expect(screen.getAllByLabelText('streak-day-met')).toHaveLength(1);
      expect(screen.getAllByLabelText('streak-day-no_logs')).toHaveLength(3);
    });
  });

  it('switches the weight range buttons', async () => {
    (dao as any).__setMockWeightLogs([
      { id: 1, weight: 90, logged_at: createWeightLoggedAt(380) },
      { id: 2, weight: 88, logged_at: createWeightLoggedAt(200) },
      { id: 3, weight: 84, logged_at: createWeightLoggedAt(5) },
    ]);

    render(<StatsScreen />);

    await waitFor(() => {
      expect(screen.getByText('ONLY ONE DATA POINT. CHANGE COMES LATER.')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('1Y'));

    expect(screen.queryByText('COUNTING THE CHAOS...')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('TOTAL CHANGE: DOWN 4 KG')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('ALL'));

    expect(screen.queryByText('COUNTING THE CHAOS...')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('TOTAL CHANGE: DOWN 6 KG')).toBeTruthy();
    });
  });

  it('uses white chart strokes in dark mode', async () => {
    vi.spyOn(reactNative, 'useColorScheme').mockReturnValue('dark');
    (dao as any).__setMockWeightLogs([
      { id: 1, weight: 81.4, logged_at: createWeightLoggedAt(5) },
      { id: 2, weight: 80.8, logged_at: createWeightLoggedAt(3) },
      { id: 3, weight: 80.1, logged_at: createWeightLoggedAt(1) },
    ]);

    render(<StatsScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('Path')).toBeTruthy();
    });

    const path = screen.getByLabelText('Path');
    const points = screen.getAllByLabelText('Rect');

    expect(path.getAttribute('stroke')).toBe('#FFFFFF');
    expect(screen.queryByLabelText('Line')).toBeNull();
    expect(points).not.toHaveLength(0);
    points.forEach((point) => {
      expect(point.getAttribute('fill')).toBe('#FFFFFF');
    });
  });

  it('shows the exact weight when a chart point is clicked', async () => {
    (dao as any).__setMockWeightLogs([
      { id: 1, weight: 81.4, logged_at: createWeightLoggedAt(5) },
      { id: 2, weight: 80.8, logged_at: createWeightLoggedAt(3) },
      { id: 3, weight: 80.1, logged_at: createWeightLoggedAt(1) },
    ]);

    render(<StatsScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('Path')).toBeTruthy();
    });

    expect(screen.getByText('80.1 KG')).toBeTruthy();

    const pointRects = screen
      .getAllByLabelText('Rect')
      .filter((element) => element.getAttribute('height') === '12');

    fireEvent.click(pointRects[1]);

    expect(screen.getByText('80.8 KG')).toBeTruthy();
  });
});
