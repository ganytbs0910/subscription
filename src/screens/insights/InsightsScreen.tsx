import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  calculateTotalPaidSinceStart,
  getMonthlyAmount,
  getYearlyAmount,
  formatPrice,
  getSavingSuggestions,
} from '../../utils/calculations';
import { getCategoryLabel } from '../../utils/presets';
import CategoryBreakdown from '../../components/CategoryBreakdown';

export default function InsightsScreen() {
  const theme = useTheme();
  const { subscriptions, settings } = useSubscriptionStore();
  const styles = createStyles(theme);

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  const totalPaid = calculateTotalPaidSinceStart(subscriptions);

  // 月額ランキング Top5
  const top5 = [...activeSubscriptions]
    .sort((a, b) => getMonthlyAmount(b.price, b.billingCycle) - getMonthlyAmount(a.price, a.billingCycle))
    .slice(0, 5);

  // 節約提案
  const suggestions = getSavingSuggestions(activeSubscriptions).slice(0, 3);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 累計支払い額 */}
      <View style={styles.heroCard}>
        <Icon name="cash-multiple" size={28} color="rgba(255,255,255,0.8)" />
        <Text style={styles.heroLabel}>累計支払い額</Text>
        <Text style={styles.heroAmount}>
          {formatPrice(totalPaid, settings.currency)}
        </Text>
      </View>

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
    heroLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 8,
    },
    heroAmount: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFFFFF',
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
