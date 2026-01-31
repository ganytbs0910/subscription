import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
} from '@notifee/react-native';
import { Subscription } from '../types';

// 通知チャンネルID
const CHANNEL_ID = 'payment-reminders';

// 通知の初期設定
export async function setupNotifications(): Promise<boolean> {
  // Android用チャンネル作成
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: '支払いリマインダー',
    importance: AndroidImportance.HIGH,
  });

  // 通知権限をリクエスト
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

// 通知権限の確認
export async function checkNotificationPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

// サブスクリプションの支払いリマインダーをスケジュール
export async function schedulePaymentReminder(
  subscription: Subscription,
  daysBefore: number = 1
): Promise<string | null> {
  try {
    const nextBillingDate = new Date(subscription.nextBillingDate);
    const reminderDate = new Date(nextBillingDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(10, 0, 0, 0); // 午前10時に通知

    // 過去の日付はスキップ
    if (reminderDate.getTime() <= Date.now()) {
      return null;
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: reminderDate.getTime(),
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        id: `payment-${subscription.id}`,
        title: '支払いリマインダー',
        body: `${subscription.name}の支払いが${daysBefore === 0 ? '今日' : daysBefore === 1 ? '明日' : `${daysBefore}日後に`}予定されています（¥${subscription.price.toLocaleString()}）`,
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
        data: {
          subscriptionId: subscription.id,
          type: 'payment-reminder',
        },
      },
      trigger
    );

    return notificationId;
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to schedule notification:', error);
    }
    return null;
  }
}

// 特定のサブスクリプションの通知をキャンセル
export async function cancelPaymentReminder(subscriptionId: string): Promise<void> {
  try {
    await notifee.cancelNotification(`payment-${subscriptionId}`);
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to cancel notification:', error);
    }
  }
}

// すべての通知をキャンセル
export async function cancelAllReminders(): Promise<void> {
  try {
    await notifee.cancelAllNotifications();
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to cancel all notifications:', error);
    }
  }
}

// すべてのアクティブなサブスクリプションの通知をスケジュール
export async function scheduleAllPaymentReminders(
  subscriptions: Subscription[],
  daysBefore: number = 1
): Promise<void> {
  // 既存の通知をすべてキャンセル
  await cancelAllReminders();

  // アクティブなサブスクリプションのみ（課金は除外）
  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.isActive && sub.type !== 'payment'
  );

  for (const sub of activeSubscriptions) {
    await schedulePaymentReminder(sub, daysBefore);
  }
}

// 保留中の通知を取得
export async function getPendingNotifications(): Promise<number> {
  const notifications = await notifee.getTriggerNotifications();
  return notifications.length;
}
