import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, APP_VERSION } from '../config';

export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log('Sentry DSN is not configured. Crash reporting is disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    // パフォーマンスモニタリングのサンプルレート (0.0 - 1.0)
    tracesSampleRate: 0.2,
    // 本番環境のみでエラーを送信
    enabled: !__DEV__,
    // デバッグモード（開発中のみ有効）
    debug: __DEV__,
    // 環境名
    environment: __DEV__ ? 'development' : 'production',
    // アプリバージョン
    release: `subscription@${APP_VERSION}`,
  });
}

// 手動でエラーを送信
export function captureError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN) return;

  Sentry.captureException(error, {
    extra: context,
  });
}

// ユーザー情報を設定
export function setUser(userId: string) {
  if (!SENTRY_DSN) return;

  Sentry.setUser({ id: userId });
}

// ユーザー情報をクリア
export function clearUser() {
  if (!SENTRY_DSN) return;

  Sentry.setUser(null);
}

// カスタムイベントを記録
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!SENTRY_DSN) return;

  Sentry.captureMessage(message, level);
}

// タグを設定
export function setTag(key: string, value: string) {
  if (!SENTRY_DSN) return;

  Sentry.setTag(key, value);
}
