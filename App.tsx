import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Navigator from './src/app/Navigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initSentry } from './src/services/sentryService';

// Sentryを初期化
initSentry();

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Navigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
