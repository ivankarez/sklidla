export const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
};

import { Platform } from 'react-native';

export const TYPOGRAPHY = {
  monospace: Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  }),
};
