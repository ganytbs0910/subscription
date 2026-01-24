import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  calculateTotalMonthly,
  calculateTotalYearly,
  calculateTotalPaidSinceStart,
  calculateNextMonthPayments,
  calculateMonthlyPaymentHistory,
  formatPrice,
  getUpcomingSubscriptions,
  getDaysUntilNextBilling,
  formatShortDate,
} from '../../utils/calculations';
import { getCategoryLabel } from '../../utils/presets';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { subscriptions, settings } = useSubscriptionStore();

  const activeSubscriptions = subscriptions.filter((sub) => sub.isActive);
  const monthlyTotal = calculateTotalMonthly(activeSubscriptions);
  const yearlyTotal = calculateTotalYearly(activeSubscriptions);
  const totalPaid = calculateTotalPaidSinceStart(subscriptions); // 全サブスク対象
  const nextMonthData = calculateNextMonthPayments(activeSubscriptions);
  const upcomingPayments = getUpcomingSubscriptions(activeSubscriptions, 14);
  const monthlyHistory = calculateMonthlyPaymentHistory(subscriptions, 6);

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>月額合計</Text>
          <Text style={styles.summaryAmount}>
            {formatPrice(monthlyTotal, settings.currency)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>年額合計</Text>
          <Text style={styles.summaryAmount}>
            {formatPrice(yearlyTotal, settings.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Icon name="check-circle" size={24} color={theme.colors.success} />
          <Text style={styles.statNumber}>{activeSubscriptions.length}</Text>
          <Text style={styles.statLabel}>契約中</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="calendar-clock" size={24} color={theme.colors.primary} />
          <Text style={styles.statNumber}>{upcomingPayments.length}</Text>
          <Text style={styles.statLabel}>2週間以内</Text>
        </View>
      </View>

      <View style={styles.paymentSummaryContainer}>
        <View style={styles.paymentSummaryCard}>
          <View style={styles.paymentSummaryHeader}>
            <Icon name="history" size={20} color={theme.colors.warning} />
            <Text style={styles.paymentSummaryTitle}>累計支払い額</Text>
          </View>
          <Text style={styles.paymentSummaryAmount}>
            {formatPrice(totalPaid, settings.currency)}
          </Text>
          <Text style={styles.paymentSummarySubtext}>契約開始からの合計</Text>
        </View>

        <View style={styles.paymentSummaryCard}>
          <View style={styles.paymentSummaryHeader}>
            <Icon name="calendar-month" size={20} color={theme.colors.info} />
            <Text style={styles.paymentSummaryTitle}>来月の支払い</Text>
          </View>
          <Text style={styles.paymentSummaryAmount}>
            {formatPrice(nextMonthData.total, settings.currency)}
          </Text>
          <Text style={styles.paymentSummarySubtext}>
            {nextMonthData.subscriptions.length}件のサブスク
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>次回請求予定</Text>
        {upcomingPayments.length > 0 ? (
          upcomingPayments.map((sub) => {
            const daysUntil = getDaysUntilNextBilling(sub.nextBillingDate);
            return (
              <TouchableOpacity
                key={sub.id}
                style={styles.upcomingCard}
                onPress={() =>
                  navigation.navigate('SubscriptionDetail', {
                    subscriptionId: sub.id,
                  })
                }
              >
                <View
                  style={[
                    styles.upcomingIcon,
                    { backgroundColor: sub.color || theme.colors.primary },
                  ]}
                >
                  <Icon
                    name={sub.icon || 'credit-card'}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingName}>{sub.name}</Text>
                  <Text style={styles.upcomingCategory}>
                    {getCategoryLabel(sub.category)}
                  </Text>
                </View>
                <View style={styles.upcomingRight}>
                  <Text style={styles.upcomingPrice}>
                    {formatPrice(sub.price, sub.currency)}
                  </Text>
                  <Text
                    style={[
                      styles.upcomingDays,
                      daysUntil <= 3 && { color: theme.colors.error },
                    ]}
                  >
                    {daysUntil === 0
                      ? '今日'
                      : daysUntil === 1
                      ? '明日'
                      : `${daysUntil}日後`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Icon
              name="calendar-check"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              2週間以内の請求予定はありません
            </Text>
          </View>
        )}
      </View>

      {/* 月別支払い履歴 */}
      {monthlyHistory.some(m => m.total > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>月別支払い履歴</Text>
          {monthlyHistory.map((month) => (
            <View key={`${month.year}-${month.month}`} style={styles.monthlyCard}>
              <View style={styles.monthlyHeader}>
                <Text style={styles.monthlyLabel}>{month.label}</Text>
                <Text style={styles.monthlyTotal}>
                  {formatPrice(month.total, settings.currency)}
                </Text>
              </View>
              {month.payments.length > 0 && (
                <View style={styles.monthlyDetails}>
                  {month.payments.slice(0, 5).map((payment, idx) => (
                    <View key={idx} style={styles.monthlyDetailRow}>
                      <Text style={styles.monthlyDetailName}>{payment.name}</Text>
                      <Text style={styles.monthlyDetailPrice}>
                        {formatPrice(payment.price, payment.currency)}
                      </Text>
                    </View>
                  ))}
                  {month.payments.length > 5 && (
                    <Text style={styles.monthlyMore}>
                      他 {month.payments.length - 5} 件
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('ScanEmail')}
      >
        <Icon name="email-search" size={24} color={theme.colors.primary} />
        <Text style={styles.scanButtonText}>メールからサブスクを検出</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>サブスクを追加</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    summaryContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    summaryAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    paymentSummaryContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 16,
    },
    paymentSummaryCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
    },
    paymentSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    paymentSummaryTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    paymentSummaryAmount: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    paymentSummarySubtext: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    upcomingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    upcomingIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upcomingInfo: {
      flex: 1,
      marginLeft: 12,
    },
    upcomingName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    upcomingCategory: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    upcomingRight: {
      alignItems: 'flex-end',
    },
    upcomingPrice: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    upcomingDays: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    scanButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginHorizontal: 16,
      marginBottom: 32,
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    monthlyCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    monthlyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    monthlyLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    monthlyTotal: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    monthlyDetails: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    monthlyDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    monthlyDetailName: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    monthlyDetailPrice: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text,
    },
    monthlyMore: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });
