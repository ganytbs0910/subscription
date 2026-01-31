import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { useTheme } from '../../hooks/useTheme';

export default function TermsOfServiceScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.lastUpdated}>最終更新日: 2025年1月31日</Text>

        <Text style={styles.sectionTitle}>1. サービスの概要</Text>
        <Text style={styles.paragraph}>
          AI Subscan（以下「本アプリ」）は、サブスクリプションサービスの管理を支援するアプリケーションです。
          本アプリを使用することで、以下の利用規約に同意したものとみなされます。
        </Text>

        <Text style={styles.sectionTitle}>2. 利用条件</Text>
        <Text style={styles.paragraph}>
          本アプリは個人利用を目的としています。
          商業目的での利用、リバースエンジニアリング、または不正な方法での使用は禁止されています。
        </Text>

        <Text style={styles.sectionTitle}>3. アカウントとセキュリティ</Text>
        <Text style={styles.paragraph}>
          メールスキャン機能を使用する場合、お客様はご自身のiCloudアカウントの認証情報を入力する必要があります。
          認証情報の管理はお客様の責任において行ってください。
          Appleのアプリ固有パスワードを使用することを推奨します。
        </Text>

        <Text style={styles.sectionTitle}>4. 免責事項</Text>
        <Text style={styles.paragraph}>
          本アプリは「現状有姿」で提供されます。
          以下について、開発者は一切の責任を負いません：
        </Text>
        <Text style={styles.listItem}>• サブスクリプション情報の正確性</Text>
        <Text style={styles.listItem}>• 通知の遅延または不達</Text>
        <Text style={styles.listItem}>• データの損失</Text>
        <Text style={styles.listItem}>• アプリの使用により生じた損害</Text>

        <Text style={styles.sectionTitle}>5. サービスの変更・終了</Text>
        <Text style={styles.paragraph}>
          開発者は、事前の通知なく本アプリの機能を変更、または提供を終了する権利を有します。
        </Text>

        <Text style={styles.sectionTitle}>6. 知的財産権</Text>
        <Text style={styles.paragraph}>
          本アプリのデザイン、コード、およびコンテンツに関するすべての知的財産権は開発者に帰属します。
        </Text>

        <Text style={styles.sectionTitle}>7. 利用規約の変更</Text>
        <Text style={styles.paragraph}>
          開発者は、必要に応じて本利用規約を変更する権利を有します。
          変更後も本アプリを継続して使用することで、変更後の規約に同意したものとみなされます。
        </Text>

        <Text style={styles.sectionTitle}>8. 準拠法</Text>
        <Text style={styles.paragraph}>
          本利用規約は日本法に準拠し、解釈されるものとします。
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
