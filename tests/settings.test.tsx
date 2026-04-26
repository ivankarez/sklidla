import * as dao from '@/db/dao';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as expoRouter from 'expo-router';
import { beforeEach, describe, expect, it } from 'vitest';
import SettingsScreen from '../app/(tabs)/settings';

describe('settings screen', () => {
  beforeEach(() => {
    (expoRouter as any).__resetRouterMock();
    (dao as any).__resetMockDb();
  });

  it('auto-saves settings after loading', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('ABOUT ME')).toBeTruthy();
    });

    await waitFor(() => {
      expect(dao.setSetting).toHaveBeenCalledWith('ai_enabled', 'true');
      expect(dao.setSetting).toHaveBeenCalledWith('ai_provider', 'OpenRouter');
      expect(dao.setSetting).toHaveBeenCalledWith('theme_preference', 'system');
      expect(dao.saveActivityCalorieSettings).toHaveBeenCalledWith({
        enabled: true,
        inclusionMode: 'half',
      });
      expect(dao.saveWaterTrackingSettings).toHaveBeenCalledWith({
        enabled: true,
        stepAmountMl: 250,
      });
      expect(dao.saveMacroGoals).toHaveBeenCalled();
      expect(dao.saveUserProfile).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('saves the activity calorie controls', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('ACTIVITY CALORIES')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('INCLUDE ALL'));

    await waitFor(() => {
      expect(dao.saveActivityCalorieSettings).toHaveBeenCalledWith({
        enabled: true,
        inclusionMode: 'all',
      });
    }, { timeout: 2000 });
  });

  it('saves the water tracking controls', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('WATER TRACKING')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('300 ML'));

    await waitFor(() => {
      expect(dao.saveWaterTrackingSettings).toHaveBeenCalledWith({
        enabled: true,
        stepAmountMl: 300,
      });
    }, { timeout: 2000 });
  });

  it('switches the app to imperial units and converts body inputs for display', async () => {
    await dao.setSetting('bio_weight', '80');
    await dao.setSetting('bio_height', '180');

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('UNITS')).toBeTruthy();
      expect(screen.getByDisplayValue('80')).toBeTruthy();
      expect(screen.getByDisplayValue('180')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('IMPERIAL'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('176.4')).toBeTruthy();
      expect(screen.getByDisplayValue('70.9')).toBeTruthy();
      expect(dao.saveMeasurementSystem).toHaveBeenCalledWith('imperial');
    }, { timeout: 2000 });
  });
});
