import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { formatPrice, calculateMonthlyPaymentHistory } from '../utils/calculations';
import type { Subscription } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  subscriptions: Subscription[];
  currency: string;
}

const MONTH_OPTIONS = [3, 6, 12, 24];

export default function MonthlyBarChart({ subscriptions, currency }: Props) {
  const theme = useTheme();
  const [monthsBack, setMonthsBack] = useState(6);
  const [showModal, setShowModal] = useState(false);

  const data = useMemo(
    () => calculateMonthlyPaymentHistory(subscriptions, monthsBack),
    [subscriptions, monthsBack]
  );

  const styles = createStyles(theme);

  const reversed = [...data].reverse();
  const maxTotal = Math.max(...reversed.map((d) => d.total), 1);

  const handleSelectMonths = (months: number) => {
    setMonthsBack(months);
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>月別支出 ({monthsBack}ヶ月)</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowModal(true)}
        >
          <Icon name="cog-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
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

      {/* 月数選択モーダル */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>表示期間</Text>
            {MONTH_OPTIONS.map((months) => (
              <TouchableOpacity
                key={months}
                style={[
                  styles.optionButton,
                  monthsBack === months && styles.optionButtonActive,
                ]}
                onPress={() => handleSelectMonths(months)}
              >
                <Text
                  style={[
                    styles.optionText,
                    monthsBack === months && styles.optionTextActive,
                  ]}
                >
                  {months}ヶ月
                </Text>
                {monthsBack === months && (
                  <Icon name="check" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    settingsButton: {
      padding: 4,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      width: '80%',
      maxWidth: 300,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    optionButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: theme.colors.background,
    },
    optionButtonActive: {
      backgroundColor: theme.colors.primary + '20',
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    optionTextActive: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });
