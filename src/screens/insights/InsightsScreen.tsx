import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  getMonthlyAmount,
  formatPrice,
  getSavingSuggestions,
} from '../../utils/calculations';
import { getCategoryLabel } from '../../utils/presets';
import CategoryBreakdown from '../../components/CategoryBreakdown';

// 過去N月分の月リストを生成
const generateMonthOptions = (monthsBack: number) => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
    });
  }
  return options;
};

export default function InsightsScreen() {
  const theme = useTheme();
  const { subscriptions, settings } = useSubscriptionStore();
  const styles = createStyles(theme);

  const monthOptions = useMemo(() => generateMonthOptions(12), []);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const selectedMonth = monthOptions[selectedMonthIndex];

  // 選択した月の支払い額を計算（支払い履歴から）
  const monthlyPayment = useMemo(() => {
    let total = 0;
    for (const sub of subscriptions) {
      if (sub.paymentHistory) {
        for (const payment of sub.paymentHistory) {
          const paymentDate = new Date(payment.date);
          if (
            paymentDate.getFullYear() === selectedMonth.year &&
            paymentDate.getMonth() + 1 === selectedMonth.month
          ) {
            total += payment.price;
          }
        }
      }
    }
    return total;
  }, [subscriptions, selectedMonth]);

  // 選択した月の支払い内訳
  const monthlyBreakdown = useMemo(() => {
    const breakdown: { name: string; amount: number; currency: string }[] = [];
    for (const sub of subscriptions) {
      if (sub.paymentHistory) {
        let subTotal = 0;
        for (const payment of sub.paymentHistory) {
          const paymentDate = new Date(payment.date);
          if (
            paymentDate.getFullYear() === selectedMonth.year &&
            paymentDate.getMonth() + 1 === selectedMonth.month
          ) {
            subTotal += payment.price;
          }
        }
        if (subTotal > 0) {
          breakdown.push({ name: sub.name, amount: subTotal, currency: sub.currency });
        }
      }
    }
    return breakdown.sort((a, b) => b.amount - a.amount);
  }, [subscriptions, selectedMonth]);

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  // サブスクのみ（課金を除外）
  const activeSubscriptionsOnly = activeSubscriptions.filter((s) => s.type !== 'payment');

  // 月額ランキング Top5（サブスクのみ）
  const top5 = [...activeSubscriptionsOnly]
    .sort((a, b) => getMonthlyAmount(b.price, b.billingCycle) - getMonthlyAmount(a.price, a.billingCycle))
    .slice(0, 5);

  // 節約提案（サブスクのみ）
  const suggestions = getSavingSuggestions(activeSubscriptionsOnly).slice(0, 3);

  const goToPrevMonth = () => {
    if (selectedMonthIndex < monthOptions.length - 1) {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonthIndex > 0) {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 月選択付きヒーローカード */}
      <View style={styles.heroCard}>
        <View style={styles.monthSelector}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            disabled={selectedMonthIndex >= monthOptions.length - 1}
            style={styles.monthArrow}
          >
            <Icon
              name="chevron-left"
              size={28}
              color={selectedMonthIndex >= monthOptions.length - 1 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'}
            />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{selectedMonth.label}</Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            disabled={selectedMonthIndex <= 0}
            style={styles.monthArrow}
          >
            <Icon
              name="chevron-right"
              size={28}
              color={selectedMonthIndex <= 0 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroAmount}>
          {formatPrice(monthlyPayment, settings.currency)}
        </Text>
        <Text style={styles.heroSubLabel}>
          {monthlyBreakdown.length}件の支払い
        </Text>
      </View>

      {/* 選択月の支払い内訳 */}
      {monthlyBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{selectedMonth.month}月の支払い内訳</Text>
          <View style={styles.card}>
            {monthlyBreakdown.map((item, index) => (
              <View
                key={item.name}
                style={[
                  styles.rankItem,
                  index < monthlyBreakdown.length - 1 && styles.rankItemBorder,
                ]}
              >
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName}>{item.name}</Text>
                </View>
                <Text style={styles.rankPrice}>
                  {formatPrice(item.amount, item.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 月額ランキング Top5 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>月額ランキング Top5</Text>
        <View style={styles.card}>
          {top5.map((sub, index) => {
            const monthly = getMonthlyAmount(sub.price, sub.billingCycle);
            return (
              <View
                key={sub.id}
                style={[
                  styles.rankItem,
                  index < top5.length - 1 && styles.rankItemBorder,
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName}>{sub.name}</Text>
                  <Text style={styles.rankCategory}>
                    {getCategoryLabel(sub.category)}
                  </Text>
                </View>
                <Text style={styles.rankPrice}>
                  {formatPrice(monthly, sub.currency)}/月
                </Text>
              </View>
            );
          })}
          {top5.length === 0 && (
            <Text style={styles.emptyText}>データなし</Text>
          )}
        </View>
      </View>

      {/* カテゴリ別内訳 */}
      <View style={styles.section}>
        <CategoryBreakdown
          subscriptions={subscriptions}
          currency={settings.currency}
        />
      </View>

      {/* 節約提案 */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>節約提案</Text>
          <View style={styles.card}>
            {suggestions.map((s, i) => (
              <View
                key={s.name}
                style={[
                  styles.suggestionItem,
                  i < suggestions.length - 1 && styles.rankItemBorder,
                ]}
              >
                <Icon name="lightbulb-outline" size={20} color="#FB8C00" />
                <Text style={styles.suggestionText}>
                  {s.name}を解約 → 年間{formatPrice(s.yearlyAmount, settings.currency)}節約
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    heroCard: {
      backgroundColor: theme.colors.primary,
      margin: 16,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    monthArrow: {
      padding: 4,
    },
    monthLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginHorizontal: 16,
      minWidth: 100,
      textAlign: 'center',
    },
    heroAmount: {
      fontSize: 36,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 4,
    },
    heroSubLabel: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 4,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    rankItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    rankItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    rankInfo: {
      flex: 1,
    },
    rankName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    rankCategory: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    rankPrice: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    emptyText: {
      padding: 24,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 10,
    },
    suggestionText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
  });
