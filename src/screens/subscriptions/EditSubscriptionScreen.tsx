import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { CATEGORIES, BILLING_CYCLES, CURRENCIES } from '../../utils/presets';
import type { RootStackParamList, BillingCycle, Category } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditRouteProp = RouteProp<RootStackParamList, 'EditSubscription'>;

export default function EditSubscriptionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditRouteProp>();
  const { subscriptionId } = route.params;

  const { getSubscriptionById, updateSubscription } = useSubscriptionStore();
  const subscription = getSubscriptionById(subscriptionId);

  const [name, setName] = useState(subscription?.name || '');
  const [price, setPrice] = useState(subscription?.price?.toString() || '');
  const [currency, setCurrency] = useState(subscription?.currency || 'JPY');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    subscription?.billingCycle || 'monthly'
  );
  const [category, setCategory] = useState<Category>(
    subscription?.category || 'other'
  );
  const [description, setDescription] = useState(subscription?.description || '');

  const styles = createStyles(theme);

  if (!subscription) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>サブスクリプションが見つかりません</Text>
      </View>
    );
  }

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'サービス名を入力してください');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('エラー', '有効な金額を入力してください');
      return;
    }

    updateSubscription(subscriptionId, {
      name: name.trim(),
      price: Number(price),
      currency,
      billingCycle,
      category,
      description: description.trim() || undefined,
    });

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>サービス名 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="例: Netflix"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 2 }]}>
            <Text style={styles.label}>金額 *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>通貨</Text>
            <View style={styles.pickerContainer}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.pickerOption,
                    currency === c.value && styles.pickerOptionActive,
                  ]}
                  onPress={() => setCurrency(c.value)}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      currency === c.value && styles.pickerOptionTextActive,
                    ]}
                  >
                    {c.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>請求サイクル</Text>
          <View style={styles.optionsRow}>
            {BILLING_CYCLES.map((cycle) => (
              <TouchableOpacity
                key={cycle.value}
                style={[
                  styles.optionButton,
                  billingCycle === cycle.value && styles.optionButtonActive,
                ]}
                onPress={() => setBillingCycle(cycle.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    billingCycle === cycle.value && styles.optionButtonTextActive,
                  ]}
                >
                  {cycle.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>カテゴリ</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  category === cat.value && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Icon
                  name={cat.icon}
                  size={20}
                  color={category === cat.value ? '#FFFFFF' : theme.colors.text}
                />
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat.value && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>メモ (任意)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="追加情報を入力..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 32,
    },
    formContainer: {
      flex: 1,
      padding: 16,
    },
    formGroup: {
      marginBottom: 20,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pickerOption: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
    },
    pickerOptionActive: {
      backgroundColor: theme.colors.primary,
    },
    pickerOptionText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    pickerOptionTextActive: {
      color: '#FFFFFF',
    },
    optionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    optionButton: {
      flex: 1,
      backgroundColor: theme.colors.card,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optionButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    optionButtonText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    optionButtonTextActive: {
      color: '#FFFFFF',
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryButtonText: {
      fontSize: 13,
      color: theme.colors.text,
    },
    categoryButtonTextActive: {
      color: '#FFFFFF',
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 32,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
  });
