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

export const formatPrice = (price: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  if (currency === 'JPY') {
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
