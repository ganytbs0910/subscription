import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { useTheme } from '../../hooks/useTheme';

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.lastUpdated}>最終更新日: 2025年1月31日</Text>

        <Text style={styles.sectionTitle}>1. はじめに</Text>
        <Text style={styles.paragraph}>
          AI Subscan（以下「本アプリ」）は、お客様のプライバシーを尊重し、個人情報の保護に努めています。
          本プライバシーポリシーは、本アプリがどのような情報を収集し、どのように使用するかを説明するものです。
        </Text>

        <Text style={styles.sectionTitle}>2. 収集する情報</Text>
        <Text style={styles.paragraph}>
          本アプリは以下の情報を収集・保存します：
        </Text>
        <Text style={styles.listItem}>• サブスクリプション情報（サービス名、金額、請求サイクルなど）</Text>
        <Text style={styles.listItem}>• メールスキャン時に入力されるiCloudメールアドレスとアプリパスワード</Text>
        <Text style={styles.listItem}>• アプリの設定情報（テーマ、通知設定など）</Text>

        <Text style={styles.sectionTitle}>3. 情報の使用目的</Text>
        <Text style={styles.paragraph}>
          収集した情報は以下の目的で使用されます：
        </Text>
        <Text style={styles.listItem}>• サブスクリプションの管理と表示</Text>
        <Text style={styles.listItem}>• 支払いリマインダー通知の送信</Text>
        <Text style={styles.listItem}>• アプリ機能の提供と改善</Text>

        <Text style={styles.sectionTitle}>4. データの保存</Text>
        <Text style={styles.paragraph}>
          すべてのデータはお客様のデバイス上にローカルで保存されます。
          本アプリは外部サーバーにデータを送信しません。
          iCloudの認証情報は暗号化されて保存されます。
        </Text>

        <Text style={styles.sectionTitle}>5. メールスキャン機能</Text>
        <Text style={styles.paragraph}>
          メールスキャン機能を使用する場合、本アプリはAppleからの領収書メールのみを読み取ります。
          メールの内容は外部に送信されることはなく、サブスクリプション情報の抽出にのみ使用されます。
        </Text>

        <Text style={styles.sectionTitle}>6. 第三者への提供</Text>
        <Text style={styles.paragraph}>
          本アプリはお客様の個人情報を第三者に販売、貸与、または共有することはありません。
        </Text>

        <Text style={styles.sectionTitle}>7. データの削除</Text>
        <Text style={styles.paragraph}>
          設定画面からいつでもすべてのデータを削除することができます。
          アプリをアンインストールすると、すべてのローカルデータが削除されます。
        </Text>

        <Text style={styles.sectionTitle}>8. お問い合わせ</Text>
        <Text style={styles.paragraph}>
          プライバシーに関するご質問やご懸念がある場合は、アプリ開発者までお問い合わせください。
        </Text>

        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 20,
    },
    lastUpdated: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 24,
      marginBottom: 10,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.text,
      marginBottom: 8,
    },
    listItem: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.text,
      marginLeft: 8,
      marginBottom: 4,
    },
    bottomSpacer: {
      height: 40,
    },
  });
