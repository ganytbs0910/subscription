import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  calculateTotalMonthly,
  calculateTotalYearly,
  formatPrice,
  getUpcomingSubscriptions,
  getDaysUntilNextBilling,
  compareWithLastMonth,
  calculateMonthlyPaymentHistory,
  calculateSavedAmount,
} from '../../utils/calculations';
import { getCategoryLabel } from '../../utils/presets';
import MonthlyBarChart from '../../components/MonthlyBarChart';
import CategoryBreakdown from '../../components/CategoryBreakdown';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { subscriptions, settings } = useSubscriptionStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const activeSubscriptions = subscriptions.filter((sub) => sub.isActive);
  const monthlyTotal = calculateTotalMonthly(activeSubscriptions);
  const yearlyTotal = calculateTotalYearly(activeSubscriptions);
  const upcomingPayments = getUpcomingSubscriptions(activeSubscriptions, 14);

  // 前月比トレンド
  const trend = compareWithLastMonth(subscriptions);

  // 月別支出データ
  const monthlyHistory = calculateMonthlyPaymentHistory(subscriptions, 6);

  // 節約額
  const savedAmount = calculateSavedAmount(subscriptions);

  // 予算
  const budget = settings.monthlyBudget;
  const budgetPercent = budget && budget > 0 ? (monthlyTotal / budget) * 100 : 0;
  const overBudget = budgetPercent > 100;

  // 支払い履歴の件数を取得
  const totalPaymentRecords = subscriptions.reduce((sum, sub) => {
    return sum + (sub.paymentHistory?.length || 0);
  }, 0);

  const styles = createStyles(theme);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* メインカード - 月額合計 */}
      <TouchableOpacity
        style={styles.mainCard}
        onPress={() => navigation.navigate('PaymentHistory')}
        activeOpacity={0.8}
      >
        <Text style={styles.mainCardLabel}>今月の支払い</Text>
        <Text style={styles.mainCardAmount}>
          {formatPrice(monthlyTotal, settings.currency)}
        </Text>
        {/* 前月比トレンド */}
        {(trend.lastMonth > 0 || trend.thisMonth > 0) && (
          <View style={styles.trendRow}>
            <Icon
              name={trend.difference >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={trend.difference >= 0 ? '#FF8A80' : '#B9F6CA'}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.difference >= 0 ? '#FF8A80' : '#B9F6CA' },
              ]}
            >
              {Math.abs(Math.round(trend.percentChange))}% 前月比
            </Text>
          </View>
        )}
        <View style={styles.mainCardDivider} />
        <View style={styles.mainCardRow}>
          <View style={styles.mainCardStat}>
            <Text style={styles.mainCardStatValue}>{activeSubscriptions.length}</Text>
            <Text style={styles.mainCardStatLabel}>契約中</Text>
          </View>
          <View style={styles.mainCardStatDivider} />
          <View style={styles.mainCardStat}>
            <Text style={styles.mainCardStatValue}>
              {formatPrice(yearlyTotal, settings.currency)}
            </Text>
            <Text style={styles.mainCardStatLabel}>年間合計</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 予算プログレスバー */}
      {budget && budget > 0 && (
        <View style={styles.section}>
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>月間予算</Text>
              <Text style={[styles.budgetValue, overBudget && { color: '#D32F2F' }]}>
                {formatPrice(monthlyTotal, settings.currency)} / {formatPrice(budget, settings.currency)}
              </Text>
            </View>
            <View style={styles.budgetTrack}>
              <View
                style={[
                  styles.budgetBar,
                  {
                    width: `${Math.min(budgetPercent, 100)}%`,
                    backgroundColor: overBudget ? '#D32F2F' : theme.colors.primary,
                  },
                ]}
              />
            </View>
            {overBudget && (
              <Text style={styles.budgetWarning}>
                予算を{formatPrice(monthlyTotal - budget, settings.currency)}超過しています
              </Text>
            )}
          </View>
        </View>
      )}

      {/* クイックアクション */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('ScanEmail')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="email-search" size={22} color="#1976D2" />
          </View>
          <Text style={styles.quickActionText}>メール{'\n'}スキャン</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AddSubscription')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="plus" size={22} color="#388E3C" />
          </View>
          <Text style={styles.quickActionText}>サブスク{'\n'}追加</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
            <Icon name="receipt" size={22} color="#F57C00" />
          </View>
          <Text style={styles.quickActionText}>支払い{'\n'}履歴</Text>
        </TouchableOpacity>
      </View>

      {/* 節約額カード */}
      {savedAmount > 0 && (
        <View style={styles.section}>
          <View style={styles.savingsCard}>
            <Icon name="piggy-bank" size={24} color="#388E3C" />
            <View style={styles.savingsInfo}>
              <Text style={styles.savingsLabel}>解約で節約中</Text>
              <Text style={styles.savingsAmount}>
                {formatPrice(savedAmount, settings.currency)}/月
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 月別支出バーチャート */}
      {subscriptions.length > 0 && (
        <View style={styles.section}>
          <MonthlyBarChart subscriptions={subscriptions} currency={settings.currency} />
        </View>
      )}

      {/* カテゴリ別内訳 */}
      {activeSubscriptions.length > 0 && (
        <View style={styles.section}>
          <CategoryBreakdown
            subscriptions={subscriptions}
            currency={settings.currency}
          />
        </View>
      )}

      {/* 次回請求予定 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>次回請求予定</Text>
          {upcomingPayments.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{upcomingPayments.length}</Text>
            </View>
          )}
        </View>

        {upcomingPayments.length > 0 ? (
          <View style={styles.upcomingList}>
            {upcomingPayments.slice(0, 5).map((sub) => {
              const daysUntil = getDaysUntilNextBilling(sub.nextBillingDate);
              const isUrgent = daysUntil <= 3;

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
                      styles.upcomingIconContainer,
                      { backgroundColor: sub.color || theme.colors.primary },
                    ]}
                  >
                    <Icon
                      name={sub.icon || 'credit-card'}
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingName}>{sub.name}</Text>
                    <Text style={styles.upcomingMeta}>
                      {getCategoryLabel(sub.category)}
                    </Text>
                  </View>
                  <View style={styles.upcomingRight}>
                    <Text style={styles.upcomingPrice}>
                      {formatPrice(sub.price, sub.currency)}
                    </Text>
                    <View style={[
                      styles.daysTag,
                      isUrgent && styles.daysTagUrgent
                    ]}>
                      <Text style={[
                        styles.daysTagText,
                        isUrgent && styles.daysTagTextUrgent
                      ]}>
                        {daysUntil === 0 ? '今日' : daysUntil === 1 ? '明日' : `${daysUntil}日後`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Icon name="calendar-check" size={40} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>2週間以内の請求予定なし</Text>
          </View>
        )}
      </View>

      {/* サブスク一覧へ（課金は除外） */}
      {activeSubscriptions.filter(s => s.type !== 'payment').length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>登録中のサブスク</Text>
          <View style={styles.subscriptionGrid}>
            {activeSubscriptions.filter(s => s.type !== 'payment').slice(0, 6).map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={styles.subscriptionMini}
                onPress={() =>
                  navigation.navigate('SubscriptionDetail', {
                    subscriptionId: sub.id,
                  })
                }
              >
                <View
                  style={[
                    styles.subscriptionMiniIcon,
                    { backgroundColor: sub.color || theme.colors.primary },
                  ]}
                >
                  <Icon name={sub.icon || 'apps'} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.subscriptionMiniName} numberOfLines={1}>
                  {sub.name}
                </Text>
                <Text style={styles.subscriptionMiniPrice}>
                  {formatPrice(sub.price, sub.currency)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {activeSubscriptions.filter(s => s.type !== 'payment').length > 6 && (
            <Text style={styles.moreText}>
              他 {activeSubscriptions.filter(s => s.type !== 'payment').length - 6} 件
            </Text>
          )}
        </View>
      )}

      {/* 支払い履歴カード */}
      {totalPaymentRecords > 0 && (
        <TouchableOpacity
          style={styles.historyCard}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <View style={styles.historyCardLeft}>
            <Icon name="chart-line" size={24} color={theme.colors.primary} />
            <View style={styles.historyCardInfo}>
              <Text style={styles.historyCardTitle}>支払い履歴</Text>
              <Text style={styles.historyCardSubtitle}>
                {totalPaymentRecords}件の支払い記録
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    mainCard: {
      backgroundColor: theme.colors.primary,
      margin: 16,
      borderRadius: 20,
      padding: 24,
    },
    mainCardLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 4,
    },
    mainCardAmount: {
      fontSize: 36,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 4,
    },
    trendText: {
      fontSize: 13,
      fontWeight: '600',
    },
    mainCardDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginVertical: 16,
    },
    mainCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    mainCardStat: {
      flex: 1,
      alignItems: 'center',
    },
    mainCardStatDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    mainCardStatValue: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    mainCardStatLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2,
    },
    budgetCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 16,
    },
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    budgetLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    budgetValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    budgetTrack: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    budgetBar: {
      height: '100%',
      borderRadius: 4,
    },
    budgetWarning: {
      fontSize: 12,
      color: '#D32F2F',
      marginTop: 6,
    },
    quickActions: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 24,
      gap: 12,
    },
    quickActionButton: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    quickActionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    quickActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 16,
    },
    savingsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8F5E9',
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    savingsInfo: {
      flex: 1,
    },
    savingsLabel: {
      fontSize: 13,
      color: '#2E7D32',
    },
    savingsAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1B5E20',
      marginTop: 2,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    badge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    upcomingList: {
      gap: 8,
    },
    upcomingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 14,
    },
    upcomingIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upcomingInfo: {
      flex: 1,
      marginLeft: 12,
    },
    upcomingName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    upcomingMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    upcomingRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    upcomingPrice: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    daysTag: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    daysTagUrgent: {
      backgroundColor: '#FFEBEE',
    },
    daysTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    daysTagTextUrgent: {
      color: '#D32F2F',
    },
    emptyCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    subscriptionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    subscriptionMini: {
      width: (width - 32 - 20) / 3,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
    },
    subscriptionMiniIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    subscriptionMiniName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    subscriptionMiniPrice: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    moreText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      borderRadius: 14,
      padding: 16,
    },
    historyCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    historyCardInfo: {
      gap: 2,
    },
    historyCardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    historyCardSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    bottomSpacer: {
      height: 32,
    },
  });
