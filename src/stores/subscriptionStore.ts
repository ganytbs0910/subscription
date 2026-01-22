import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { v4 as uuidv4 } from 'uuid';
import type { Subscription, AppSettings } from '../types';

const storage = new MMKV();

const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

interface SubscriptionState {
  subscriptions: Subscription[];
  settings: AppSettings;
  addSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  getSubscriptionById: (id: string) => Subscription | undefined;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      settings: {
        theme: 'system',
        currency: 'JPY',
        language: 'ja',
      },

      addSubscription: (subscriptionData) => {
        const now = new Date().toISOString();
        const newSubscription: Subscription = {
          ...subscriptionData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          subscriptions: [...state.subscriptions, newSubscription],
        }));
      },

      updateSubscription: (id, updates) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.id === id
              ? { ...sub, ...updates, updatedAt: new Date().toISOString() }
              : sub
          ),
        }));
      },

      deleteSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.filter((sub) => sub.id !== id),
        }));
      },

      getSubscriptionById: (id) => {
        return get().subscriptions.find((sub) => sub.id === id);
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
