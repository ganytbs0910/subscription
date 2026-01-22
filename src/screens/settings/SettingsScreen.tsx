import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { CURRENCIES } from '../../utils/presets';

type ThemeOption = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, subscriptions } = useSubscriptionStore();

  const styles = createStyles(theme);

  const themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
    { value: 'system', label: 'システム設定', icon: 'cellphone-cog' },
    { value: 'light', label: 'ライト', icon: 'white-balance-sunny' },
    { value: 'dark', label: 'ダーク', icon: 'moon-waning-crescent' },
  ];

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
