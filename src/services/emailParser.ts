import type { Category, BillingCycle } from '../types';
import type { GmailMessageDetail } from './gmailService';

export interface DetectedSubscription {
  name: string;
  category: Category;
  price: number | null;
  currency: string;
  billingCycle: BillingCycle | null;
  email: string;
  detectedDate: string;
  confidence: number;
}

interface ServicePattern {
  pattern: RegExp;
  name: string;
  category: Category;
  icon?: string;
  color?: string;
  defaultCurrency?: string;
}

const SERVICE_PATTERNS: ServicePattern[] = [
  // Streaming
  { pattern: /netflix/i, name: 'Netflix', category: 'streaming', color: '#E50914' },
  { pattern: /disney\+|disneyplus/i, name: 'Disney+', category: 'streaming', color: '#113CCF' },
  { pattern: /hulu/i, name: 'Hulu', category: 'streaming', color: '#1CE783' },
  { pattern: /amazon\s*prime\s*video|prime\s*video/i, name: 'Amazon Prime Video', category: 'streaming', color: '#00A8E1' },
  { pattern: /u-next|unext/i, name: 'U-NEXT', category: 'streaming', color: '#000000' },
  { pattern: /abema/i, name: 'ABEMA', category: 'streaming', color: '#00C853' },
  { pattern: /dazn/i, name: 'DAZN', category: 'streaming', color: '#F8F8F5' },
  { pattern: /crunchyroll/i, name: 'Crunchyroll', category: 'streaming', color: '#F47521' },
  { pattern: /hbo\s*max/i, name: 'HBO Max', category: 'streaming', color: '#5822B4' },
  { pattern: /paramount\+|paramountplus/i, name: 'Paramount+', category: 'streaming', color: '#0064FF' },

  // Music
  { pattern: /spotify/i, name: 'Spotify', category: 'music', color: '#1DB954' },
  { pattern: /apple\s*music/i, name: 'Apple Music', category: 'music', color: '#FA243C' },
  { pattern: /youtube\s*music/i, name: 'YouTube Music', category: 'music', color: '#FF0000' },
  { pattern: /amazon\s*music/i, name: 'Amazon Music', category: 'music', color: '#00A8E1' },
  { pattern: /line\s*music/i, name: 'LINE MUSIC', category: 'music', color: '#00B900' },
  { pattern: /awa\s/i, name: 'AWA', category: 'music', color: '#00BFFF' },
  { pattern: /tidal/i, name: 'TIDAL', category: 'music', color: '#000000' },
  { pattern: /deezer/i, name: 'Deezer', category: 'music', color: '#FEAA2D' },

  // Productivity
  { pattern: /notion/i, name: 'Notion', category: 'productivity', color: '#000000' },
  { pattern: /slack/i, name: 'Slack', category: 'productivity', color: '#4A154B' },
  { pattern: /zoom/i, name: 'Zoom', category: 'productivity', color: '#2D8CFF' },
  { pattern: /microsoft\s*365|office\s*365/i, name: 'Microsoft 365', category: 'productivity', color: '#D83B01' },
  { pattern: /evernote/i, name: 'Evernote', category: 'productivity', color: '#00A82D' },
  { pattern: /todoist/i, name: 'Todoist', category: 'productivity', color: '#E44332' },
  { pattern: /1password|one\s*password/i, name: '1Password', category: 'productivity', color: '#0094F5' },
  { pattern: /lastpass/i, name: 'LastPass', category: 'productivity', color: '#D32D27' },
  { pattern: /grammarly/i, name: 'Grammarly', category: 'productivity', color: '#15C39A' },
  { pattern: /canva/i, name: 'Canva', category: 'productivity', color: '#00C4CC' },

  // Cloud
  { pattern: /dropbox/i, name: 'Dropbox', category: 'cloud', color: '#0061FF' },
  { pattern: /google\s*(one|drive|storage)/i, name: 'Google One', category: 'cloud', color: '#4285F4' },
  { pattern: /icloud/i, name: 'iCloud+', category: 'cloud', color: '#3693F3' },
  { pattern: /onedrive/i, name: 'OneDrive', category: 'cloud', color: '#0078D4' },
  { pattern: /box\.com|box\s*storage/i, name: 'Box', category: 'cloud', color: '#0061D5' },

  // Gaming
  { pattern: /playstation\s*(plus|now)|ps\s*plus/i, name: 'PlayStation Plus', category: 'gaming', color: '#003087' },
  { pattern: /xbox\s*game\s*pass/i, name: 'Xbox Game Pass', category: 'gaming', color: '#107C10' },
  { pattern: /nintendo\s*(switch\s*)?online/i, name: 'Nintendo Switch Online', category: 'gaming', color: '#E60012' },
  { pattern: /ea\s*play/i, name: 'EA Play', category: 'gaming', color: '#FF4747' },
  { pattern: /apple\s*arcade/i, name: 'Apple Arcade', category: 'gaming', color: '#000000' },
  { pattern: /geforce\s*now/i, name: 'GeForce NOW', category: 'gaming', color: '#76B900' },

  // News / Media
  { pattern: /nikkei|日経/i, name: '日経電子版', category: 'news', color: '#000000' },
  { pattern: /new\s*york\s*times|nytimes/i, name: 'New York Times', category: 'news', color: '#000000' },
  { pattern: /washington\s*post/i, name: 'Washington Post', category: 'news', color: '#000000' },
  { pattern: /wall\s*street\s*journal|wsj/i, name: 'Wall Street Journal', category: 'news', color: '#000000' },
  { pattern: /medium/i, name: 'Medium', category: 'news', color: '#000000' },

  // Fitness
  { pattern: /apple\s*fitness\+?/i, name: 'Apple Fitness+', category: 'fitness', color: '#FA2D55' },
  { pattern: /strava/i, name: 'Strava', category: 'fitness', color: '#FC4C02' },
  { pattern: /peloton/i, name: 'Peloton', category: 'fitness', color: '#000000' },
  { pattern: /nike\s*(training|run)/i, name: 'Nike Training', category: 'fitness', color: '#000000' },

  // Education
  { pattern: /coursera/i, name: 'Coursera', category: 'education', color: '#0056D2' },
  { pattern: /udemy/i, name: 'Udemy', category: 'education', color: '#A435F0' },
  { pattern: /skillshare/i, name: 'Skillshare', category: 'education', color: '#00FF84' },
  { pattern: /duolingo/i, name: 'Duolingo', category: 'education', color: '#58CC02' },
  { pattern: /linkedin\s*learning/i, name: 'LinkedIn Learning', category: 'education', color: '#0A66C2' },
  { pattern: /masterclass/i, name: 'MasterClass', category: 'education', color: '#000000' },

  // Other / Design / Dev
  { pattern: /adobe|creative\s*cloud/i, name: 'Adobe Creative Cloud', category: 'other', color: '#FF0000' },
  { pattern: /figma/i, name: 'Figma', category: 'other', color: '#F24E1E' },
  { pattern: /sketch/i, name: 'Sketch', category: 'other', color: '#F7B500' },
  { pattern: /github/i, name: 'GitHub', category: 'other', color: '#181717' },
  { pattern: /gitlab/i, name: 'GitLab', category: 'other', color: '#FC6D26' },
  { pattern: /chatgpt|openai/i, name: 'ChatGPT Plus', category: 'other', color: '#10A37F' },
  { pattern: /claude\s*(pro)?/i, name: 'Claude Pro', category: 'other', color: '#D4A27F' },
  { pattern: /youtube\s*premium/i, name: 'YouTube Premium', category: 'streaming', color: '#FF0000' },
  { pattern: /amazon\s*prime(?!\s*video)/i, name: 'Amazon Prime', category: 'other', color: '#FF9900' },
  { pattern: /apple\s*one/i, name: 'Apple One', category: 'other', color: '#000000' },
  { pattern: /apple\s*tv\+?/i, name: 'Apple TV+', category: 'streaming', color: '#000000' },
];

// 金額を抽出するパターン
const PRICE_PATTERNS = [
  // 日本円
  { pattern: /[¥￥]\s*([\d,]+)/, currency: 'JPY' },
  { pattern: /([\d,]+)\s*円/, currency: 'JPY' },
  { pattern: /JPY\s*([\d,]+)/, currency: 'JPY' },
  // 米ドル
  { pattern: /\$\s*([\d.]+)/, currency: 'USD' },
  { pattern: /USD\s*([\d.]+)/, currency: 'USD' },
  // ユーロ
  { pattern: /€\s*([\d.,]+)/, currency: 'EUR' },
  { pattern: /EUR\s*([\d.,]+)/, currency: 'EUR' },
];

// 請求サイクルを検出するパターン
const BILLING_CYCLE_PATTERNS: { pattern: RegExp; cycle: BillingCycle }[] = [
  { pattern: /月額|monthly|per\s*month|\/month|毎月/i, cycle: 'monthly' },
  { pattern: /年額|yearly|annual|per\s*year|\/year|毎年/i, cycle: 'yearly' },
  { pattern: /週額|weekly|per\s*week|\/week|毎週/i, cycle: 'weekly' },
  { pattern: /四半期|quarterly|3\s*month/i, cycle: 'quarterly' },
];

const extractHeader = (
  email: GmailMessageDetail,
  headerName: string,
): string => {
  return (
    email.payload?.headers?.find(
      h => h.name.toLowerCase() === headerName.toLowerCase(),
    )?.value || ''
  );
};

const decodeBase64 = (data: string): string => {
  try {
    // URL-safe base64 to standard base64
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return '';
  }
};

const extractBody = (email: GmailMessageDetail): string => {
  const parts = email.payload?.parts || [email.payload];
  let body = '';

  for (const part of parts) {
    if (part?.body?.data) {
      body += decodeBase64(part.body.data);
    }
    if (part && 'parts' in part && Array.isArray((part as any).parts)) {
      for (const subpart of (part as any).parts) {
        if (subpart?.body?.data) {
          body += decodeBase64(subpart.body.data);
        }
      }
    }
  }

  return body;
};

const extractPrice = (
  text: string,
): { price: number; currency: string } | null => {
  for (const { pattern, currency } of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0 && price < 1000000) {
        return { price, currency };
      }
    }
  }
  return null;
};

const extractBillingCycle = (text: string): BillingCycle | null => {
  for (const { pattern, cycle } of BILLING_CYCLE_PATTERNS) {
    if (pattern.test(text)) {
      return cycle;
    }
  }
  return null;
};

export const parseEmailForSubscription = (
  email: GmailMessageDetail,
): DetectedSubscription | null => {
  const subject = extractHeader(email, 'Subject');
  const from = extractHeader(email, 'From');
  const date = extractHeader(email, 'Date');
  const body = extractBody(email);
  const snippet = email.snippet || '';

  const fullText = `${subject} ${from} ${body} ${snippet}`;

  for (const service of SERVICE_PATTERNS) {
    if (service.pattern.test(fullText)) {
      const priceInfo = extractPrice(fullText);
      const billingCycle = extractBillingCycle(fullText);

      // 信頼度を計算
      let confidence = 0.5;
      if (priceInfo) confidence += 0.2;
      if (billingCycle) confidence += 0.15;
      if (/receipt|invoice|領収|請求|支払/i.test(subject)) confidence += 0.15;

      return {
        name: service.name,
        category: service.category,
        price: priceInfo?.price || null,
        currency: priceInfo?.currency || 'JPY',
        billingCycle,
        email: from,
        detectedDate: date || new Date().toISOString(),
        confidence,
      };
    }
  }

  return null;
};

export const parseMultipleEmails = (
  emails: GmailMessageDetail[],
): DetectedSubscription[] => {
  const detected: DetectedSubscription[] = [];
  const seenServices = new Set<string>();

  for (const email of emails) {
    const subscription = parseEmailForSubscription(email);
    if (subscription && !seenServices.has(subscription.name)) {
      seenServices.add(subscription.name);
      detected.push(subscription);
    }
  }

  // 信頼度で降順ソート
  return detected.sort((a, b) => b.confidence - a.confidence);
};
