import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../hooks/useTheme';
import type { RootStackParamList, MainTabParamList } from '../types';

import DashboardScreen from '../screens/home/DashboardScreen';
import SubscriptionListScreen from '../screens/subscriptions/SubscriptionListScreen';
import SubscriptionDetailScreen from '../screens/subscriptions/SubscriptionDetailScreen';
import AddSubscriptionScreen from '../screens/subscriptions/AddSubscriptionScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ScanEmailScreen from '../screens/scan/ScanEmailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'ダッシュボード',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionListScreen}
        options={{
          title: 'サブスク一覧',
          tabBarIcon: ({ color, size }) => (
            <Icon name="format-list-bulleted" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function Navigator() {
  const theme = useTheme();

  const navigationTheme = theme.isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          primary: theme.colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          primary: theme.colors.primary,
        },
      };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SubscriptionDetail"
          component={SubscriptionDetailScreen}
          options={{ title: '詳細' }}
        />
        <Stack.Screen
          name="AddSubscription"
          component={AddSubscriptionScreen}
          options={{ title: 'サブスク追加' }}
        />
        <Stack.Screen
          name="ScanEmail"
          component={ScanEmailScreen}
          options={{ title: 'メールスキャン' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
