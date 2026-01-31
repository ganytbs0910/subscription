import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { CURRENCIES } from '../../utils/presets';
import {
  setupNotifications,
  scheduleAllPaymentReminders,
  cancelAllReminders,
  checkNotificationPermission,
} from '../../services/notificationService';
import type { RootStackParamList } from '../../types';

type ThemeOption = 'light' | 'dark' | 'system';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { settings, updateSettings, subscriptions } = useSubscriptionStore();
  const [budgetText, setBudgetText] = useState(
    settings.monthlyBudget?.toString() || ''
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings.notificationsEnabled || false
  );

  const styles = createStyles(theme);

  const themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
    { value: 'system', label: 'システム設定', icon: 'cellphone-cog' },
    { value: 'light', label: 'ライト', icon: 'white-balance-sunny' },
    { value: 'dark', label: 'ダーク', icon: 'moon-waning-crescent' },
  ];

  const notificationDaysOptions = [
    { value: 0, label: '当日' },
    { value: 1, label: '1日前' },
    { value: 3, label: '3日前' },
    { value: 7, label: '1週間前' },
  ];

  // 通知設定の切り替え
  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await setupNotifications();
      if (granted) {
        setNotificationsEnabled(true);
        updateSettings({ notificationsEnabled: true });
        await scheduleAllPaymentReminders(
          subscriptions,
          settings.notificationDaysBefore || 1
        );
        Alert.alert('通知を有効にしました', '支払い日のリマインダーが届きます');
      } else {
        Alert.alert(
          '通知が許可されていません',
          '設定アプリから通知を許可してください',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      setNotificationsEnabled(false);
      updateSettings({ notificationsEnabled: false });
      await cancelAllReminders();
    }
  };

  // 通知日数の変更
  const handleChangeDaysBefore = async (days: number) => {
    updateSettings({ notificationDaysBefore: days });
    if (notificationsEnabled) {
      await scheduleAllPaymentReminders(subscriptions, days);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'データを削除',
      'すべてのサブスクリプションデータを削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            subscriptions.forEach((sub) => {
              useSubscriptionStore.getState().deleteSubscription(sub.id);
            });
            Alert.alert('完了', 'データを削除しました');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>外観</Text>
        <View style={styles.card}>
          {themeOptions.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.settingRow,
                index < themeOptions.length - 1 && styles.settingRowBorder,
              ]}
              onPress={() => updateSettings({ theme: option.value })}
            >
              <View style={styles.settingLeft}>
                <Icon
                  name={option.icon}
                  size={22}
                  color={theme.colors.primary}
                />
                <Text style={styles.settingLabel}>{option.label}</Text>
              </View>
              {settings.theme === option.value && (
                <Icon
                  name="check"
                  size={22}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>デフォルト通貨</Text>
        <View style={styles.card}>
          {CURRENCIES.map((currency, index) => (
            <TouchableOpacity
              key={currency.value}
              style={[
                styles.settingRow,
                index < CURRENCIES.length - 1 && styles.settingRowBorder,
              ]}
              onPress={() => updateSettings({ currency: currency.value })}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                <Text style={styles.settingLabel}>{currency.label}</Text>
              </View>
              {settings.currency === currency.value && (
                <Icon
                  name="check"
                  size={22}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon name="bell" size={22} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>支払いリマインダー</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
          {notificationsEnabled && (
            <>
              <View style={styles.settingRowBorder} />
              <View style={styles.daysSelector}>
                <Text style={styles.daysSelectorLabel}>通知タイミング</Text>
                <View style={styles.daysOptions}>
                  {notificationDaysOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.daysOption,
                        settings.notificationDaysBefore === option.value &&
                          styles.daysOptionActive,
                      ]}
                      onPress={() => handleChangeDaysBefore(option.value)}
                    >
                      <Text
                        style={[
                          styles.daysOptionText,
                          settings.notificationDaysBefore === option.value &&
                            styles.daysOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>月間予算</Text>
        <View style={styles.card}>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetSymbol}>¥</Text>
            <TextInput
              style={styles.budgetInput}
              value={budgetText}
              onChangeText={(text) => {
                setBudgetText(text);
                const num = Number(text);
                if (text === '') {
                  updateSettings({ monthlyBudget: undefined });
                } else if (!isNaN(num) && num >= 0) {
                  updateSettings({ monthlyBudget: num });
                }
              }}
              placeholder="未設定"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>統計情報</Text>
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>登録サブスク数</Text>
            <Text style={styles.statsValue}>{subscriptions.length}</Text>
          </View>
          <View style={[styles.statsRow, styles.settingRowBorder]}>
            <Text style={styles.statsLabel}>有効なサブスク</Text>
            <Text style={styles.statsValue}>
              {subscriptions.filter((s) => s.isActive).length}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>データ管理</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleClearData}
          >
            <View style={styles.settingLeft}>
              <Icon name="delete" size={22} color={theme.colors.error} />
              <Text style={[styles.settingLabel, { color: theme.colors.error }]}>
                すべてのデータを削除
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>その他</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.settingRow, styles.settingRowBorder]}
            onPress={() => (navigation as any).navigate('PrivacyPolicy')}
          >
            <View style={styles.settingLeft}>
              <Icon name="shield-account" size={22} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>プライバシーポリシー</Text>
            </View>
            <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('TermsOfService')}
          >
            <View style={styles.settingLeft}>
              <Icon name="file-document" size={22} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>利用規約</Text>
            </View>
            <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AI Subscan MVP</Text>
        <Text style={styles.footerVersion}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    settingRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingLabel: {
      fontSize: 16,
      color: theme.colors.text,
    },
    currencySymbol: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primary,
      width: 24,
      textAlign: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    statsLabel: {
      fontSize: 16,
      color: theme.colors.text,
    },
    statsValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    budgetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    budgetSymbol: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primary,
      marginRight: 8,
    },
    budgetInput: {
      flex: 1,
      fontSize: 18,
      color: theme.colors.text,
      padding: 0,
    },
    daysSelector: {
      padding: 16,
    },
    daysSelectorLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 10,
    },
    daysOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    daysOption: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    daysOptionActive: {
      backgroundColor: theme.colors.primary,
    },
    daysOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    daysOptionTextActive: {
      color: '#FFFFFF',
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    footerVersion: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
  });
