import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { formatPrice } from '../../utils/calculations';
import type { PaymentRecord } from '../../types';

interface PaymentWithService extends PaymentRecord {
  serviceName: string;
  serviceId: string;
}

type ViewMode = 'byMonth' | 'byService';

export default function PaymentHistoryScreen() {
  const theme = useTheme();
  const { subscriptions } = useSubscriptionStore();
  const [viewMode, setViewMode] = useState<ViewMode>('byMonth');

  // 全サブスクの支払い履歴を結合
  const allPayments = useMemo(() => {
    const payments: PaymentWithService[] = [];
    subscriptions.forEach(sub => {
      if (sub.paymentHistory && sub.paymentHistory.length > 0) {
        sub.paymentHistory.forEach(payment => {
          payments.push({
            ...payment,
            serviceName: sub.name,
            serviceId: sub.id,
          });
        });
      }
    });
    payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return payments;
  }, [subscriptions]);

  // 月別データ
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { payments: PaymentWithService[]; total: number }>();

    allPayments.forEach(payment => {
      const date = new Date(payment.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(yearMonth)) {
        monthMap.set(yearMonth, { payments: [], total: 0 });
      }
      const data = monthMap.get(yearMonth)!;
      data.payments.push(payment);
      // 簡易換算 (1 USD = 150 JPY)
      data.total += payment.currency === 'USD' ? payment.price * 150 : payment.price;
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([yearMonth, data]) => {
        const [year, month] = yearMonth.split('-');
        return {
          key: yearMonth,
          label: `${year}年${parseInt(month)}月`,
          ...data,
        };
      });
  }, [allPayments]);

  // サービス別データ
  const serviceData = useMemo(() => {
    const serviceMap = new Map<string, { payments: PaymentWithService[]; total: number }>();

    allPayments.forEach(payment => {
      if (!serviceMap.has(payment.serviceName)) {
        serviceMap.set(payment.serviceName, { payments: [], total: 0 });
      }
      const data = serviceMap.get(payment.serviceName)!;
      data.payments.push(payment);
      data.total += payment.currency === 'USD' ? payment.price * 150 : payment.price;
    });

    return Array.from(serviceMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({
        key: name,
        label: name,
        ...data,
      }));
  }, [allPayments]);

  const totalAllTime = useMemo(() => {
    return allPayments.reduce((sum, p) => {
      return sum + (p.currency === 'USD' ? p.price * 150 : p.price);
    }, 0);
  }, [allPayments]);

  const styles = createStyles(theme);
  const data = viewMode === 'byMonth' ? monthlyData : serviceData;

  if (allPayments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="receipt-text-outline" size={48} color={theme.colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>支払い履歴がありません</Text>
        <Text style={styles.emptySubtitle}>
          メールスキャンでサブスクを追加すると{'\n'}支払い履歴が表示されます
        </Text>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <View style={styles.container}>
      {/* ヘッダーカード */}
      <View style={styles.headerCard}>
        <Text style={styles.headerLabel}>累計支払い額</Text>
        <Text style={styles.headerAmount}>{formatPrice(totalAllTime, 'JPY')}</Text>
        <Text style={styles.headerSubtext}>{allPayments.length}件の支払い</Text>
      </View>

      {/* 切り替えタブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'byMonth' && styles.tabActive]}
          onPress={() => setViewMode('byMonth')}
        >
          <Icon
            name="calendar-month"
            size={18}
            color={viewMode === 'byMonth' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, viewMode === 'byMonth' && styles.tabTextActive]}>
            月別
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'byService' && styles.tabActive]}
          onPress={() => setViewMode('byService')}
        >
          <Icon
            name="apps"
            size={18}
            color={viewMode === 'byService' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, viewMode === 'byService' && styles.tabTextActive]}>
            サービス別
          </Text>
        </TouchableOpacity>
      </View>

      {/* リスト */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {data.map((section) => (
          <View key={section.key} style={styles.section}>
            {/* セクションヘッダー */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.label}</Text>
              <Text style={styles.sectionTotal}>
                {formatPrice(section.total, 'JPY')}
              </Text>
            </View>

            {/* 支払いアイテム */}
            <View style={styles.itemsContainer}>
              {section.payments.map((payment, index) => (
                <View
                  key={`${payment.serviceId}-${payment.date}-${index}`}
                  style={[
                    styles.paymentItem,
                    index === section.payments.length - 1 && styles.paymentItemLast,
                  ]}
                >
                  <View style={styles.paymentLeft}>
                    {viewMode === 'byMonth' && (
                      <Text style={styles.paymentService}>{payment.serviceName}</Text>
                    )}
                    <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                  </View>
                  <Text style={styles.paymentPrice}>
                    {formatPrice(payment.price, payment.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    emptyContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    headerCard: {
      backgroundColor: theme.colors.primary,
      margin: 16,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
    },
    headerLabel: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
    },
    headerAmount: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 4,
    },
    headerSubtext: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 4,
    },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    section: {
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    sectionTotal: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    itemsContainer: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    paymentItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    paymentItemLast: {
      borderBottomWidth: 0,
    },
    paymentLeft: {
      flex: 1,
    },
    paymentService: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    paymentDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    paymentPrice: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    bottomSpacer: {
      height: 32,
    },
  });
