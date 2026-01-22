import { useColorScheme } from 'react-native';
import { useSubscriptionStore } from '../stores/subscriptionStore';

export interface Theme {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    error: string;
    success: string;
  };
}

const lightTheme: Theme = {
  isDark: false,
  colors: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    primary: '#007AFF',
    border: '#E5E5EA',
    error: '#FF3B30',
    success: '#34C759',
  },
};

const darkTheme: Theme = {
  isDark: true,
  colors: {
    background: '#000000',
    surface: '#1C1C1E',
    card: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    primary: '#0A84FF',
    border: '#38383A',
    error: '#FF453A',
    success: '#32D74B',
  },
};

export const useTheme = (): Theme => {
  const systemColorScheme = useColorScheme();
  const { settings } = useSubscriptionStore();

  if (settings.theme === 'system') {
    return systemColorScheme === 'dark' ? darkTheme : lightTheme;
  }

  return settings.theme === 'dark' ? darkTheme : lightTheme;
};
