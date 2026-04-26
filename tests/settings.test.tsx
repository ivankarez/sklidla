import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import * as dao from '@/db/dao';
import * as expoRouter from 'expo-router';
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
      expect(dao.saveMacroGoals).toHaveBeenCalled();
      expect(dao.saveUserProfile).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
