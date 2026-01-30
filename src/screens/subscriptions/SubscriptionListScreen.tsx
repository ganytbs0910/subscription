import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SectionList,
  TextInput,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { formatPrice, calculateTotalMonthly, getDaysUntilNextBilling } from '../../utils/calculations';
import { getCategoryLabel, getBillingCycleLabel, CATEGORIES } from '../../utils/presets';
import SwipeableRow from '../../components/SwipeableRow';
import type { RootStackParamList, Subscription } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'list' | 'category';
type FilterMode = 'all' | 'active' | 'cancelled';
type SortMode = 'name' | 'price' | 'nextBilling';

export default function SubscriptionListScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { subscriptions, settings, deleteSubscription } = useSubscriptionStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  const activeCount = useMemo(() =>
    subscriptions.filter(s => s.isActive).length,
    [subscriptions]
  );

  const cancelledCount = useMemo(() =>
    subscriptions.filter(s => !s.isActive).length,
    [subscriptions]
  );

  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions;
    if (filterMode === 'active') result = result.filter(s => s.isActive);
    if (filterMode === 'cancelled') result = result.filter(s => !s.isActive);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }
    // Sort
    result = [...result].sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      if (sortMode === 'price') return b.price - a.price;
      if (sortMode === 'nextBilling') {
        return getDaysUntilNextBilling(a.nextBillingDate) - getDaysUntilNextBilling(b.nextBillingDate);
      }
      return 0;
    });
    return result;
  }, [subscriptions, filterMode, searchQuery, sortMode]);

  const monthlyTotal = useMemo(() =>
    calculateTotalMonthly(subscriptions.filter(s => s.isActive)),
    [subscriptions]
  );

  const styles = createStyles(theme);

  const handleDeleteItem = (item: Subscription) => {
    Alert.alert('削除確認', `「${item.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => deleteSubscription(item.id),
      },
    ]);
  };

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => (
    <SwipeableRow
      onDelete={() => handleDeleteItem(item)}
      style={{ marginBottom: 8 }}
    >
      <TouchableOpacity
        style={styles.subscriptionCard}
        onPress={() =>
          navigation.navigate('SubscriptionDetail', { subscriptionId: item.id })
        }
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: item.color || theme.colors.primary },
            !item.isActive && styles.iconContainerInactive,
          ]}
        >
          <Icon name={item.icon || 'credit-card'} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.subscriptionInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.subscriptionName, !item.isActive && styles.textInactive]}>
              {item.name}
            </Text>
            {(() => {
              // 単発課金の場合
              if (item.type === 'payment') {
                return (
                  <View style={styles.billingBadge}>
                    <Text style={styles.billingBadgeText}>課金</Text>
                  </View>
                );
              }
              // 解約済みサブスク
              if (!item.isActive) {
                return (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>解約済み</Text>
                  </View>
                );
              }
              // 契約中サブスク
              return (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>契約中</Text>
                </View>
              );
            })()}
          </View>
          <Text style={styles.subscriptionMeta}>
            {getBillingCycleLabel(item.billingCycle)}
          </Text>
        </View>
        <Text style={[styles.subscriptionPrice, !item.isActive && styles.textInactive]}>
          {formatPrice(item.price, item.currency)}
        </Text>
      </TouchableOpacity>
    </SwipeableRow>
  );

  const groupedByCategory = CATEGORIES.map((category) => ({
    title: category.label,
    icon: category.icon,
    data: filteredSubscriptions.filter((sub) => sub.category === category.value),
  })).filter((section) => section.data.length > 0);

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; icon: string; data: Subscription[] };
  }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconContainer}>
        <Icon name={section.icon} size={16} color={theme.colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
      </View>
    </View>
  );

  if (subscriptions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Icon name="credit-card-plus-outline" size={48} color={theme.colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>サブスクを追加しましょう</Text>
          <Text style={styles.emptyDescription}>
            メールスキャンで自動検出するか、{'\n'}手動で追加できます
          </Text>
          <View style={styles.emptyButtons}>
            <TouchableOpacity
              style={styles.emptyPrimaryButton}
              onPress={() => navigation.navigate('ScanEmail')}
            >
              <Icon name="email-search" size={20} color="#FFFFFF" />
              <Text style={styles.emptyPrimaryButtonText}>メールをスキャン</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptySecondaryButton}
              onPress={() => navigation.navigate('AddSubscription')}
            >
              <Text style={styles.emptySecondaryButtonText}>手動で追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* サマリーヘッダー */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryCount}>{activeCount}件</Text>
          <Text style={styles.summaryLabel}>契約中</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryAmount}>
            {formatPrice(monthlyTotal, settings.currency)}
          </Text>
          <Text style={styles.summaryLabel}>/月</Text>
        </View>
      </View>

      {/* フィルタータブ */}
      {cancelledCount > 0 && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
            onPress={() => setFilterMode('all')}
          >
            <Text style={[styles.filterTabText, filterMode === 'all' && styles.filterTabTextActive]}>
              すべて ({subscriptions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'active' && styles.filterTabActive]}
            onPress={() => setFilterMode('active')}
          >
            <Text style={[styles.filterTabText, filterMode === 'active' && styles.filterTabTextActive]}>
              有効 ({activeCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'cancelled' && styles.filterTabActive]}
            onPress={() => setFilterMode('cancelled')}
          >
            <Text style={[styles.filterTabText, filterMode === 'cancelled' && styles.filterTabTextActive]}>
              解約済み ({cancelledCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="サブスク名で検索..."
          placeholderTextColor={theme.colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ソートボタン */}
      <View style={styles.sortContainer}>
        {([
          { key: 'name' as SortMode, label: '名前' },
          { key: 'price' as SortMode, label: '金額' },
          { key: 'nextBilling' as SortMode, label: '請求日' },
        ]).map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortButton, sortMode === s.key && styles.sortButtonActive]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSortMode(s.key);
            }}
          >
            <Text style={[styles.sortButtonText, sortMode === s.key && styles.sortButtonTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ツールバー */}
      <View style={styles.toolbar}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Icon
              name="format-list-bulleted"
              size={18}
              color={viewMode === 'list' ? '#FFFFFF' : theme.colors.textSecondary}
            />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              一覧
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'category' && styles.toggleButtonActive]}
            onPress={() => setViewMode('category')}
          >
            <Icon
              name="shape"
              size={18}
              color={viewMode === 'category' ? '#FFFFFF' : theme.colors.textSecondary}
            />
            <Text style={[styles.toggleText, viewMode === 'category' && styles.toggleTextActive]}>
              カテゴリ
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddSubscription')}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* リスト */}
      {viewMode === 'list' ? (
        <FlatList
          data={filteredSubscriptions}
          renderItem={renderSubscriptionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <SectionList
          sections={groupedByCategory}
          renderItem={renderSubscriptionItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 14,
      padding: 16,
    },
    summaryLeft: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    summaryRight: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
    },
    summaryCount: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
    },
    summaryAmount: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
      padding: 0,
    },
    sortContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 10,
      gap: 8,
    },
    sortButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.card,
    },
    sortButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    sortButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    sortButtonTextActive: {
      color: '#FFFFFF',
    },
    filterContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      padding: 3,
    },
    filterTab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 8,
    },
    filterTabActive: {
      backgroundColor: theme.colors.primary,
    },
    filterTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    filterTabTextActive: {
      color: '#FFFFFF',
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      padding: 3,
    },
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    toggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    toggleTextActive: {
      color: '#FFFFFF',
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    subscriptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 14,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainerInactive: {
      opacity: 0.5,
    },
    subscriptionInfo: {
      flex: 1,
      marginLeft: 12,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subscriptionName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    textInactive: {
      opacity: 0.5,
    },
    inactiveBadge: {
      backgroundColor: theme.colors.error + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    inactiveBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.error,
    },
    activeBadge: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    activeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    billingBadge: {
      backgroundColor: '#34C759' + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    billingBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#34C759',
    },
    subscriptionMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    subscriptionPrice: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingTop: 16,
      gap: 8,
    },
    sectionIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    sectionBadge: {
      backgroundColor: theme.colors.card,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    sectionBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyIconContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyButtons: {
      marginTop: 28,
      gap: 12,
      width: '100%',
    },
    emptyPrimaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    emptyPrimaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    emptySecondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    emptySecondaryButtonText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
  });
