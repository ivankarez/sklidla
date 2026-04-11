import * as dao from '@/db/dao';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as expoRouter from 'expo-router';
import { beforeEach, describe, expect, it } from 'vitest';
import Dashboard from '../app/(tabs)/index';
import AiSetupScreen from '../app/onboarding/ai-setup';
import WelcomeScreen from '../app/onboarding/index';
import MacroSetupScreen from '../app/onboarding/macro-setup';

function calculateExpectedCalories() {
  const age = 30;
  const weight = 80;
  const height = 180;
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;

  return Math.round(bmr * 1.2);
}

describe('new user onboarding flow', () => {
  beforeEach(() => {
    (expoRouter as any).__resetRouterMock();
    (dao as any).__resetMockDb();
  });

  it('lets the user reach the dashboard and see their calculated calories', async () => {
    const expectedCalories = calculateExpectedCalories();
    const router = (expoRouter as any).__routerMock;

    const welcome = render(<WelcomeScreen />);
    fireEvent.click(screen.getByText("LET'S GO"));
    expect(router.push).toHaveBeenCalledWith('/onboarding/macro-setup');
    welcome.unmount();

    router.push.mockClear();

    const macroSetup = render(<MacroSetupScreen />);
    fireEvent.click(screen.getByText('MALE'));
    fireEvent.change(screen.getByPlaceholderText('YRS'), { target: { value: '30' } });
    fireEvent.change(screen.getByPlaceholderText('KG'), { target: { value: '80' } });
    fireEvent.change(screen.getByPlaceholderText('CM'), { target: { value: '180' } });
    fireEvent.click(screen.getByText('LOCK MACROS'));

    await waitFor(() => {
      expect(dao.setSetting).toHaveBeenCalledWith('goal_calories', expectedCalories.toString());
    });
    expect(router.push).toHaveBeenCalledWith('/onboarding/ai-setup');
    macroSetup.unmount();

    const aiSetup = render(<AiSetupScreen />);
    fireEvent.click(screen.getByText('ENTER SKLIDLA'));

    await waitFor(() => {
      expect(dao.setSetting).toHaveBeenCalledWith('onboarding_completed', 'true');
    });
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    aiSetup.unmount();

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(`REMAINING: ${expectedCalories} KCAL`)).toBeTruthy();
    });
  });
});
