import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  parseMultipleGenericEmails,
  DetectedSubscription,
} from '../../services/emailParser';
import {
  fetchICloudSubscriptionEmails,
  storeICloudCredentials,
  getStoredICloudCredentials,
  clearICloudCredentials,
  convertToGenericFormat,
  ICloudCredentials,
  ICloudStatus,
} from '../../services/icloudService';
import { getCategoryLabel } from '../../utils/presets';
import { formatPrice } from '../../utils/calculations';
import type { RootStackParamList, BillingCycle } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ScanStatus = 'idle' | 'signing_in' | 'fetching' | 'parsing' | 'done' | 'error';
type EmailProvider = 'gmail' | 'icloud' | null;

export default function ScanEmailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { addSubscription, subscriptions } = useSubscriptionStore();

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [detectedSubscriptions, setDetectedSubscriptions] = useState<DetectedSubscription[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [icloudEmail, setIcloudEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<EmailProvider>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);

  // iCloud credentials modal
  const [showICloudModal, setShowICloudModal] = useState(false);
  const [icloudCredentials, setIcloudCredentials] = useState<ICloudCredentials>({
    email: '',
    appPassword: '',
  });

  useEffect(() => {
    configureGoogleSignIn();
    checkCurrentUser();
    checkICloudCredentials();
  }, []);

  const checkCurrentUser = () => {
    const user = getCurrentUser() as { data?: { user?: { email?: string } } } | null;
    if (user?.data?.user?.email) {
      setUserEmail(user.data.user.email);
    }
  };

  const checkICloudCredentials = () => {
    const creds = getStoredICloudCredentials();
    if (creds) {
      setIcloudEmail(creds.email);
    }
  };

  // Gmail Scan
  const handleGmailScan = async () => {
    setActiveProvider('gmail');
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

  // iCloud Scan
  const handleICloudScan = async () => {
    const storedCreds = getStoredICloudCredentials();
    if (!storedCreds) {
      setShowICloudModal(true);
      return;
    }

    await performICloudScan(storedCreds);
  };

  const performICloudScan = async (credentials: ICloudCredentials) => {
    setActiveProvider('icloud');
    setStatus('fetching');
    setErrorMessage(null);
    setStatusDetail(null);
    setDetectedSubscriptions([]);
    setShowICloudModal(false);

    try {
      setProgress({ current: 0, total: 0 });
      const emails = await fetchICloudSubscriptionEmails(
        credentials,
        (current, total) => setProgress({ current, total }),
        (icloudStatus: ICloudStatus, detail?: string) => {
          console.log('iCloud status:', icloudStatus, detail);
          setStatusDetail(detail || null);
        },
      );

      if (emails.length === 0) {
        setStatus('done');
        Alert.alert('結果', 'サブスク関連のメールが見つかりませんでした');
        return;
      }

      setStatus('parsing');
      const genericEmails = emails.map(convertToGenericFormat);
      const detected = parseMultipleGenericEmails(genericEmails);

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
      console.error('iCloud scan error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'iCloudスキャン中にエラーが発生しました');
    }
  };

  const handleICloudModalSubmit = async () => {
    if (!icloudCredentials.email || !icloudCredentials.appPassword) {
      Alert.alert('エラー', 'メールアドレスとアプリ用パスワードを入力してください');
      return;
    }
    // Save credentials immediately so user doesn't have to re-enter
    storeICloudCredentials(icloudCredentials);
    setIcloudEmail(icloudCredentials.email);
    await performICloudScan(icloudCredentials);
  };

  const handleGmailSignOut = async () => {
    await signOutGoogle();
    setUserEmail(null);
    setDetectedSubscriptions([]);
    setStatus('idle');
    setActiveProvider(null);
  };

  const handleICloudSignOut = () => {
    clearICloudCredentials();
    setIcloudEmail(null);
    setIcloudCredentials({ email: '', appPassword: '' });
    if (activeProvider === 'icloud') {
      setDetectedSubscriptions([]);
      setStatus('idle');
      setActiveProvider(null);
    }
  };

  const openICloudHelp = () => {
    Linking.openURL('https://support.apple.com/ja-jp/102654');
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

  const styles = createStyles(theme);

  const renderStatus = () => {
    switch (status) {
      case 'signing_in':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>Googleにログイン中...</Text>
          </View>
        );
      case 'fetching':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>
              {progress.total > 0
                ? `メールを取得中... (${progress.current}/${progress.total})`
                : statusDetail || 'メールを検索中...'}
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
              onPress={activeProvider === 'gmail' ? handleGmailScan : handleICloudScan}
            >
              <Text style={styles.retryButtonText}>再試行</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  const renderICloudModal = () => (
    <Modal
      visible={showICloudModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowICloudModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Icon name="apple" size={32} color={theme.colors.text} />
            <Text style={styles.modalTitle}>iCloud メール設定</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowICloudModal(false)}
            >
              <Icon name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            iCloudメールにアクセスするには、Apple IDのアプリ用パスワードが必要です。
          </Text>

          <TouchableOpacity style={styles.helpLink} onPress={openICloudHelp}>
            <Icon name="help-circle" size={18} color={theme.colors.primary} />
            <Text style={styles.helpLinkText}>アプリ用パスワードの作成方法</Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>iCloudメールアドレス</Text>
            <TextInput
              style={styles.input}
              placeholder="example@icloud.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={icloudCredentials.email}
              onChangeText={(text) =>
                setIcloudCredentials((prev) => ({ ...prev, email: text }))
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>アプリ用パスワード</Text>
            <TextInput
              style={styles.input}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              placeholderTextColor={theme.colors.textSecondary}
              value={icloudCredentials.appPassword}
              onChangeText={(text) =>
                setIcloudCredentials((prev) => ({ ...prev, appPassword: text }))
              }
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.modalNote}>
            <Icon name="shield-check" size={16} color={theme.colors.success} />
            <Text style={styles.modalNoteText}>
              パスワードは端末内にのみ保存され、外部に送信されません
            </Text>
          </View>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={handleICloudModalSubmit}
          >
            <Text style={styles.modalButtonText}>接続してスキャン</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Gmail User Info */}
        {userEmail && (
          <View style={styles.userCard}>
            <Icon name="google" size={24} color="#4285F4" />
            <Text style={styles.userEmail}>{userEmail}</Text>
            <TouchableOpacity onPress={handleGmailSignOut}>
              <Icon name="logout" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* iCloud User Info */}
        {icloudEmail && (
          <View style={styles.userCard}>
            <Icon name="apple" size={24} color={theme.colors.text} />
            <Text style={styles.userEmail}>{icloudEmail}</Text>
            <TouchableOpacity onPress={handleICloudSignOut}>
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

        {/* Status */}
        {renderStatus()}

        {/* Scan Buttons */}
        {(status === 'idle' || status === 'done') && (
          <View style={styles.scanButtonsContainer}>
            {/* Gmail Button */}
            <TouchableOpacity
              style={[styles.scanButton, styles.gmailButton]}
              onPress={handleGmailScan}
            >
              <Icon name="google" size={24} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>
                {userEmail ? 'Gmailをスキャン' : 'Gmailでスキャン'}
              </Text>
            </TouchableOpacity>

            {/* iCloud Button */}
            <TouchableOpacity
              style={[styles.scanButton, styles.icloudButton]}
              onPress={handleICloudScan}
            >
              <Icon name="apple" size={24} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>
                {icloudEmail ? 'iCloudをスキャン' : 'iCloudでスキャン'}
              </Text>
            </TouchableOpacity>
          </View>
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

      {/* iCloud Credentials Modal */}
      {renderICloudModal()}
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
    statusContainer: {
      alignItems: 'center',
      padding: 32,
    },
    statusText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
    },
    statusDetailText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      opacity: 0.7,
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
    scanButtonsContainer: {
      paddingHorizontal: 16,
      gap: 12,
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    gmailButton: {
      backgroundColor: '#4285F4',
    },
    icloudButton: {
      backgroundColor: '#333333',
    },
    scanButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    resultsSection: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
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
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 12,
      flex: 1,
    },
    modalClose: {
      padding: 4,
    },
    modalDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    helpLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 6,
    },
    helpLinkText: {
      fontSize: 14,
      color: theme.colors.primary,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalNote: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
      gap: 8,
    },
    modalNoteText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    modalButton: {
      backgroundColor: '#333333',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
