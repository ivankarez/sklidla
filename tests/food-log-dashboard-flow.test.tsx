import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import * as dao from '@/db/dao';
import * as expoRouter from 'expo-router';
import Dashboard from '../app/(tabs)/index';
import LogFoodScreen from '../app/log-food';
import ManualEntryScreen from '../app/manual-entry';

describe('food creation and logging flow', () => {
  beforeEach(() => {
    (expoRouter as any).__resetRouterMock();
    (dao as any).__resetMockDb();
    (expoRouter as any).__setLocalSearchParams({});
  });

  it('lets the user add a food, log it, and see it on the dashboard', async () => {
    const router = (expoRouter as any).__routerMock;

    (expoRouter as any).__setLocalSearchParams({
      returnTo: 'log',
      name: 'Chicken Breast',
    });

    const manualEntry = render(<ManualEntryScreen />);

    const macroInputs = manualEntry.getAllByPlaceholderText('0');
    fireEvent.change(macroInputs[0], { target: { value: '200' } });
    fireEvent.change(macroInputs[1], { target: { value: '31' } });
    fireEvent.change(macroInputs[2], { target: { value: '0' } });
    fireEvent.change(macroInputs[3], { target: { value: '7' } });
    fireEvent.click(screen.getByText('SAVE TO LIBRARY'));

    await waitFor(() => {
      expect(router.back).toHaveBeenCalled();
    });
    manualEntry.unmount();

    router.back.mockClear();
    router.replace.mockClear();
    (expoRouter as any).__setLocalSearchParams({});

    const logFood = render(<LogFoodScreen />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeTruthy();
    });

    expect(screen.queryByTestId('save-meal-cta')).toBeNull();

    const foodOption = screen.getAllByText('Chicken Breast')[0].closest('[tabindex="0"]');
    expect(foodOption).toBeTruthy();
    fireEvent.click(foodOption as Element);

    await waitFor(() => {
      expect(screen.getByText('ADD TO LOG')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('ADD TO LOG'));

    await waitFor(() => {
      expect(screen.getAllByText('Chicken Breast').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByTestId('save-meal-cta'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/(tabs)',
        params: { toastMessage: expect.any(String) },
      });
    });
    logFood.unmount();

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeTruthy();
      expect(screen.getByText('REMAINING: 2300 KCAL')).toBeTruthy();
      expect(screen.getAllByText('200').length).toBeGreaterThan(0);
    });
  });
});
