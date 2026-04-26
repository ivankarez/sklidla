import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as expoRouter from 'expo-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cameraMocks = vi.hoisted(() => ({
  takePictureAsync: vi.fn(),
  pausePreview: vi.fn(),
  resumePreview: vi.fn(),
  requestPermission: vi.fn(),
  processFoodImage: vi.fn(),
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
}));

vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: cameraMocks.manipulateAsync,
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

import CameraScreen from '../app/camera';

describe('camera screen', () => {
  beforeEach(() => {
    (expoRouter as any).__resetRouterMock();
    cameraMocks.takePictureAsync.mockReset();
    cameraMocks.pausePreview.mockReset();
    cameraMocks.resumePreview.mockReset();
    cameraMocks.requestPermission.mockReset();
    cameraMocks.processFoodImage.mockReset();
    cameraMocks.manipulateAsync.mockReset();
  });

  it('returns to manual entry even if pausing the preview would hang', async () => {
    const router = (expoRouter as any).__routerMock;

    (expoRouter as any).__setLocalSearchParams({
      mode: 'auto',
      source: 'manual-entry',
      nameHint: 'banana',
      brandHint: 'store brand',
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
});
