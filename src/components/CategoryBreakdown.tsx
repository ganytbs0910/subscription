import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getMonthlyAmount, formatPrice } from '../utils/calculations';
import { getCategoryLabel } from '../utils/presets';
import type { Subscription, Category } from '../types';

const CATEGORY_COLORS: Record<Category, string> = {
  streaming: '#E53935',
  music: '#8E24AA',
  productivity: '#1E88E5',
  cloud: '#43A047',
  gaming: '#FB8C00',
  news: '#00ACC1',
  fitness: '#F4511E',
  education: '#3949AB',
  other: '#757575',
};

interface Props {
  subscriptions: Subscription[];
  currency: string;
}

export default function CategoryBreakdown({ subscriptions, currency }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  // サブスクのみ（課金を除外）- 月額の概念があるもののみ
  const activeSubscriptionsOnly = subscriptions.filter((s) => s.isActive && s.type !== 'payment');
  const totalMonthly = activeSubscriptionsOnly.reduce(
    (sum, s) => sum + getMonthlyAmount(s.price, s.billingCycle),
    0
  );

  const categoryTotals = activeSubscriptionsOnly.reduce<Record<string, number>>((acc, s) => {
    const amount = getMonthlyAmount(s.price, s.billingCycle);
    acc[s.category] = (acc[s.category] || 0) + amount;
    return acc;
  }, {});

  const sorted = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>カテゴリ別内訳</Text>
      <View style={styles.barContainer}>
        {sorted.map(([cat, amount]) => {
          const percent = totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0;
          return (
            <View
              key={cat}
              style={[
                styles.barSegment,
                {
                  flex: percent,
                  backgroundColor: CATEGORY_COLORS[cat as Category] || '#757575',
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {sorted.map(([cat, amount]) => {
          const percent = totalMonthly > 0 ? Math.round((amount / totalMonthly) * 100) : 0;
          return (
            <View key={cat} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: CATEGORY_COLORS[cat as Category] || '#757575' },
                ]}
              />
              <Text style={styles.legendText}>
                {getCategoryLabel(cat as Category)} {percent}%
              </Text>
              <Text style={styles.legendAmount}>
                {formatPrice(amount, currency)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
    },
    barContainer: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      gap: 2,
    },
    barSegment: {
      borderRadius: 6,
      minWidth: 4,
    },
    legend: {
      marginTop: 12,
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 13,
      color: theme.colors.text,
      flex: 1,
    },
    legendAmount: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });
