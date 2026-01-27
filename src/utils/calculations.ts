import { format, parseISO, differenceInDays, addMonths, addYears, addWeeks, differenceInWeeks, differenceInMonths, differenceInYears, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Subscription, BillingCycle } from '../types';
import { getCurrencySymbol } from './presets';

export const getMonthlyAmount = (price: number, cycle: BillingCycle): number => {
  switch (cycle) {
    case 'weekly':
      return price * 4.33;
    case 'monthly':
      return price;
    case 'quarterly':
      return price / 3;
    case 'yearly':
      return price / 12;
    default:
      return price;
  }
};

export const getYearlyAmount = (price: number, cycle: BillingCycle): number => {
  switch (cycle) {
    case 'weekly':
      return price * 52;
    case 'monthly':
      return price * 12;
    case 'quarterly':
      return price * 4;
    case 'yearly':
      return price;
    default:
      return price * 12;
  }
};

export const calculateTotalMonthly = (subscriptions: Subscription[]): number => {
  return subscriptions
    .filter((sub) => sub.isActive)
    .reduce((total, sub) => total + getMonthlyAmount(sub.price, sub.billingCycle), 0);
};

export const calculateTotalYearly = (subscriptions: Subscription[]): number => {
  return subscriptions
    .filter((sub) => sub.isActive)
    .reduce((total, sub) => total + getYearlyAmount(sub.price, sub.billingCycle), 0);
};

export const formatPrice = (price: number, currency: string | null | undefined): string => {
  const curr = currency || 'JPY';
  const symbol = getCurrencySymbol(curr);
  if (curr === 'JPY') {
    return `${symbol}${Math.round(price).toLocaleString()}`;
  }
  return `${symbol}${price.toFixed(2)}`;
};

export const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'yyyy年M月d日', { locale: ja });
  } catch {
    return dateString;
  }
};

export const formatShortDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'M/d', { locale: ja });
  } catch {
    return dateString;
  }
};

export const getDaysUntilNextBilling = (nextBillingDate: string): number => {
  try {
    return differenceInDays(parseISO(nextBillingDate), new Date());
  } catch {
    return 0;
  }
};

export const getNextBillingDateFromCycle = (
  currentDate: Date,
  cycle: BillingCycle
): Date => {
  switch (cycle) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'quarterly':
      return addMonths(currentDate, 3);
    case 'yearly':
      return addYears(currentDate, 1);
    default:
      return addMonths(currentDate, 1);
  }
};

export const getUpcomingSubscriptions = (
  subscriptions: Subscription[],
  daysAhead: number = 7
): Subscription[] => {
  const today = new Date();
  return subscriptions
    .filter((sub) => {
      if (!sub.isActive) return false;
      const days = getDaysUntilNextBilling(sub.nextBillingDate);
      return days >= 0 && days <= daysAhead;
    })
    .sort((a, b) => {
      return getDaysUntilNextBilling(a.nextBillingDate) - getDaysUntilNextBilling(b.nextBillingDate);
    });
};

export const calculatePaymentCount = (startDate: string, cycle: BillingCycle): number => {
  const start = parseISO(startDate);
  const today = new Date();

  if (start > today) return 0;

  switch (cycle) {
    case 'weekly':
      return Math.floor(differenceInWeeks(today, start));
    case 'monthly':
      return Math.floor(differenceInMonths(today, start));
    case 'quarterly':
      return Math.floor(differenceInMonths(today, start) / 3);
    case 'yearly':
      return Math.floor(differenceInYears(today, start));
    default:
      return Math.floor(differenceInMonths(today, start));
  }
};

export const calculateTotalPaidSinceStart = (subscriptions: Subscription[]): number => {
  return subscriptions
    .filter((sub) => sub.isActive)
    .reduce((total, sub) => {
      // メールから取得した実際の支払い履歴がある場合はそれを使用
      if (sub.totalPaidFromEmail !== undefined && sub.totalPaidFromEmail > 0) {
        return total + sub.totalPaidFromEmail;
      }
      // なければ支払い履歴から計算
      if (sub.paymentHistory && sub.paymentHistory.length > 0) {
        const historyTotal = sub.paymentHistory.reduce((sum, h) => sum + h.price, 0);
        return total + historyTotal;
      }
      // どちらもなければ従来の推定計算
      const paymentCount = calculatePaymentCount(sub.startDate, sub.billingCycle);
      return total + (sub.price * paymentCount);
    }, 0);
};

export const calculateNextMonthPayments = (subscriptions: Subscription[]): {
  total: number;
  subscriptions: Subscription[];
} => {
  const today = new Date();
  const nextMonth = addMonths(today, 1);
  const nextMonthStart = startOfMonth(nextMonth);
  const nextMonthEnd = endOfMonth(nextMonth);

  const nextMonthSubs = subscriptions.filter((sub) => {
    if (!sub.isActive) return false;
    const billingDate = parseISO(sub.nextBillingDate);
    return isWithinInterval(billingDate, { start: nextMonthStart, end: nextMonthEnd });
  });

  const total = nextMonthSubs.reduce((sum, sub) => sum + sub.price, 0);

  return { total, subscriptions: nextMonthSubs };
};

export interface MonthlyPaymentSummary {
  year: number;
  month: number;
  label: string;
  total: number;
  payments: Array<{
    name: string;
    price: number;
    currency: string;
    date: string;
  }>;
}

// 月別支払い履歴を集計（過去N ヶ月分）
export const calculateMonthlyPaymentHistory = (
  subscriptions: Subscription[],
  monthsBack: number = 6
): MonthlyPaymentSummary[] => {
  const summaries: Map<string, MonthlyPaymentSummary> = new Map();

  // 過去N ヶ月分の空の集計を作成
  const today = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const targetDate = addMonths(today, -i);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const key = `${year}-${month.toString().padStart(2, '0')}`;
    summaries.set(key, {
      year,
      month,
      label: format(targetDate, 'yyyy年M月', { locale: ja }),
      total: 0,
      payments: [],
    });
  }

  // 各サブスクの支払い履歴を集計
  for (const sub of subscriptions) {
    if (!sub.paymentHistory) continue;

    for (const payment of sub.paymentHistory) {
      const paymentDate = parseISO(payment.date);
      const year = paymentDate.getFullYear();
      const month = paymentDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;

      const summary = summaries.get(key);
      if (summary) {
        summary.total += payment.price;
        summary.payments.push({
          name: sub.name,
          price: payment.price,
          currency: payment.currency,
          date: payment.date,
        });
      }
    }
  }

  // 日付順にソート（新しい順）
  return Array.from(summaries.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

// サブスクリプションの契約年数を取得
export const getSubscriptionAge = (startDate: string): { years: number; months: number } => {
  const start = parseISO(startDate);
  const now = new Date();
  const totalMonths = differenceInMonths(now, start);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
};

// 直近2回の支払いから価格変動を検出
export const detectPriceChange = (sub: Subscription): { changed: boolean; oldPrice: number; newPrice: number } | null => {
  if (!sub.paymentHistory || sub.paymentHistory.length < 2) return null;
  const sorted = [...sub.paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const newPrice = sorted[0].price;
  const oldPrice = sorted[1].price;
  return { changed: newPrice !== oldPrice, oldPrice, newPrice };
};

// 節約提案を取得（年間コストが高い順）
export const getSavingSuggestions = (subs: Subscription[]): Array<{ name: string; yearlyAmount: number }> => {
  return subs
    .filter((s) => s.isActive)
    .map((s) => ({
      name: s.name,
      yearlyAmount: getYearlyAmount(s.price, s.billingCycle),
    }))
    .sort((a, b) => b.yearlyAmount - a.yearlyAmount);
};

// 解約済みサブスクの月額合計（節約額）
export const calculateSavedAmount = (subs: Subscription[]): number => {
  return subs
    .filter((s) => !s.isActive)
    .reduce((total, s) => total + getMonthlyAmount(s.price, s.billingCycle), 0);
};

// 今月と先月の比較
export const compareWithLastMonth = (
  subscriptions: Subscription[]
): { thisMonth: number; lastMonth: number; difference: number; percentChange: number } => {
  const history = calculateMonthlyPaymentHistory(subscriptions, 2);
  const thisMonth = history[0]?.total || 0;
  const lastMonth = history[1]?.total || 0;
  const difference = thisMonth - lastMonth;
  const percentChange = lastMonth > 0 ? ((difference / lastMonth) * 100) : 0;

  return { thisMonth, lastMonth, difference, percentChange };
};
