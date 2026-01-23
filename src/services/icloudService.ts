import type { DetectedSubscription } from './emailParser';

// APIのベースURL（環境に応じて変更）
// ローカル開発: http://localhost:3000
// 本番: https://your-app.vercel.app
const API_BASE_URL = __DEV__
  ? 'http://192.168.40.70:3000'
  : 'https://your-subscription-app.vercel.app'; // TODO: デプロイ後に実際のURLに変更

export interface ICloudCredentials {
  email: string;
  appPassword: string;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface FetchSubscriptionsResult {
  success: boolean;
  subscriptions: DetectedSubscription[];
  totalFound: number;
  error?: string;
}

export const testICloudConnection = async (
  credentials: ICloudCredentials,
): Promise<TestConnectionResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/icloud/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to server',
    };
  }
};

export const fetchICloudSubscriptions = async (
  credentials: ICloudCredentials,
  maxResults: number = 50,
): Promise<FetchSubscriptionsResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/icloud/fetch-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...credentials,
        maxResults,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      subscriptions: [],
      totalFound: 0,
      error: error.message || 'Failed to fetch subscriptions',
    };
  }
};
