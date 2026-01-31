import React, { useState, useMemo } from 'react';
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
import { format, addMonths } from 'date-fns';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  POPULAR_SERVICES,
  CATEGORIES,
  BILLING_CYCLES,
  CURRENCIES,
} from '../../utils/presets';
import type {
  RootStackParamList,
  BillingCycle,
  Category,
  PopularService,
} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddRouteProp = RouteProp<RootStackParamList, 'AddSubscription'>;

export default function AddSubscriptionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddRouteProp>();
  const presetService = route.params?.presetService;

  const { addSubscription, settings } = useSubscriptionStore();

  const [showPresets, setShowPresets] = useState(!presetService);
  const [name, setName] = useState(presetService?.name || '');
  const [price, setPrice] = useState(
    presetService?.defaultPrice?.toString() || ''
  );
  const [currency, setCurrency] = useState(
    presetService?.defaultCurrency || settings.currency
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    presetService?.defaultBillingCycle || 'monthly'
  );
  const [category, setCategory] = useState<Category>(
    presetService?.category || 'other'
  );
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(presetService?.icon || '');
  const [selectedColor, setSelectedColor] = useState(
    presetService?.color || '#007AFF'
  );

  const styles = createStyles(theme);

  const handleSelectPreset = (service: PopularService) => {
    setName(service.name);
    setPrice(service.defaultPrice?.toString() || '');
    setCurrency(service.defaultCurrency || settings.currency);
    setBillingCycle(service.defaultBillingCycle || 'monthly');
    setCategory(service.category);
    setSelectedIcon(service.icon);
    setSelectedColor(service.color);
    setShowPresets(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'サービス名を入力してください');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('エラー', '有効な金額を入力してください');
      return;
    }

    const now = new Date();
    const nextBillingDate = addMonths(now, 1);

    addSubscription({
      name: name.trim(),
      price: Number(price),
      currency,
      billingCycle,
      category,
      nextBillingDate: nextBillingDate.toISOString(),
      startDate: now.toISOString(),
      description: description.trim() || undefined,
      icon: selectedIcon || 'credit-card',
      color: selectedColor,
      isActive: true,
    });

    navigation.goBack();
  };

  // 手動追加が必要なサービスと自動検出可能なサービスを分離
  const manualServices = useMemo(
    () => POPULAR_SERVICES.filter((s) => s.requiresManualEntry),
    []
  );
  const autoDetectableServices = useMemo(
    () => POPULAR_SERVICES.filter((s) => !s.requiresManualEntry),
    []
  );

  if (showPresets) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.presetHeader}>
          <Text style={styles.presetTitle}>人気サービスから選択</Text>
          <TouchableOpacity onPress={() => setShowPresets(false)}>
            <Text style={styles.skipText}>手動入力</Text>
          </TouchableOpacity>
        </View>

        {/* 手動追加が必要なサービス（メールで検出不可） */}
        <View style={styles.manualSection}>
          <View style={styles.manualHeader}>
            <Icon name="alert-circle-outline" size={18} color="#FB8C00" />
            <Text style={styles.manualSectionTitle}>手動追加が必要</Text>
          </View>
          <Text style={styles.manualDescription}>
            これらのサービスはメールスキャンで検出できません
          </Text>
        </View>

        <View style={styles.presetGrid}>
          {manualServices.map((service) => (
            <TouchableOpacity
              key={service.name}
              style={styles.presetCard}
              onPress={() => handleSelectPreset(service)}
            >
              <View style={styles.presetIconWrapper}>
                <View
                  style={[
                    styles.presetIcon,
                    { backgroundColor: service.color },
                  ]}
                >
                  <Icon name={service.icon} size={28} color="#FFFFFF" />
                </View>
                <View style={styles.manualBadge}>
                  <Icon name="hand-pointing-right" size={12} color="#FFF" />
                </View>
              </View>
              <Text style={styles.presetName}>{service.name}</Text>
              {service.defaultPrice && (
                <Text style={styles.presetPrice}>
                  ¥{service.defaultPrice.toLocaleString()}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 自動検出可能なサービス */}
        {autoDetectableServices.length > 0 && (
          <>
            <View style={styles.autoSection}>
              <View style={styles.manualHeader}>
                <Icon name="email-check-outline" size={18} color="#4CAF50" />
                <Text style={styles.autoSectionTitle}>自動検出可能</Text>
              </View>
              <Text style={styles.manualDescription}>
                メールスキャンで自動的に検出されます
              </Text>
            </View>

            <View style={styles.presetGrid}>
              {autoDetectableServices.map((service) => (
                <TouchableOpacity
                  key={service.name}
                  style={[styles.presetCard, styles.autoPresetCard]}
                  onPress={() => handleSelectPreset(service)}
                >
                  <View
                    style={[
                      styles.presetIcon,
                      { backgroundColor: service.color, opacity: 0.7 },
                    ]}
                  >
                    <Icon name={service.icon} size={28} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.presetName, styles.autoPresetName]}>
                    {service.name}
                  </Text>
                  {service.defaultPrice && (
                    <Text style={styles.presetPrice}>
                      ¥{service.defaultPrice.toLocaleString()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.formContainer}>
        <TouchableOpacity
          style={styles.backToPresets}
          onPress={() => setShowPresets(true)}
        >
          <Icon name="arrow-left" size={20} color={theme.colors.primary} />
          <Text style={styles.backToPresetsText}>人気サービスから選択</Text>
        </TouchableOpacity>

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
                  color={
                    category === cat.value ? '#FFFFFF' : theme.colors.text
                  }
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
    presetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    presetTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    skipText: {
      fontSize: 16,
      color: theme.colors.primary,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 8,
    },
    presetCard: {
      width: '33.33%',
      padding: 8,
      alignItems: 'center',
    },
    autoPresetCard: {
      opacity: 0.6,
    },
    presetIconWrapper: {
      position: 'relative',
    },
    presetIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    manualBadge: {
      position: 'absolute',
      bottom: 4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FB8C00',
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetName: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
    },
    autoPresetName: {
      color: theme.colors.textSecondary,
    },
    presetPrice: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    manualSection: {
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    autoSection: {
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
    },
    manualHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    manualSectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FB8C00',
    },
    autoSectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#4CAF50',
    },
    manualDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
      marginLeft: 24,
    },
    formContainer: {
      flex: 1,
      padding: 16,
    },
    backToPresets: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 8,
    },
    backToPresetsText: {
      fontSize: 16,
      color: theme.colors.primary,
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
