import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  formatPrice,
  formatDate,
  getDaysUntilNextBilling,
  getMonthlyAmount,
  getYearlyAmount,
} from '../../utils/calculations';
import {
  getCategoryLabel,
  getBillingCycleLabel,
} from '../../utils/presets';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRouteProp = RouteProp<RootStackParamList, 'SubscriptionDetail'>;

export default function SubscriptionDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { subscriptionId } = route.params;

  const { getSubscriptionById, updateSubscription, deleteSubscription } =
    useSubscriptionStore();
  const subscription = getSubscriptionById(subscriptionId);

  const styles = createStyles(theme);

  if (!subscription) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>サブスクリプションが見つかりません</Text>
      </View>
    );
  }

  const daysUntil = getDaysUntilNextBilling(subscription.nextBillingDate);
  const monthlyEquivalent = getMonthlyAmount(
    subscription.price,
    subscription.billingCycle
  );
  const yearlyEquivalent = getYearlyAmount(
    subscription.price,
    subscription.billingCycle
  );

  const handleToggleActive = () => {
    updateSubscription(subscription.id, { isActive: !subscription.isActive });
  };

  const handleDelete = () => {
    Alert.alert(
      '削除確認',
      `「${subscription.name}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteSubscription(subscription.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: subscription.color || theme.colors.primary },
          ]}
        >
          <Icon
            name={subscription.icon || 'credit-card'}
            size={48}
            color="#FFFFFF"
          />
        </View>
        <Text style={styles.name}>{subscription.name}</Text>
        <Text style={styles.category}>
          {getCategoryLabel(subscription.category)}
        </Text>
      </View>

      <View style={styles.priceSection}>
        <Text style={styles.mainPrice}>
          {formatPrice(subscription.price, subscription.currency)}
        </Text>
        <Text style={styles.billingCycle}>
          / {getBillingCycleLabel(subscription.billingCycle)}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>月額換算</Text>
          <Text style={styles.statValue}>
            {formatPrice(monthlyEquivalent, subscription.currency)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>年額換算</Text>
          <Text style={styles.statValue}>
            {formatPrice(yearlyEquivalent, subscription.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.detailSection}>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon name="calendar" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>次回請求日</Text>
            <Text style={styles.detailValue}>
              {formatDate(subscription.nextBillingDate)}
              {daysUntil >= 0 && (
                <Text
                  style={[
                    styles.daysUntil,
                    daysUntil <= 3 && { color: theme.colors.error },
                  ]}
                >
                  {' '}
                  ({daysUntil === 0 ? '今日' : `${daysUntil}日後`})
                </Text>
              )}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon name="calendar-start" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>開始日</Text>
            <Text style={styles.detailValue}>
              {formatDate(subscription.startDate)}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon
              name={subscription.isActive ? 'check-circle' : 'pause-circle'}
              size={20}
              color={subscription.isActive ? theme.colors.success : theme.colors.error}
            />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>ステータス</Text>
            <Text style={styles.detailValue}>
              {subscription.isActive ? '有効' : '停止中'}
            </Text>
          </View>
        </View>

        {subscription.description && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="text" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>メモ</Text>
              <Text style={styles.detailValue}>{subscription.description}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={handleToggleActive}
        >
          <Icon
            name={subscription.isActive ? 'pause' : 'play'}
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
            {subscription.isActive ? '停止する' : '再開する'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Icon name="delete" size={20} color={theme.colors.error} />
          <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
            削除する
          </Text>
        </TouchableOpacity>
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
    errorText: {
      color: theme.colors.error,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 32,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 32,
      backgroundColor: theme.colors.card,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    name: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
    },
    category: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    priceSection: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      paddingVertical: 24,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    mainPrice: {
      fontSize: 36,
      fontWeight: '700',
      color: theme.colors.text,
    },
    billingCycle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    statsRow: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    detailSection: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailIcon: {
      width: 40,
      alignItems: 'center',
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontSize: 16,
      color: theme.colors.text,
      marginTop: 2,
    },
    daysUntil: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    actions: {
      padding: 16,
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    toggleButton: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    deleteButton: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
