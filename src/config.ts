/**
 * アプリケーション設定
 *
 * リリース前に以下の設定を行ってください：
 *
 * 1. Sentry DSN の設定
 *    - https://sentry.io でアカウントを作成
 *    - 新しいReact Nativeプロジェクトを作成
 *    - DSNをコピーして SENTRY_DSN に設定
 *
 * 2. 本番環境でのビルド時は __DEV__ が false になり、
 *    デバッグログが出力されなくなります
 */

// Sentry DSN
// https://sentry.io でプロジェクトを作成し、DSNを設定してください
// 例: 'https://xxxxx@o12345.ingest.sentry.io/67890'
export const SENTRY_DSN = '';

// アプリのバージョン情報
export const APP_VERSION = '1.0.0';

// API設定
export const API_CONFIG = {
  // iCloud/メールスキャン用サーバー
  BASE_URL: 'https://subscription-hazel.vercel.app',
  // リクエストタイムアウト（ミリ秒）
  TIMEOUT: 30000,
};

// 通知設定のデフォルト値
export const NOTIFICATION_DEFAULTS = {
  // 支払い日の何日前に通知するか
  DAYS_BEFORE: 1,
  // 通知を送る時間（24時間表記）
  NOTIFY_HOUR: 10,
};
