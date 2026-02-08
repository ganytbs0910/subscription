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
import { MMKV } from 'react-native-mmkv';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

// 認証情報保存用ストレージ（暗号化有効）
// 注意: より安全な実装にはreact-native-keychainの使用を推奨
// この暗号化キーはアプリ固有のもので、認証情報の平文保存を防ぎます
const CREDENTIALS_ENCRYPTION_KEY = 'sub-mgr-cred-2025';
const credentialsStorage = new MMKV({
  id: 'credentials-storage',
  encryptionKey: CREDENTIALS_ENCRYPTION_KEY,
});
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
  DetectionType,
  SubItem,
  SubItemPurchase,
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
  const { addSubscription, subscriptions, settings } = useSubscriptionStore();

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
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  const [autoScanTriggered, setAutoScanTriggered] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
    checkCurrentUser();
    loadSavedCredentials();
  }, []);

  // 保存された認証情報がある場合は自動スキャン
  useEffect(() => {
    if (hasSavedCredentials && !autoScanTriggered && status === 'idle' && icloudEmail && icloudAppPassword) {
      setAutoScanTriggered(true);
      // 少し遅延を入れてUIが表示されてからスキャン開始
      const timer = setTimeout(() => {
        handleICloudScanAuto();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasSavedCredentials, autoScanTriggered, status, icloudEmail, icloudAppPassword]);

  const loadSavedCredentials = () => {
    const savedEmail = credentialsStorage.getString('icloud_email');
    const savedPassword = credentialsStorage.getString('icloud_password');
    if (savedEmail && savedPassword) {
      setIcloudEmail(savedEmail);
      setIcloudAppPassword(savedPassword);
      setHasSavedCredentials(true);
      setProvider('icloud');
    }
  };

  const saveCredentials = (email: string, password: string) => {
    credentialsStorage.set('icloud_email', email);
    credentialsStorage.set('icloud_password', password);
    setHasSavedCredentials(true);
  };

  const clearSavedCredentials = () => {
    credentialsStorage.delete('icloud_email');
    credentialsStorage.delete('icloud_password');
    setHasSavedCredentials(false);
  };

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
      const scanMaxCount = settings.emailScanMaxCount ?? 500;
      const messages = await fetchSubscriptionEmails(
        accessToken,
        scanMaxCount,
        (fetched) => setProgress({ current: fetched, total: 0 }),
      );

      if (messages.length === 0) {
        setStatus('done');
        Alert.alert('結果', 'サブスク・課金関連のメールが見つかりませんでした');
        return;
      }

      // 過去N年分のメールのみ取得
      const yearsBack = settings.emailScanYearsBack ?? 3;
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);

      setProgress({ current: 0, total: messages.length });
      const messageIds = messages.map((m) => m.id);
      const emailDetails = await fetchMultipleEmailDetails(
        accessToken,
        messageIds,
        (current, total) => setProgress({ current, total }),
      );

      // 過去N年分のみフィルタ
      const filteredDetails = emailDetails.filter((email) => {
        const dateMs = parseInt(email.internalDate, 10);
        return !isNaN(dateMs) && dateMs >= cutoffDate.getTime();
      });

      setStatus('parsing');
      const detected = parseMultipleEmails(filteredDetails);

      const existingNames = new Set(subscriptions.map((s) => s.name.toLowerCase()));
      const newSubscriptions = detected.filter(
        (d) => !existingNames.has(d.name.toLowerCase()),
      );

      setDetectedSubscriptions(newSubscriptions);
      setSelectedItems(new Set(newSubscriptions.map((s) => s.name)));
      setStatus('done');

      if (newSubscriptions.length === 0 && detected.length > 0) {
        Alert.alert('結果', '検出されたサブスク・課金はすべて登録済みです');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'スキャン中にエラーが発生しました');
    }
  };

  // 自動スキャン用（Alertなし）
  const handleICloudScanAuto = async () => {
    if (!icloudEmail.trim() || !icloudAppPassword.trim()) {
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
      const testResult = await testICloudConnection(credentials);
      if (!testResult.success) {
        setStatus('error');
        setErrorMessage(testResult.error || '接続に失敗しました');
        return;
      }

      setUserEmail(icloudEmail);
      setStatus('fetching');

      const result = await fetchICloudSubscriptions(credentials, 300);

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
    } catch (error: any) {
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

      // 認証成功したら保存
      saveCredentials(credentials.email, credentials.appPassword);

      // Fetch subscriptions
      const result = await fetchICloudSubscriptions(credentials, 300);

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
        Alert.alert('結果', '検出されたサブスク・課金はすべて登録済みです');
      } else if (result.totalFound === 0) {
        Alert.alert('結果', 'サブスク・課金関連のメールが見つかりませんでした');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'スキャン中にエラーが発生しました');
    }
  };

  const handleSignOut = async () => {
    if (provider === 'gmail') {
      await signOutGoogle();
    }
    if (provider === 'icloud') {
      clearSavedCredentials();
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
    try {
      const selected = detectedSubscriptions.filter((s) => selectedItems.has(s.name));

      for (const sub of selected) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        // 支払い履歴から最も古い日付を開始日として使用
        let startDate = now.toISOString();
        if (sub.paymentHistory && sub.paymentHistory.length > 0) {
          const sortedHistory = [...sub.paymentHistory].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          startDate = sortedHistory[0].date;
        }

        // subItemsからアイテム名付きの支払い履歴を構築
        const paymentHistory: { date: string; price: number; currency: string; subject?: string; itemName?: string }[] = [];
        if (sub.subItems && sub.subItems.length > 0) {
          // subItemsがある場合はそこから支払い履歴を構築
          for (const item of sub.subItems) {
            for (const purchase of item.purchases) {
              paymentHistory.push({
                date: purchase.date,
                price: purchase.price,
                currency: item.currency,
                itemName: item.name,
              });
            }
          }
          // 日付でソート（新しい順）
          paymentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else if (sub.paymentHistory) {
          // subItemsがない場合は従来の支払い履歴を使用
          for (const h of sub.paymentHistory) {
            paymentHistory.push({
              date: h.date,
              price: h.price,
              currency: h.currency,
              subject: h.subject,
            });
          }
        }

        // subItemsをSubItem形式に変換
        const subItems = sub.subItems?.map(item => ({
          name: item.name,
          currency: item.currency,
          purchases: item.purchases.map(p => ({ date: p.date, price: p.price })),
          totalPaid: item.totalPaid,
        }));

        // サブスクの契約状態を最終支払い日から判定
        // 月額なら前月〜今月に支払いがあれば契約中、それ以前なら確実に解約済み
        let isActive = true;
        if (sub.type === 'subscription' && paymentHistory.length > 0) {
          const lastPaymentDate = new Date(paymentHistory[0].date); // already sorted newest first
          const now = new Date();
          const cycle = sub.billingCycle || 'monthly';

          // 最終支払い月と現在の月の差分（月単位）
          const monthsDiff =
            (now.getFullYear() - lastPaymentDate.getFullYear()) * 12 +
            (now.getMonth() - lastPaymentDate.getMonth());

          if (cycle === 'monthly') {
            // 月額: 前月(1ヶ月前)以降に支払いがあれば契約中
            isActive = monthsDiff <= 1;
          } else if (cycle === 'yearly') {
            // 年額: 12ヶ月以内に支払いがあれば契約中
            isActive = monthsDiff <= 12;
          } else if (cycle === 'quarterly') {
            // 四半期: 3ヶ月以内に支払いがあれば契約中
            isActive = monthsDiff <= 3;
          } else if (cycle === 'weekly') {
            // 週額: 日数で判定（2週間以内）
            const daysDiff = Math.floor(
              (now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            isActive = daysDiff <= 14;
          }
        }

        const subscriptionData = {
          name: sub.name,
          price: sub.price || 0,
          currency: sub.currency || 'JPY',
          billingCycle: sub.billingCycle || 'monthly',
          category: sub.category,
          nextBillingDate: nextMonth.toISOString(),
          startDate,
          isActive,
          type: sub.type,
          paymentHistory,
          totalPaidFromEmail: sub.totalPaid,
          subItems,
        };

        addSubscription(subscriptionData);
      }

      Alert.alert(
        '追加完了',
        `${selected.length}件を追加しました`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert('エラー', `追加中にエラーが発生しました: ${error.message}`);
    }
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

  const getTypeLabel = (type: DetectionType): string => {
    return type === 'subscription' ? 'サブスク' : '課金';
  };

  const getTypeColor = (type: DetectionType): string => {
    return type === 'subscription' ? theme.colors.primary : '#FF9500';
  };

  // 日付を「M/D」形式にフォーマット
  const formatShortDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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

      {hasSavedCredentials && (
        <TouchableOpacity
          style={styles.rescanMainButton}
          onPress={handleICloudScan}
        >
          <Icon name="refresh" size={24} color="#FFFFFF" />
          <Text style={styles.scanButtonText}>再スキャン</Text>
        </TouchableOpacity>
      )}
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
              {progress.total > 0
                ? ` (${progress.current}/${progress.total})`
                : progress.current > 0
                ? ` (${progress.current}件)`
                : ''}
            </Text>
          </View>
        );
      case 'parsing':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>サブスク・課金を検出中...</Text>
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
          <Text style={styles.descriptionTitle}>メールからサブスク・課金を検出</Text>
          <Text style={styles.descriptionText}>
            メールに届いている領収書や請求書から、サブスクリプションや課金情報を自動で検出します。
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

        {userEmail && status === 'idle' && (
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
              検出されたサブスク・課金 ({detectedSubscriptions.length}件)
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
                  {/* ヘッダー行: アプリ名(回数) と 累計金額 */}
                  <View style={styles.resultHeader}>
                    <View style={styles.resultNameRow}>
                      <Text style={styles.resultName}>
                        {sub.name}
                        {sub.paymentCount != null && sub.paymentCount > 0 && (
                          <Text style={styles.paymentCountText}> ({sub.paymentCount}回)</Text>
                        )}
                      </Text>
                    </View>
                    {sub.totalPaid != null && sub.totalPaid > 0 && (
                      <Text style={styles.totalPaidText}>
                        {formatPrice(sub.totalPaid, sub.currency)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.resultMeta}>
                    <Text style={styles.resultCategory}>
                      {getCategoryLabel(sub.category)}
                    </Text>
                    {(() => {
                      // 課金（単発購入）の場合
                      if (sub.type === 'payment') {
                        return (
                          <View style={[styles.statusBadge, { backgroundColor: '#FF950020' }]}>
                            <Text style={[styles.statusBadgeText, { color: '#FF9500' }]}>
                              課金
                            </Text>
                          </View>
                        );
                      }
                      // サブスクの場合
                      if (sub.type === 'subscription' && sub.paymentHistory && sub.paymentHistory.length > 0) {
                        const sortedHistory = [...sub.paymentHistory].sort(
                          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                        );
                        const lastDate = new Date(sortedHistory[0].date);
                        const now = new Date();
                        const monthsDiff =
                          (now.getFullYear() - lastDate.getFullYear()) * 12 +
                          (now.getMonth() - lastDate.getMonth());
                        const cycle = sub.billingCycle || 'monthly';
                        const active =
                          cycle === 'monthly' ? monthsDiff <= 1 :
                          cycle === 'yearly' ? monthsDiff <= 12 :
                          cycle === 'quarterly' ? monthsDiff <= 3 :
                          Math.floor((now.getTime() - lastDate.getTime()) / 86400000) <= 14;
                        return (
                          <View style={[styles.statusBadge, { backgroundColor: active ? '#34C75920' : '#FF3B3020' }]}>
                            <Text style={[styles.statusBadgeText, { color: active ? '#34C759' : '#FF3B30' }]}>
                              {active ? '契約中' : '解約済み'}
                            </Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                  {/* サブアイテム（内訳）を表示 */}
                  {sub.subItems && sub.subItems.length > 0 && (
                    <View style={styles.subItemsContainer}>
                      {sub.subItems.map((item: SubItem, itemIndex: number) => (
                        <View key={itemIndex} style={styles.subItemGroup}>
                          <Text style={styles.subItemName}>{item.name}</Text>
                          {item.purchases.map((purchase: SubItemPurchase, purchaseIndex: number) => (
                            <View key={purchaseIndex} style={styles.subItemPurchase}>
                              <Text style={styles.subItemDate}>{formatShortDate(purchase.date)}</Text>
                              <Text style={styles.subItemPrice}>{formatPrice(purchase.price, item.currency)}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
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
              新しいサブスク・課金は検出されませんでした
            </Text>
          </View>
        )}

        {/* 再スキャンボタン */}
        {status === 'done' && userEmail && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={provider === 'gmail' ? handleGmailScan : handleICloudScan}
          >
            <Icon name="refresh" size={20} color={theme.colors.primary} />
            <Text style={styles.rescanButtonText}>再スキャン</Text>
          </TouchableOpacity>
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
    rescanMainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginTop: 20,
      padding: 16,
      borderRadius: 12,
      gap: 8,
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
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    resultNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      flex: 1,
    },
    resultName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    paymentCountText: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.textSecondary,
    },
    totalPaidText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primary,
      marginLeft: 8,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    resultMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      gap: 8,
    },
    resultCategory: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    subItemsContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    subItemGroup: {
      marginBottom: 8,
    },
    subItemName: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 2,
    },
    subItemPurchase: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      marginTop: 2,
    },
    subItemDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      width: 40,
    },
    subItemPrice: {
      fontSize: 12,
      color: theme.colors.textSecondary,
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
    rescanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 16,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      gap: 8,
    },
    rescanButtonText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '600',
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
