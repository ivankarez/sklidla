import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as dao from '@/db/dao';
import * as expoRouter from 'expo-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cameraMocks = vi.hoisted(() => ({
  takePictureAsync: vi.fn(),
  pausePreview: vi.fn(),
  resumePreview: vi.fn(),
  requestPermission: vi.fn(),
  processFoodImage: vi.fn(),
  processMealImage: vi.fn(),
  manipulateAsync: vi.fn(),
}));

vi.mock('expo-camera', async () => {
  const React = await import('react');
  const reactNative = await import('react-native');

  const CameraView = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: cameraMocks.takePictureAsync,
      pausePreview: cameraMocks.pausePreview,
      resumePreview: cameraMocks.resumePreview,
    }));

    return React.createElement(reactNative.View);
  });

  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true }, cameraMocks.requestPermission],
  };
});

vi.mock('../utils/ai', () => ({
  processFoodImage: cameraMocks.processFoodImage,
  processMealImage: cameraMocks.processMealImage,
}));

vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: cameraMocks.manipulateAsync,
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

import CameraScreen from '../app/camera';
import ManualEntryScreen from '../app/manual-entry';

describe('camera screen', () => {
  beforeEach(() => {
    (expoRouter as any).__resetRouterMock();
    (dao as any).__resetMockDb();
    cameraMocks.takePictureAsync.mockReset();
    cameraMocks.pausePreview.mockReset();
    cameraMocks.resumePreview.mockReset();
    cameraMocks.requestPermission.mockReset();
    cameraMocks.processFoodImage.mockReset();
    cameraMocks.processMealImage.mockReset();
    cameraMocks.manipulateAsync.mockReset();
  });

  it('returns to manual entry even if pausing the preview would hang', async () => {
    const router = (expoRouter as any).__routerMock;

    (expoRouter as any).__setLocalSearchParams({
      mode: 'auto',
      source: 'manual-entry',
      nameHint: 'banana',
      brandHint: 'store brand',
      returnParams: JSON.stringify({
        returnTo: 'library',
        libraryMode: 'select',
      }),
    });

    cameraMocks.takePictureAsync.mockResolvedValue({
      uri: 'file://banana.jpg',
      width: 3024,
      height: 4032,
    });
    cameraMocks.pausePreview.mockImplementation(() => new Promise<void>(() => {}));
    cameraMocks.manipulateAsync.mockResolvedValue({
      uri: 'file://banana-resized.jpg',
      width: 1200,
      height: 1600,
      base64: 'RESIZEDBASE64',
    });
    cameraMocks.processFoodImage.mockResolvedValue({
      name: 'Banana',
      calories_per_100g: 89,
      protein_per_100g: 1.1,
      carbs_per_100g: 22.8,
      fats_per_100g: 0.3,
      estimated_weight_g: 118,
      serving_size_g: 118,
      serving_sizes: [
        { name: 'medium banana', weight_g: 118 },
      ],
    });

    render(<CameraScreen />);

    fireEvent.click(screen.getByTestId('capture-photo-cta'));

    await waitFor(() => {
      expect(cameraMocks.takePictureAsync).toHaveBeenCalledWith({
        base64: false,
        quality: 1,
        shutterSound: false,
      });
    });

    await waitFor(() => {
      expect(cameraMocks.manipulateAsync).toHaveBeenCalledWith(
        'file://banana.jpg',
        [{ resize: { height: 1600 } }],
        {
          base64: true,
          compress: 0.8,
          format: 'jpeg',
        }
      );
    });

    await waitFor(() => {
      expect(cameraMocks.processFoodImage).toHaveBeenCalledWith({
        base64Image: 'RESIZEDBASE64',
        nameHint: 'banana',
        brandHint: 'store brand',
      });
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/manual-entry',
        params: {
          returnTo: 'library',
          libraryMode: 'select',
          name: 'Banana',
          cals: '89',
          pro: '1.1',
          car: '22.8',
          fat: '0.3',
          aiServings: JSON.stringify([{ name: 'medium banana', weight: 118 }]),
        },
      });
    });
  });

  it('renders the shared bottom scanner controls for the active mode', () => {
    (expoRouter as any).__setLocalSearchParams({
      mode: 'auto',
    });

    render(<CameraScreen />);

    expect(screen.getByText('[ CANCEL ]')).toBeTruthy();
    expect(screen.getByText('AUTO SCANNER')).toBeTruthy();
    expect(screen.getByText('FLASH')).toBeTruthy();
    expect(screen.getByText('CAMERA')).toBeTruthy();
  });

  it('restores the previous add-food draft when aborting from manual entry', async () => {
    const router = (expoRouter as any).__routerMock;

    (expoRouter as any).__setLocalSearchParams({
      mode: 'auto',
      source: 'manual-entry',
      returnParams: JSON.stringify({
        name: 'Draft Food',
        brand: 'Draft Brand',
        cals: '123',
        pro: '10',
        car: '11',
        fat: '12',
        aiServings: JSON.stringify([{ name: 'slice', weight: 30 }]),
        returnTo: 'log',
      }),
    });

    render(<CameraScreen />);

    fireEvent.click(screen.getByText('[ CANCEL ]'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/manual-entry',
      params: {
        name: 'Draft Food',
        brand: 'Draft Brand',
        cals: '123',
        pro: '10',
        car: '11',
        fat: '12',
        aiServings: JSON.stringify([{ name: 'slice', weight: 30 }]),
        returnTo: 'log',
      },
    });
  });

  it('shows the processing spinner while AI is processing', async () => {
    (expoRouter as any).__setLocalSearchParams({
      mode: 'auto',
    });

    cameraMocks.takePictureAsync.mockResolvedValue({
      uri: 'file://lunch.jpg',
      width: 1200,
      height: 1200,
    });
    cameraMocks.manipulateAsync.mockResolvedValue({
      uri: 'file://lunch-resized.jpg',
      width: 1200,
      height: 1200,
      base64: 'BASE64',
    });
    cameraMocks.processFoodImage.mockImplementation(() => new Promise(() => {}));

    render(<CameraScreen />);

    fireEvent.click(screen.getByTestId('capture-photo-cta'));

    await waitFor(() => {
      expect(screen.getByTestId('camera-processing-state')).toBeTruthy();
    });

    expect(screen.getByTestId('camera-processing-spinner')).toBeTruthy();
  });

  it('returns scanned meal items to the log meal flow', async () => {
    const router = (expoRouter as any).__routerMock;
    const logFoodSession = await import('@/src/log-food-session');

    (expoRouter as any).__setLocalSearchParams({
      mode: 'meal',
      source: 'log-meal',
    });

    cameraMocks.takePictureAsync.mockResolvedValue({
      uri: 'file://meal.jpg',
      width: 2000,
      height: 1500,
    });
    cameraMocks.manipulateAsync.mockResolvedValue({
      uri: 'file://meal-resized.jpg',
      width: 1600,
      height: 1200,
      base64: 'MEALBASE64',
    });
    cameraMocks.processMealImage.mockResolvedValue({
      items: [
        {
          name: 'Spaghetti',
          calories_per_100g: 160,
          protein_per_100g: 5.8,
          carbs_per_100g: 31,
          fats_per_100g: 1.1,
          estimated_amount: 1,
          estimated_amount_unit: 'portion',
          estimated_weight_g: 320,
          serving_sizes: [{ name: 'portion', weight_g: 320 }],
        },
      ],
    });

    render(<CameraScreen />);

    fireEvent.click(screen.getByTestId('capture-photo-cta'));

    await waitFor(() => {
      expect(cameraMocks.processMealImage).toHaveBeenCalledWith({
        base64Image: 'MEALBASE64',
        nameHint: undefined,
        brandHint: undefined,
      });
    });

    expect(logFoodSession.consumePendingScannedLogMealItems()).toEqual([
      {
        name: 'Spaghetti',
        calories_per_100g: 160,
        protein_per_100g: 5.8,
        carbs_per_100g: 31,
        fats_per_100g: 1.1,
        estimated_amount: 1,
        estimated_amount_unit: 'portion',
        estimated_weight_g: 320,
        serving_sizes: [{ name: 'portion', weight_g: 320 }],
      },
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('opens the camera with replace and preserves the current add-food draft', async () => {
    const router = (expoRouter as any).__routerMock;
    (dao as any).__setMockSetting('ai_enabled', 'true');

    (expoRouter as any).__setLocalSearchParams({
      returnTo: 'library',
      libraryMode: 'select',
    });

    render(<ManualEntryScreen />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Chicken Breast'), {
      target: { value: 'Draft Food' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Tyson'), {
      target: { value: 'Draft Brand' },
    });

    await waitFor(() => {
      expect(screen.getByText('SNAP PHOTO')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('SNAP PHOTO'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/camera',
        params: {
          mode: 'auto',
          source: 'manual-entry',
          nameHint: 'Draft Food',
          brandHint: 'Draft Brand',
          returnParams: JSON.stringify({
            name: 'Draft Food',
            brand: 'Draft Brand',
            cals: '',
            pro: '',
            car: '',
            fat: '',
            aiServings: '[]',
            returnTo: 'library',
            libraryMode: 'select',
          }),
        },
      });
    });
  });
});
