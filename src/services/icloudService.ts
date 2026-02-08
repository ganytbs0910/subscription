import type { DetectedSubscription } from './emailParser';

// APIのベースURL
// Vercelにデプロイ済みのサーバーを使用
const API_BASE_URL = 'https://subscription-hazel.vercel.app';

export interface ICloudCredentials {
  email: string;
  appPassword: string;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AIExtractionDebug {
  service: string;
  contentLength: number;
  contentPreview: string;
  aiResult: { price: number; currency: string; billingCycle: string } | null;
}

export interface FetchSubscriptionsResult {
  success: boolean;
  subscriptions: DetectedSubscription[];
  totalFound: number;
  error?: string;
  debug?: {
    servicesNeedingAI: string[];
    aiExtractionResults: AIExtractionDebug[];
  };
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

    const data = await response.json() as TestConnectionResult;
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

    const data = await response.json() as FetchSubscriptionsResult;
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
