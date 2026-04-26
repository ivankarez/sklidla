import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dao from '@/db/dao';
import * as expoRouter from 'expo-router';
import { Alert } from 'react-native';
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
      expect(screen.getByText('REMAINING: 1800 KCAL')).toBeTruthy();
      expect(screen.getAllByText('200').length).toBeGreaterThan(0);
    });
  });

  it('lets the user add an activity and boosts the daily calorie goal', async () => {
    await dao.saveActivityCalorieSettings({
      enabled: true,
      inclusionMode: 'all',
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('ACTIVITIES')).toBeTruthy();
      expect(screen.getByText('REMAINING: 2000 KCAL')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('open-activity-dialog'));
    fireEvent.click(screen.getByText('RUNNING'));
    fireEvent.change(screen.getByTestId('activity-duration-input'), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByTestId('activity-calories-input'), {
      target: { value: '300' },
    });
    fireEvent.click(screen.getByTestId('save-activity-cta'));

    await waitFor(() => {
      expect(screen.getByText('REMAINING: 2300 KCAL')).toBeTruthy();
      expect(screen.getByText('RUNNING')).toBeTruthy();
      expect(screen.getByText('[45 MIN]')).toBeTruthy();
      expect(screen.getByText('GOAL BOOST: +300 KCAL [100% OF 300 KCAL]')).toBeTruthy();
    });
  });

  it('lets the user edit and delete an activity from the dashboard', async () => {
    await dao.saveActivityCalorieSettings({
      enabled: true,
      inclusionMode: 'all',
    });
    (dao as any).__setMockActivities([
      {
        id: 1,
        activity_type: 'walking',
        duration_minutes: 30,
        calories_burned: 150,
        logged_at: new Date().toISOString(),
      },
    ]);

    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('walking')).toBeTruthy();
      expect(screen.getByText('REMAINING: 2150 KCAL')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('edit-activity-1'));

    await waitFor(() => {
      expect(screen.getByText('EDIT ACTIVITY')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('CYCLING'));
    fireEvent.change(screen.getByTestId('activity-duration-input'), {
      target: { value: '60' },
    });
    fireEvent.change(screen.getByTestId('activity-calories-input'), {
      target: { value: '400' },
    });
    fireEvent.click(screen.getByTestId('save-activity-cta'));

    await waitFor(() => {
      expect(screen.getByText('CYCLING')).toBeTruthy();
      expect(screen.getByText('[60 MIN]')).toBeTruthy();
      expect(screen.getByText('REMAINING: 2400 KCAL')).toBeTruthy();
      expect(screen.getByText('GOAL BOOST: +400 KCAL [100% OF 400 KCAL]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('delete-activity-1'));

    const deleteButtons = alertSpy.mock.calls[0]?.[2];
    expect(deleteButtons).toBeTruthy();
    await deleteButtons?.[1]?.onPress?.();

    await waitFor(() => {
      expect(screen.getByText('REMAINING: 2000 KCAL')).toBeTruthy();
      expect(
        screen.getByText(
          'NO MOVEMENT LOGGED YET. ADD THE WALK. ADD THE RUN. ADD THE WEIRD BIKE THING.'
        )
      ).toBeTruthy();
    });

    alertSpy.mockRestore();
  });

  it('hides activities on the dashboard when the checkbox is off and shows them again when re-enabled', async () => {
    (dao as any).__setMockActivities([
      {
        id: 1,
        activity_type: 'walking',
        duration_minutes: 30,
        calories_burned: 150,
        logged_at: new Date().toISOString(),
      },
    ]);

    const hiddenRender = render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('ACTIVITIES')).toBeNull();
      expect(screen.queryByTestId('open-activity-dialog')).toBeNull();
      expect(screen.queryByText('walking')).toBeNull();
      expect(screen.getByText('REMAINING: 2000 KCAL')).toBeTruthy();
    });

    hiddenRender.unmount();

    await dao.saveActivityCalorieSettings({
      enabled: true,
      inclusionMode: 'all',
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('ACTIVITIES')).toBeTruthy();
      expect(screen.getByTestId('open-activity-dialog')).toBeTruthy();
      expect(screen.getByText('walking')).toBeTruthy();
      expect(screen.getByText('REMAINING: 2150 KCAL')).toBeTruthy();
    });
  });
});
