import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  configureGoogleSignIn,
  signInWithGoogle,
  signOutGoogle,
  getCurrentUser,
} from '../../services/googleAuth';
import {
  fetchSubscriptionEmails,
  fetchMultipleEmailDetails,
} from '../../services/gmailService';
import {
  parseMultipleEmails,
  DetectedSubscription,
} from '../../services/emailParser';
import {
  testICloudConnection,
  fetchICloudSubscriptions,
  ICloudCredentials,
} from '../../services/icloudService';
import { getCategoryLabel } from '../../utils/presets';
import { formatPrice } from '../../utils/calculations';
import type { RootStackParamList, BillingCycle } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type EmailProvider = 'gmail' | 'icloud';
type ScanStatus = 'idle' | 'signing_in' | 'connecting' | 'fetching' | 'parsing' | 'done' | 'error';

export default function ScanEmailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { addSubscription, subscriptions } = useSubscriptionStore();

  const [provider, setProvider] = useState<EmailProvider | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [detectedSubscriptions, setDetectedSubscriptions] = useState<DetectedSubscription[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // iCloud credentials
  const [icloudEmail, setIcloudEmail] = useState('');
  const [icloudAppPassword, setIcloudAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = () => {
    const user = getCurrentUser();
    if (user?.data?.user?.email) {
      setUserEmail(user.data.user.email);
      setProvider('gmail');
    }
  };

  const handleGmailScan = async () => {
    setStatus('signing_in');
    setErrorMessage(null);
    setDetectedSubscriptions([]);

    try {
      const { accessToken, user } = await signInWithGoogle();
      setUserEmail(user?.email || null);

      setStatus('fetching');
      const messages = await fetchSubscriptionEmails(accessToken);

      if (messages.length === 0) {
        setStatus('done');
        Alert.alert('結果', 'サブスク関連のメールが見つかりませんでした');
        return;
      }

      setProgress({ current: 0, total: messages.length });
      const messageIds = messages.slice(0, 50).map((m) => m.id);
      const emailDetails = await fetchMultipleEmailDetails(
        accessToken,
        messageIds,
        (current, total) => setProgress({ current, total }),
      );

      setStatus('parsing');
      const detected = parseMultipleEmails(emailDetails);

      const existingNames = new Set(subscriptions.map((s) => s.name.toLowerCase()));
      const newSubscriptions = detected.filter(
        (d) => !existingNames.has(d.name.toLowerCase()),
      );

      setDetectedSubscriptions(newSubscriptions);
      setSelectedItems(new Set(newSubscriptions.map((s) => s.name)));
      setStatus('done');

      if (newSubscriptions.length === 0 && detected.length > 0) {
        Alert.alert('結果', '検出されたサブスクはすべて登録済みです');
      }
    } catch (error: any) {
      console.error('Gmail scan error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'スキャン中にエラーが発生しました');
    }
  };

  const handleICloudScan = async () => {
    if (!icloudEmail.trim() || !icloudAppPassword.trim()) {
      Alert.alert('エラー', 'メールアドレスとApp専用パスワードを入力してください');
      return;
    }

    const credentials: ICloudCredentials = {
      email: icloudEmail.trim(),
      appPassword: icloudAppPassword.trim(),
    };

    setStatus('connecting');
    setErrorMessage(null);
    setDetectedSubscriptions([]);

    try {
      // Test connection first
      const testResult = await testICloudConnection(credentials);
      if (!testResult.success) {
        setStatus('error');
        setErrorMessage(testResult.error || '接続に失敗しました');
        return;
      }

      setUserEmail(icloudEmail);
      setStatus('fetching');

      // Fetch subscriptions
      const result = await fetchICloudSubscriptions(credentials, 50);

      if (!result.success) {
        setStatus('error');
        setErrorMessage(result.error || 'メール取得に失敗しました');
        return;
      }

      const existingNames = new Set(subscriptions.map((s) => s.name.toLowerCase()));
      const newSubscriptions = result.subscriptions.filter(
        (d) => !existingNames.has(d.name.toLowerCase()),
      );

      setDetectedSubscriptions(newSubscriptions);
      setSelectedItems(new Set(newSubscriptions.map((s) => s.name)));
      setStatus('done');

      if (newSubscriptions.length === 0 && result.totalFound > 0) {
        Alert.alert('結果', '検出されたサブスクはすべて登録済みです');
      } else if (result.totalFound === 0) {
        Alert.alert('結果', 'サブスク関連のメールが見つかりませんでした');
      }
    } catch (error: any) {
      console.error('iCloud scan error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'スキャン中にエラーが発生しました');
    }
  };

  const handleSignOut = async () => {
    if (provider === 'gmail') {
      await signOutGoogle();
    }
    setUserEmail(null);
    setDetectedSubscriptions([]);
    setStatus('idle');
    setProvider(null);
    setIcloudEmail('');
    setIcloudAppPassword('');
  };

  const toggleSelection = (name: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedItems(newSelected);
  };

  const handleAddSelected = () => {
    const selected = detectedSubscriptions.filter((s) => selectedItems.has(s.name));

    for (const sub of selected) {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      addSubscription({
        name: sub.name,
        price: sub.price || 0,
        currency: sub.currency,
        billingCycle: sub.billingCycle || 'monthly',
        category: sub.category,
        nextBillingDate: nextMonth.toISOString(),
        startDate: now.toISOString(),
        isActive: true,
      });
    }

    Alert.alert(
      '追加完了',
      `${selected.length}件のサブスクを追加しました`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const getBillingCycleLabel = (cycle: BillingCycle | null): string => {
    switch (cycle) {
      case 'monthly':
        return '月額';
      case 'yearly':
        return '年額';
      case 'weekly':
        return '週額';
      case 'quarterly':
        return '四半期';
      default:
        return '不明';
    }
  };

  const openAppPasswordHelp = () => {
    Linking.openURL('https://support.apple.com/ja-jp/102654');
  };

  const styles = createStyles(theme);

  const renderProviderSelection = () => (
    <View style={styles.providerSection}>
      <Text style={styles.sectionTitle}>メールプロバイダーを選択</Text>

      <TouchableOpacity
        style={[styles.providerCard, provider === 'gmail' && styles.providerCardSelected]}
        onPress={() => setProvider('gmail')}
      >
        <Icon name="google" size={32} color="#4285F4" />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>Gmail</Text>
          <Text style={styles.providerDesc}>Googleアカウントでログイン</Text>
        </View>
        {provider === 'gmail' && (
          <Icon name="check-circle" size={24} color={theme.colors.primary} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.providerCard, provider === 'icloud' && styles.providerCardSelected]}
        onPress={() => setProvider('icloud')}
      >
        <Icon name="apple" size={32} color={theme.colors.text} />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>iCloud Mail</Text>
          <Text style={styles.providerDesc}>App専用パスワードが必要</Text>
        </View>
        {provider === 'icloud' && (
          <Icon name="check-circle" size={24} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderICloudForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.formLabel}>iCloudメールアドレス</Text>
      <TextInput
        style={styles.input}
        placeholder="example@icloud.com"
        placeholderTextColor={theme.colors.textSecondary}
        value={icloudEmail}
        onChangeText={setIcloudEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.formLabel}>App専用パスワード</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="xxxx-xxxx-xxxx-xxxx"
          placeholderTextColor={theme.colors.textSecondary}
          value={icloudAppPassword}
          onChangeText={setIcloudAppPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Icon
            name={showPassword ? 'eye-off' : 'eye'}
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.helpLink} onPress={openAppPasswordHelp}>
        <Icon name="help-circle-outline" size={16} color={theme.colors.primary} />
        <Text style={styles.helpLinkText}>App専用パスワードの作成方法</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatus = () => {
    switch (status) {
      case 'signing_in':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>Googleにログイン中...</Text>
          </View>
        );
      case 'connecting':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>iCloudに接続中...</Text>
          </View>
        );
      case 'fetching':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>
              メールを取得中...
              {progress.total > 0 && ` (${progress.current}/${progress.total})`}
            </Text>
          </View>
        );
      case 'parsing':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>サブスクを検出中...</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.statusContainer}>
            <Icon name="alert-circle" size={48} color={theme.colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={provider === 'gmail' ? handleGmailScan : handleICloudScan}
            >
              <Text style={styles.retryButtonText}>再試行</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* User Info */}
        {userEmail && (
          <View style={styles.userCard}>
            <Icon
              name={provider === 'gmail' ? 'google' : 'apple'}
              size={24}
              color={provider === 'gmail' ? '#4285F4' : theme.colors.text}
            />
            <Text style={styles.userEmail}>{userEmail}</Text>
            <TouchableOpacity onPress={handleSignOut}>
              <Icon name="logout" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        <View style={styles.descriptionCard}>
          <Icon name="email-search" size={32} color={theme.colors.primary} />
          <Text style={styles.descriptionTitle}>メールからサブスクを検出</Text>
          <Text style={styles.descriptionText}>
            メールに届いている領収書や請求書から、登録中のサブスクリプションを自動で検出します。
          </Text>
        </View>

        {/* Provider Selection */}
        {!userEmail && status === 'idle' && renderProviderSelection()}

        {/* iCloud Form */}
        {provider === 'icloud' && !userEmail && status === 'idle' && renderICloudForm()}

        {/* Status */}
        {renderStatus()}

        {/* Scan Button */}
        {provider && (status === 'idle' || status === 'done') && !userEmail && (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={provider === 'gmail' ? handleGmailScan : handleICloudScan}
          >
            <Icon name="magnify" size={24} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>
              {provider === 'gmail' ? 'Googleでログインしてスキャン' : 'iCloudメールをスキャン'}
            </Text>
          </TouchableOpacity>
        )}

        {userEmail && (status === 'idle' || status === 'done') && (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={provider === 'gmail' ? handleGmailScan : handleICloudScan}
          >
            <Icon name="magnify" size={24} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>メールをスキャン</Text>
          </TouchableOpacity>
        )}

        {/* Results */}
        {status === 'done' && detectedSubscriptions.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              検出されたサブスク ({detectedSubscriptions.length}件)
            </Text>

            {detectedSubscriptions.map((sub) => (
              <TouchableOpacity
                key={sub.name}
                style={styles.resultCard}
                onPress={() => toggleSelection(sub.name)}
              >
                <View style={styles.checkbox}>
                  {selectedItems.has(sub.name) ? (
                    <Icon name="checkbox-marked" size={24} color={theme.colors.primary} />
                  ) : (
                    <Icon name="checkbox-blank-outline" size={24} color={theme.colors.textSecondary} />
                  )}
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{sub.name}</Text>
                  <Text style={styles.resultCategory}>
                    {getCategoryLabel(sub.category)}
                  </Text>
                </View>
                <View style={styles.resultRight}>
                  {sub.price ? (
                    <>
                      <Text style={styles.resultPrice}>
                        {formatPrice(sub.price, sub.currency)}
                      </Text>
                      <Text style={styles.resultCycle}>
                        {getBillingCycleLabel(sub.billingCycle)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.resultUnknown}>金額不明</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {status === 'done' && detectedSubscriptions.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={48} color={theme.colors.success} />
            <Text style={styles.emptyText}>
              新しいサブスクは検出されませんでした
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      {status === 'done' && selectedItems.size > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddSelected}>
            <Icon name="plus" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              {selectedItems.size}件を追加
            </Text>
          </TouchableOpacity>
        </View>
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
    scrollView: {
      flex: 1,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      margin: 16,
      marginBottom: 8,
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    userEmail: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
    },
    descriptionCard: {
      backgroundColor: theme.colors.card,
      margin: 16,
      marginTop: 8,
      padding: 24,
      borderRadius: 16,
      alignItems: 'center',
    },
    descriptionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 12,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    providerSection: {
      padding: 16,
      paddingTop: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    providerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    providerCardSelected: {
      borderColor: theme.colors.primary,
    },
    providerInfo: {
      flex: 1,
      marginLeft: 16,
    },
    providerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    providerDesc: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    formSection: {
      padding: 16,
      paddingTop: 0,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordInput: {
      paddingRight: 50,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      top: 12,
      padding: 4,
    },
    helpLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 6,
    },
    helpLinkText: {
      fontSize: 13,
      color: theme.colors.primary,
    },
    statusContainer: {
      alignItems: 'center',
      padding: 32,
    },
    statusText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
      marginTop: 12,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    scanButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    resultsSection: {
      padding: 16,
    },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    checkbox: {
      marginRight: 12,
    },
    resultInfo: {
      flex: 1,
    },
    resultName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    resultCategory: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    resultRight: {
      alignItems: 'flex-end',
    },
    resultPrice: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    resultCycle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    resultUnknown: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    bottomBar: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
