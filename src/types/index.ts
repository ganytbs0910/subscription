export type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'quarterly';

export type SubscriptionType = 'subscription' | 'payment';

export type Category =
  | 'streaming'
  | 'music'
  | 'productivity'
  | 'cloud'
  | 'gaming'
  | 'news'
  | 'fitness'
  | 'education'
  | 'other';

export interface PaymentRecord {
  date: string;
  price: number;
  currency: string;
  subject?: string;
  itemName?: string;  // 購入アイテム名（例: エメラルド950個）
}

// 個別の購入記録
export interface SubItemPurchase {
  date: string;
  price: number;
}

// アイテム別内訳
export interface SubItem {
  name: string;
  currency: string;
  purchases: SubItemPurchase[];
  totalPaid: number;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  category: Category;
  nextBillingDate: string;
  startDate: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // サブスク or 単発課金
  type?: SubscriptionType;
  // メールから取得した支払い履歴
  paymentHistory?: PaymentRecord[];
  // メールから検出された実際の累計支払い額
  totalPaidFromEmail?: number;
  // アイテム別内訳
  subItems?: SubItem[];
}

export interface SubscriptionFormData {
  name: string;
  price: string;
  currency: string;
  billingCycle: BillingCycle;
  category: Category;
  nextBillingDate: Date;
  description?: string;
}

export interface PopularService {
  name: string;
  icon: string;
  color: string;
  category: Category;
  defaultPrice?: number;
  defaultCurrency?: string;
  defaultBillingCycle?: BillingCycle;
  requiresManualEntry?: boolean; // メールで自動検出できないサービス
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
  monthlyBudget?: number;
  notificationsEnabled?: boolean;
  notificationDaysBefore?: number; // 何日前に通知するか
  hasSeenOnboarding?: boolean;
}

export type RootStackParamList = {
  Main: undefined;
  Onboarding: undefined;
  SubscriptionDetail: { subscriptionId: string };
  AddSubscription: { presetService?: PopularService } | undefined;
  EditSubscription: { subscriptionId: string };
  ScanEmail: undefined;
  PaymentHistory: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Subscriptions: undefined;
  Insights: undefined;
  PaymentHistory: undefined;
  Settings: undefined;
};
