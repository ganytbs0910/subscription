import type { PopularService, Category, BillingCycle } from '../types';

export const POPULAR_SERVICES: PopularService[] = [
  // 自動検出できないサービス（直接課金）
  {
    name: 'Netflix',
    icon: 'movie',
    color: '#E50914',
    category: 'streaming',
    defaultPrice: 1490,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'Amazon Prime',
    icon: 'shopping',
    color: '#FF9900',
    category: 'streaming',
    defaultPrice: 600,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'Disney+',
    icon: 'movie-open',
    color: '#113CCF',
    category: 'streaming',
    defaultPrice: 990,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'Spotify',
    icon: 'music',
    color: '#1DB954',
    category: 'music',
    defaultPrice: 980,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'YouTube Premium',
    icon: 'youtube',
    color: '#FF0000',
    category: 'streaming',
    defaultPrice: 1280,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'Google One',
    icon: 'google-drive',
    color: '#4285F4',
    category: 'cloud',
    defaultPrice: 250,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'Microsoft 365',
    icon: 'microsoft',
    color: '#0078D4',
    category: 'productivity',
    defaultPrice: 12984,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'yearly',
    requiresManualEntry: true,
  },
  {
    name: 'Adobe Creative Cloud',
    icon: 'adobe',
    color: '#FF0000',
    category: 'productivity',
    defaultPrice: 6480,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'ChatGPT Plus',
    icon: 'robot',
    color: '#10A37F',
    category: 'productivity',
    defaultPrice: 3000,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'Claude Pro',
    icon: 'brain',
    color: '#D97757',
    category: 'productivity',
    defaultPrice: 3000,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  {
    name: 'Nintendo Switch Online',
    icon: 'gamepad-variant',
    color: '#E60012',
    category: 'gaming',
    defaultPrice: 2400,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'yearly',
    requiresManualEntry: true,
  },
  {
    name: 'PlayStation Plus',
    icon: 'sony-playstation',
    color: '#003087',
    category: 'gaming',
    defaultPrice: 6800,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'yearly',
    requiresManualEntry: true,
  },
  {
    name: 'Xbox Game Pass',
    icon: 'microsoft-xbox',
    color: '#107C10',
    category: 'gaming',
    defaultPrice: 1100,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: true,
  },
  // 自動検出可能なサービス（App Store経由）
  {
    name: 'Apple Music',
    icon: 'music-note',
    color: '#FC3C44',
    category: 'music',
    defaultPrice: 1080,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: false,
  },
  {
    name: 'iCloud+',
    icon: 'cloud',
    color: '#3693F3',
    category: 'cloud',
    defaultPrice: 130,
    defaultCurrency: 'JPY',
    defaultBillingCycle: 'monthly',
    requiresManualEntry: false,
  },
];

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'streaming', label: '動画配信', icon: 'movie' },
  { value: 'music', label: '音楽', icon: 'music' },
  { value: 'productivity', label: '仕事効率化', icon: 'briefcase' },
  { value: 'cloud', label: 'クラウド', icon: 'cloud' },
  { value: 'gaming', label: 'ゲーム', icon: 'gamepad-variant' },
  { value: 'news', label: 'ニュース', icon: 'newspaper' },
  { value: 'fitness', label: 'フィットネス', icon: 'dumbbell' },
  { value: 'education', label: '教育', icon: 'school' },
  { value: 'other', label: 'その他', icon: 'dots-horizontal' },
];

export const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'weekly', label: '週額' },
  { value: 'monthly', label: '月額' },
  { value: 'quarterly', label: '四半期' },
  { value: 'yearly', label: '年額' },
];

export const CURRENCIES = [
  { value: 'JPY', label: '円 (¥)', symbol: '¥' },
  { value: 'USD', label: 'ドル ($)', symbol: '$' },
  { value: 'EUR', label: 'ユーロ (€)', symbol: '€' },
];

export const getCurrencySymbol = (currency: string): string => {
  const found = CURRENCIES.find((c) => c.value === currency);
  return found?.symbol ?? currency;
};

export const getCategoryLabel = (category: Category): string => {
  const found = CATEGORIES.find((c) => c.value === category);
  return found?.label ?? category;
};

export const getBillingCycleLabel = (cycle: BillingCycle): string => {
  const found = BILLING_CYCLES.find((c) => c.value === cycle);
  return found?.label ?? cycle;
};
