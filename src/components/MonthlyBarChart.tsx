import React from 'react';
import { View, Text, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { formatPrice } from '../utils/calculations';
import type { MonthlyPaymentSummary } from '../utils/calculations';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  data: MonthlyPaymentSummary[];
  currency: string;
}

export default function MonthlyBarChart({ data, currency }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const reversed = [...data].reverse();
  const maxTotal = Math.max(...reversed.map((d) => d.total), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>月別支出 (6ヶ月)</Text>
      <View style={styles.chartContainer}>
        {reversed.map((item) => {
          const heightPercent = (item.total / maxTotal) * 100;
          const shortLabel = `${item.month}月`;
          return (
            <View key={`${item.year}-${item.month}`} style={styles.barWrapper}>
              <Text style={styles.barValue}>
                {item.total > 0 ? formatPrice(item.total, currency) : ''}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(heightPercent, 2)}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{shortLabel}</Text>
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
      marginBottom: 16,
    },
    chartContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 160,
      gap: 8,
    },
    barWrapper: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
    },
    barValue: {
      fontSize: 9,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      textAlign: 'center',
    },
    barTrack: {
      width: '100%',
      height: '80%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    bar: {
      width: '70%',
      borderRadius: 6,
      minHeight: 4,
    },
    barLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 6,
    },
  });
