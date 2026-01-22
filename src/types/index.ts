export type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'quarterly';

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
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
}

export type RootStackParamList = {
  Main: undefined;
  SubscriptionDetail: { subscriptionId: string };
  AddSubscription: { presetService?: PopularService } | undefined;
  EditSubscription: { subscriptionId: string };
  ScanEmail: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Subscriptions: undefined;
  Settings: undefined;
};
