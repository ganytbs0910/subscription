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

    // 結果のサマリーをコンソールに出力（開発環境のみ）
    if (__DEV__) {
      console.log('\n========================================');
      console.log('       Subscription Scan Results');
      console.log('========================================');
      data.subscriptions?.forEach((sub: any) => {
        const priceStr = sub.price !== null ? `${sub.price} ${sub.currency}` : '金額不明';
        const source = sub.extractedByAI ? '🤖 AI' : (sub.priceDetected ? '📝 Pattern' : '❌ N/A');
        console.log(`${sub.name.padEnd(20)} ${priceStr.padEnd(15)} [${source}]`);
      });
      console.log('========================================');

      // AI抽出の詳細デバッグ情報
      if (data.debug) {
        console.log('\n--- AI Extraction Debug ---');
        console.log('Services needing AI:', data.debug.servicesNeedingAI?.join(', ') || 'none');
        data.debug.aiExtractionResults?.forEach((result: AIExtractionDebug) => {
          console.log(`\n[${result.service}]`);
          console.log(`  Content length: ${result.contentLength} chars`);
          if (result.aiResult) {
            console.log(`  ✓ AI Result: ${result.aiResult.price} ${result.aiResult.currency}`);
          } else {
            console.log(`  ✗ AI could not extract price`);
            console.log(`  Preview: ${result.contentPreview?.substring(0, 100)}...`);
          }
        });
        console.log('---------------------------\n');
      }
    }

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
