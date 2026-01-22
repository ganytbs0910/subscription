import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { formatPrice } from '../../utils/calculations';
import { getCategoryLabel, getBillingCycleLabel, CATEGORIES } from '../../utils/presets';
import type { RootStackParamList, Subscription, Category } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ViewMode = 'list' | 'category';

export default function SubscriptionListScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { subscriptions } = useSubscriptionStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const styles = createStyles(theme);

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => (
    <TouchableOpacity
      style={styles.subscriptionCard}
      onPress={() =>
        navigation.navigate('SubscriptionDetail', { subscriptionId: item.id })
      }
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: item.color || theme.colors.primary },
        ]}
      >
        <Icon name={item.icon || 'credit-card'} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.subscriptionInfo}>
        <Text style={styles.subscriptionName}>{item.name}</Text>
        <Text style={styles.subscriptionMeta}>
          {getCategoryLabel(item.category)} • {getBillingCycleLabel(item.billingCycle)}
        </Text>
      </View>
      <View style={styles.subscriptionRight}>
        <Text style={styles.subscriptionPrice}>
          {formatPrice(item.price, item.currency)}
        </Text>
        {!item.isActive && (
          <Text style={styles.inactiveLabel}>停止中</Text>
        )}
      </View>
      <Icon
        name="chevron-right"
        size={24}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const groupedByCategory = CATEGORIES.map((category) => ({
    title: category.label,
    icon: category.icon,
    data: subscriptions.filter((sub) => sub.category === category.value),
  })).filter((section) => section.data.length > 0);

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; icon: string; data: Subscription[] };
  }) => (
    <View style={styles.sectionHeader}>
      <Icon name={section.icon} size={20} color={theme.colors.primary} />
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'list' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Icon
              name="format-list-bulleted"
              size={20}
              color={viewMode === 'list' ? '#FFFFFF' : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'category' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('category')}
          >
            <Icon
              name="view-grid"
              size={20}
              color={viewMode === 'category' ? '#FFFFFF' : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={() => navigation.navigate('AddSubscription')}
        >
          <Icon name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon
            name="credit-card-off-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>サブスクがありません</Text>
          <Text style={styles.emptyDescription}>
            「追加」ボタンから新しいサブスクを登録してください
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => navigation.navigate('AddSubscription')}
          >
            <Text style={styles.emptyAddButtonText}>サブスクを追加</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscriptionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <SectionList
          sections={groupedByCategory}
          renderItem={renderSubscriptionItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      overflow: 'hidden',
    },
    toggleButton: {
      padding: 10,
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    addIconButton: {
      padding: 8,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    subscriptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subscriptionInfo: {
      flex: 1,
      marginLeft: 12,
    },
    subscriptionName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    subscriptionMeta: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    subscriptionRight: {
      alignItems: 'flex-end',
      marginRight: 8,
    },
    subscriptionPrice: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    inactiveLabel: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    sectionCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 16,
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    emptyAddButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 24,
    },
    emptyAddButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
