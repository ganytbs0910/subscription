import type { Category, BillingCycle } from '../types';
import type { GmailMessageDetail } from './gmailService';

// 汎用メールインターフェース（Gmail/iCloud両対応）
export interface GenericEmail {
  subject: string;
  from: string;
  body: string;
  date: string;
  snippet?: string;
}

export interface PaymentHistoryItem {
  date: string;
  price: number;
  currency: string;
  subject?: string;
}

// 個別の購入記録
export interface SubItemPurchase {
  date: string;           // 購入日
  price: number;          // 金額
}

// アイテム別内訳（同じアプリ内の異なる課金アイテム）
export interface SubItem {
  name: string;           // アイテム名
  currency: string;
  purchases: SubItemPurchase[];  // 個別の購入履歴
  totalPaid: number;      // このアイテムの累計
}

export type DetectionType = 'subscription' | 'payment';

export interface DetectedSubscription {
  name: string;
  category: Category;
  price: number | null;
  currency: string | null;
  billingCycle: BillingCycle | null;
  email: string;
  detectedDate: string;
  confidence: number;
  paymentHistory?: PaymentHistoryItem[];
  totalPaid?: number;
  paymentCount?: number;
  // 検出タイプ: subscription（継続課金）または payment（単発課金）
  type: DetectionType;
  // アイテム別内訳（同じアプリ内の異なる課金アイテム）
  subItems?: SubItem[];
}

interface ServicePattern {
  pattern: RegExp;
  name: string;
  category: Category;
  icon?: string;
  color?: string;
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

  // App Store / Google Play (一般的なアプリ課金)
  { pattern: /app\s*store|itunes/i, name: 'App Store', category: 'other', color: '#007AFF' },
  { pattern: /google\s*play/i, name: 'Google Play', category: 'other', color: '#01875F' },

  // EC / Shopping
  { pattern: /amazon(?!\s*(prime|music|video))/i, name: 'Amazon', category: 'other', color: '#FF9900' },
  { pattern: /楽天市場|rakuten/i, name: '楽天', category: 'other', color: '#BF0000' },
  { pattern: /yahoo.*ショッピング|paypay.*モール/i, name: 'Yahoo!ショッピング', category: 'other', color: '#FF0033' },
  { pattern: /mercari|メルカリ/i, name: 'メルカリ', category: 'other', color: '#FF0211' },
];

// 金額を抽出するパターン（優先度順）
const PRICE_PATTERNS = [
  // 日本円 - 合計/Total行を優先
  { pattern: /(?:合計|total|amount|金額)[：:\s]*[¥￥]\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /(?:合計|total|amount|金額)[：:\s]*([\d,]+)\s*円/i, currency: 'JPY' },
  // 日本円 - 通常パターン
  { pattern: /[¥￥]\s*([\d,]+)\s*(?:円|JPY)?/i, currency: 'JPY' },
  { pattern: /([\d,]+)\s*円/i, currency: 'JPY' },
  { pattern: /JPY\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /([\d,]+)\s*JPY/i, currency: 'JPY' },
  // 米ドル - 合計/Total行を優先
  { pattern: /(?:合計|total|amount)[：:\s]*\$\s*([\d.]+)/i, currency: 'USD' },
  // 米ドル - 通常パターン
  { pattern: /\$\s*([\d.]+)/, currency: 'USD' },
  { pattern: /USD\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /([\d.]+)\s*USD/i, currency: 'USD' },
  // ユーロ
  { pattern: /€\s*([\d.,]+)/, currency: 'EUR' },
  { pattern: /EUR\s*([\d.,]+)/i, currency: 'EUR' },
  { pattern: /([\d.,]+)\s*EUR/i, currency: 'EUR' },
];

// HTMLエンティティを通常文字に変換
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&#165;/g, '¥')
    .replace(/&#36;/g, '$')
    .replace(/&yen;/gi, '¥')
    .replace(/&dollar;/gi, '$')
    .replace(/&euro;/gi, '€')
    .replace(/&#8364;/g, '€')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' '); // 複数の空白を1つに
};

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

// 金額として誤検出しやすいパターンを除外
const isLikelyNotPrice = (text: string, matchIndex: number): boolean => {
  // マッチ位置の前後50文字を取得
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(text.length, matchIndex + 50);
  const context = text.substring(start, end).toLowerCase();

  // 除外パターン
  const excludePatterns = [
    /ポイント/,
    /point/i,
    /会員番号/,
    /会員id/,
    /member/i,
    /注文番号/,
    /order.*id/i,
    /confirmation/i,
    /確認番号/,
    /クーポン/,
    /coupon/i,
    /割引/,
    /discount/i,
    /キャンペーン/,
    /campaign/i,
    /プレゼント/,
    /当選/,
    /抽選/,
  ];

  return excludePatterns.some(p => p.test(context));
};

const extractPrice = (
  text: string,
): { price: number; currency: string } | null => {
  // HTMLエンティティをデコード
  const decodedText = decodeHtmlEntities(text);

  // サブスクの妥当な価格範囲（月額基準）
  const MIN_JPY = 100;
  const MAX_JPY = 20000;  // 月額2万円以上のサブスクはほぼない
  const MIN_USD = 1;
  const MAX_USD = 200;    // 月額$200以上のサブスクはほぼない
  const MIN_EUR = 1;
  const MAX_EUR = 200;

  // 候補を収集（複数見つかった場合、最も妥当なものを選ぶ）
  const candidates: Array<{ price: number; currency: string; priority: number }> = [];

  for (const { pattern, currency } of PRICE_PATTERNS) {
    // 全マッチを探す
    let match;
    const regex = new RegExp(pattern.source, 'gi');
    while ((match = regex.exec(decodedText)) !== null) {
      const fullMatch = match[0];
      const priceMatch = fullMatch.match(pattern);
      if (!priceMatch) continue;

      const priceStr = priceMatch[1].replace(/,/g, '');
      const price = parseFloat(priceStr);

      // 文脈チェック（ポイントや会員番号を除外）
      if (isLikelyNotPrice(decodedText, match.index)) {
        continue;
      }

      // 通貨ごとの妥当な範囲でフィルタ
      let isValid = false;
      if (currency === 'JPY' && price >= MIN_JPY && price <= MAX_JPY) {
        isValid = true;
      }
      if (currency === 'USD' && price >= MIN_USD && price <= MAX_USD) {
        isValid = true;
      }
      if (currency === 'EUR' && price >= MIN_EUR && price <= MAX_EUR) {
        isValid = true;
      }

      if (isValid) {
        // 優先度を計算（合計/total行は高優先度）
        const contextLower = decodedText.substring(
          Math.max(0, match.index - 20),
          match.index
        ).toLowerCase();

        let priority = 0;
        if (/合計|total|amount|金額|請求額|お支払い/.test(contextLower)) {
          priority = 10;
        } else if (/月額|年額|monthly|yearly|annual/.test(contextLower)) {
          priority = 5;
        }

        candidates.push({ price, currency, priority });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // 優先度でソートし、最も優先度が高いものを返す
  // 同じ優先度なら、より小さい金額を選ぶ（サブスクは高額より低額の方が多い）
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.price - b.price;
  });

  return { price: candidates[0].price, currency: candidates[0].currency };
};

const extractBillingCycle = (text: string): BillingCycle | null => {
  for (const { pattern, cycle } of BILLING_CYCLE_PATTERNS) {
    if (pattern.test(text)) {
      return cycle;
    }
  }
  return null;
};

// 送信者メールアドレスからサービス名を抽出
const extractServiceNameFromEmail = (fromHeader: string): string => {
  // "Name <email@example.com>" または "email@example.com" から名前を抽出
  const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch && nameMatch[1].trim()) {
    const name = nameMatch[1].trim();
    // 一般的な接尾辞を除去
    return name
      .replace(/\s*(noreply|no-reply|support|billing|info|notification|notifications)\s*/gi, '')
      .replace(/^\s+|\s+$/g, '')
      || extractDomainName(fromHeader);
  }

  return extractDomainName(fromHeader);
};

// メールアドレスからドメイン名を抽出して整形
const extractDomainName = (fromHeader: string): string => {
  const emailMatch = fromHeader.match(/<?\s*([^\s<>]+@([^\s<>]+))\s*>?/);
  if (emailMatch && emailMatch[2]) {
    const domain = emailMatch[2].toLowerCase();
    // ドメインからサービス名を生成
    const parts = domain.split('.');
    // サブドメインを除去（mail., noreply. など）
    const mainPart = parts.find(p =>
      !['mail', 'noreply', 'no-reply', 'email', 'newsletter', 'support', 'billing'].includes(p)
    ) || parts[0];
    // 最初の文字を大文字に
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  }
  return '不明な支払い';
};

// 支払い/課金関連のメールかどうかを判定
const isPaymentRelatedEmail = (subject: string, body: string): boolean => {
  const text = `${subject} ${body}`.toLowerCase();
  const paymentKeywords = [
    // 日本語
    '領収', '請求', '支払', '決済', '課金', '購入', '注文', '精算', '引き落とし',
    'お買い上げ', 'ご利用', 'ご請求', 'お支払い',
    // English
    'receipt', 'invoice', 'payment', 'billing', 'charge', 'charged',
    'purchase', 'order', 'transaction', 'subscription', 'renewal',
  ];

  return paymentKeywords.some(keyword => text.includes(keyword));
};

// ゲーム内課金（単発購入）かどうかを判定
const isInAppPurchase = (text: string): boolean => {
  const textLower = text.toLowerCase();

  // ゲーム内通貨・アイテムのパターン
  const inAppPatterns = [
    // ゲーム内通貨
    /ジェム|gem/i,
    /コイン|coin/i,
    /エメラルド|emerald/i,
    /ゴールド|gold/i,
    /ダイヤ|diamond/i,
    /クリスタル|crystal/i,
    /ルビー|ruby/i,
    /スター|star/i,
    /ポイント購入/i,
    /\d+個/,  // 「60個」「950個」など
    // ゲーム名でアプリ内課金が多いもの
    /pokémon|pokemon|ポケモン/i,
    /clash|クラッシュ/i,
    /brawl|ブロスタ/i,
    /line\s*(coin|コイン)/i,
    // アプリ内課金の明示的なキーワード
    /アプリ内課金/i,
    /in-app purchase/i,
    /consumable/i,
  ];

  return inAppPatterns.some(pattern => pattern.test(text));
};

// サブスク（継続課金）かどうかを判定
const isSubscriptionPayment = (text: string): boolean => {
  // まずゲーム内課金かどうかをチェック（これらはサブスクではない）
  if (isInAppPurchase(text)) {
    // ただし、明示的なサブスクキーワードがある場合は除く
    const explicitSubKeywords = ['月額', '年額', '自動更新', 'subscription', 'monthly plan', 'yearly plan'];
    const hasExplicitSub = explicitSubKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
    if (!hasExplicitSub) {
      return false;
    }
  }

  const subscriptionKeywords = [
    // 日本語
    '月額', '年額', '週額', '四半期', '定期', 'サブスクリプション',
    '自動更新', '継続', 'メンバーシップ',
    // English
    'subscription', 'monthly plan', 'yearly plan', 'annual plan', 'weekly plan',
    'recurring', 'renewal', 'membership',
  ];

  const textLower = text.toLowerCase();
  return subscriptionKeywords.some(keyword => textLower.includes(keyword));
};

// Appleの領収書メールかどうかを判定
const isAppleReceipt = (from: string, subject: string): boolean => {
  const isFromApple = /no_reply@email\.apple\.com|appleid@id\.apple\.com/i.test(from);
  const isReceipt = /領収書|receipt/i.test(subject);
  return isFromApple && isReceipt;
};

// Apple領収書から複数のアプリ課金を抽出
interface AppleAppPurchase {
  appName: string;
  itemName: string;
  price: number;
  currency: string;
  isSubscription: boolean;
  billingCycle: BillingCycle | null;
}

const parseAppleReceipt = (body: string): AppleAppPurchase[] => {
  const purchases: AppleAppPurchase[] = [];

  // HTMLタグを除去してテキスト化
  const text = body
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#165;/g, '¥')
    .replace(/&yen;/g, '¥')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (__DEV__) {
    console.log('[parseAppleReceipt] Apple領収書をパース中...');
  }

  // 各アプリの課金ブロックを検出
  // パターン: アプリ名 → アイテム名 → (月額/アプリ内課金など) → 金額(¥XXX)
  // 「問題を報告する」の直後に金額が来ることが多い

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  if (__DEV__) {
    console.log(`[parseAppleReceipt] 行数: ${lines.length}`);

    // デバッグ: 金額っぽい行を全て表示
    const priceLines = lines.filter(l => /[¥￥]/.test(l) || /^\d{2,5}$/.test(l));
    console.log(`[parseAppleReceipt] 金額を含む行:`);
    priceLines.forEach(l => console.log(`  - "${l}"`));
  }

  let currentApp = '';
  let currentItem = '';
  let lookingForPrice = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // App Storeセクションの開始を検出
    if (/^App\s*Store$/i.test(line)) {
      if (__DEV__) {
        console.log(`[parseAppleReceipt] App Storeセクション開始`);
      }
      continue;
    }

    // 金額行を検出 (¥XXX または ￥XXX、または「問題を報告する ¥XXX」形式)
    let priceMatch = line.match(/^[¥￥]\s*([\d,]+)$/);

    // 「問題を報告する    ¥700」のような形式も対応
    if (!priceMatch) {
      priceMatch = line.match(/問題を報告.*[¥￥]\s*([\d,]+)/);
    }

    // 行末に金額がある形式「何かのテキスト ¥700」
    if (!priceMatch) {
      priceMatch = line.match(/[¥￥]\s*([\d,]+)\s*$/);
    }

    if (priceMatch && currentApp) {
      const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      if (price > 0 && price < 100000) { // 妥当な範囲
        // サブスクかどうかを判定
        const contextText = `${currentApp} ${currentItem}`;
        const isSubscription = isSubscriptionPayment(contextText);
        const billingCycle = extractBillingCycle(contextText);

        if (__DEV__) {
          console.log(`[parseAppleReceipt] ✓ 検出: ${currentApp} - ¥${price} (${isSubscription ? 'サブスク' : '課金'})`);
        }

        purchases.push({
          appName: currentApp,
          itemName: currentItem,
          price,
          currency: 'JPY',
          isSubscription,
          billingCycle,
        });
      }
      currentApp = '';
      currentItem = '';
      lookingForPrice = false;
      continue;
    }

    // 「問題を報告する」を検出したら次の金額を探す
    if (/問題を報告/i.test(line) && !/[¥￥]/.test(line)) {
      lookingForPrice = true;
      continue;
    }

    // JCT行や小計行はスキップ
    if (/^JCT|^小計|^合計|税|%|を含む/i.test(line)) {
      continue;
    }

    // アプリ名/アイテム名の候補
    // アプリ名は通常、英数字や日本語で始まる
    if (line.length > 1 && line.length < 100) {
      // 除外パターン
      if (/^(日付|ご注文番号|書類番号|請求先|更新|APPLE|Amex|Visa|JCB|Mastercard|\d{4}年|nakanishi|滋賀県|JPN|@)/i.test(line)) {
        continue;
      }

      // アイテム名っぽい行（大文字英語や「月額」「アプリ内課金」を含む）
      if (/[A-Z]{2,}|月額|年額|アプリ内課金|Pass|Premium|Plus|Pro|Upgrade/i.test(line)) {
        currentItem = line;
        if (__DEV__) {
          console.log(`[parseAppleReceipt] アイテム候補: "${line}"`);
        }
      } else if (!currentApp || currentItem) {
        // 新しいアプリ名
        currentApp = line;
        currentItem = '';
        if (__DEV__) {
          console.log(`[parseAppleReceipt] アプリ名候補: "${line}"`);
        }
      }
    }
  }

  if (__DEV__) {
    console.log(`[parseAppleReceipt] 検出結果: ${purchases.length}件`);
  }
  return purchases;
};

// 1つのメールから複数の課金を抽出（Apple領収書対応）
export const parseEmailForSubscriptions = (
  email: GmailMessageDetail,
): DetectedSubscription[] => {
  const subject = extractHeader(email, 'Subject');
  const from = extractHeader(email, 'From');
  const date = extractHeader(email, 'Date');
  const body = extractBody(email);
  const snippet = email.snippet || '';

  const fullText = `${subject} ${from} ${body} ${snippet}`;
  const results: DetectedSubscription[] = [];

  // Apple領収書の場合は専用パーサーを使用
  if (isAppleReceipt(from, subject)) {
    const purchases = parseAppleReceipt(body);

    for (const purchase of purchases) {
      // アプリ名で既知のサービスを検索
      let category: Category = 'other';
      let serviceName = purchase.appName;

      for (const service of SERVICE_PATTERNS) {
        if (service.pattern.test(purchase.appName) || service.pattern.test(purchase.itemName)) {
          serviceName = service.name;
          category = service.category;
          break;
        }
      }

      results.push({
        name: serviceName,
        category,
        price: purchase.price,
        currency: purchase.currency,
        billingCycle: purchase.billingCycle,
        email: from,
        detectedDate: date || new Date().toISOString(),
        confidence: 0.85, // Apple領収書は信頼度高め
        type: purchase.isSubscription ? 'subscription' : 'payment',
      });
    }

    // Apple領収書から課金が抽出できた場合はそれを返す
    if (results.length > 0) {
      return results;
    }
  }

  // 1. 既知のサービスパターンにマッチするか確認
  for (const service of SERVICE_PATTERNS) {
    if (service.pattern.test(fullText)) {
      const priceInfo = extractPrice(fullText);
      const billingCycle = extractBillingCycle(fullText);
      const isSubscription = isSubscriptionPayment(fullText);

      // 信頼度を計算
      let confidence = 0.5;
      if (priceInfo) confidence += 0.2;
      if (billingCycle) confidence += 0.15;
      if (/receipt|invoice|領収|請求|支払/i.test(subject)) confidence += 0.15;

      results.push({
        name: service.name,
        category: service.category,
        price: priceInfo?.price ?? null,
        currency: priceInfo?.currency || null,
        billingCycle,
        email: from,
        detectedDate: date || new Date().toISOString(),
        confidence,
        type: isSubscription || billingCycle ? 'subscription' : 'payment',
      });

      return results;
    }
  }

  // 2. 既知のサービスにマッチしないが、支払い関連のメールかどうか確認
  if (isPaymentRelatedEmail(subject, body)) {
    const priceInfo = extractPrice(fullText);

    // 金額が検出できない場合はスキップ（誤検出防止）
    if (!priceInfo) {
      return results;
    }

    const billingCycle = extractBillingCycle(fullText);
    const serviceName = extractServiceNameFromEmail(from);
    const isSubscription = isSubscriptionPayment(fullText);

    // 信頼度を計算（一般的な検出なので低め）
    let confidence = 0.3;
    if (billingCycle) confidence += 0.15;
    if (/receipt|invoice|領収|請求|支払/i.test(subject)) confidence += 0.15;
    if (isSubscription) confidence += 0.1;

    results.push({
      name: serviceName,
      category: 'other',
      price: priceInfo.price,
      currency: priceInfo.currency,
      billingCycle,
      email: from,
      detectedDate: date || new Date().toISOString(),
      confidence,
      type: isSubscription || billingCycle ? 'subscription' : 'payment',
    });
  }

  return results;
};

// 後方互換性のため、1つの結果を返す関数も維持
export const parseEmailForSubscription = (
  email: GmailMessageDetail,
): DetectedSubscription | null => {
  const results = parseEmailForSubscriptions(email);
  return results.length > 0 ? results[0] : null;
};

export const parseMultipleEmails = (
  emails: GmailMessageDetail[],
): DetectedSubscription[] => {
  // サービスごとに支払い履歴を収集
  const serviceMap = new Map<string, {
    subscription: DetectedSubscription;
    paymentHistory: PaymentHistoryItem[];
  }>();

  for (const email of emails) {
    // 1つのメールから複数の課金を抽出（Apple領収書対応）
    const subscriptions = parseEmailForSubscriptions(email);
    if (subscriptions.length === 0) continue;

    const emailSubject = extractHeader(email, 'Subject');

    for (const subscription of subscriptions) {
      const existing = serviceMap.get(subscription.name);

      // 支払い履歴として追加（価格が検出できた場合）
      const paymentItem: PaymentHistoryItem | null = subscription.price
        ? {
            date: subscription.detectedDate,
            price: subscription.price,
            currency: subscription.currency || 'JPY',
            subject: emailSubject,
          }
        : null;

      if (existing) {
        // 既存のサービスに支払い履歴を追加
        if (paymentItem) {
          existing.paymentHistory.push(paymentItem);
        }
        // より高い信頼度の情報で更新
        if (subscription.confidence > existing.subscription.confidence) {
          existing.subscription = {
            ...subscription,
            paymentHistory: existing.paymentHistory,
          };
        }
      } else {
        // 新しいサービスとして追加
        serviceMap.set(subscription.name, {
          subscription: {
            ...subscription,
            paymentHistory: paymentItem ? [paymentItem] : [],
          },
          paymentHistory: paymentItem ? [paymentItem] : [],
        });
      }
    }
  }

  // 結果を組み立て
  const results = Array.from(serviceMap.values()).map(({ subscription, paymentHistory }) => {
    // 支払い履歴を日付順にソート（古い順）
    paymentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 合計を計算
    const totalPaid = paymentHistory.reduce((sum, h) => sum + h.price, 0);

    return {
      ...subscription,
      paymentHistory,
      totalPaid,
      paymentCount: paymentHistory.length,
    };
  });

  // 信頼度で降順ソート
  return results.sort((a, b) => b.confidence - a.confidence);
};

// GmailMessageDetailをGenericEmailに変換
export const convertGmailToGeneric = (
  email: GmailMessageDetail,
): GenericEmail => {
  return {
    subject: extractHeader(email, 'Subject'),
    from: extractHeader(email, 'From'),
    body: extractBody(email),
    date: extractHeader(email, 'Date') || new Date().toISOString(),
    snippet: email.snippet,
  };
};

// 汎用メールからサブスク/課金検出（複数対応）
export const parseGenericEmailForSubscriptions = (
  email: GenericEmail,
): DetectedSubscription[] => {
  const fullText = `${email.subject} ${email.from} ${email.body} ${email.snippet || ''}`;
  const results: DetectedSubscription[] = [];

  // Apple領収書の場合は専用パーサーを使用
  if (isAppleReceipt(email.from, email.subject)) {
    const purchases = parseAppleReceipt(email.body);

    for (const purchase of purchases) {
      let category: Category = 'other';
      let serviceName = purchase.appName;

      for (const service of SERVICE_PATTERNS) {
        if (service.pattern.test(purchase.appName) || service.pattern.test(purchase.itemName)) {
          serviceName = service.name;
          category = service.category;
          break;
        }
      }

      results.push({
        name: serviceName,
        category,
        price: purchase.price,
        currency: purchase.currency,
        billingCycle: purchase.billingCycle,
        email: email.from,
        detectedDate: email.date,
        confidence: 0.85,
        type: purchase.isSubscription ? 'subscription' : 'payment',
      });
    }

    if (results.length > 0) {
      return results;
    }
  }

  // 1. 既知のサービスパターンにマッチするか確認
  for (const service of SERVICE_PATTERNS) {
    if (service.pattern.test(fullText)) {
      const priceInfo = extractPrice(fullText);
      const billingCycle = extractBillingCycle(fullText);
      const isSubscription = isSubscriptionPayment(fullText);

      let confidence = 0.5;
      if (priceInfo) confidence += 0.2;
      if (billingCycle) confidence += 0.15;
      if (/receipt|invoice|領収|請求|支払/i.test(email.subject)) confidence += 0.15;

      results.push({
        name: service.name,
        category: service.category,
        price: priceInfo?.price ?? null,
        currency: priceInfo?.currency || null,
        billingCycle,
        email: email.from,
        detectedDate: email.date,
        confidence,
        type: isSubscription || billingCycle ? 'subscription' : 'payment',
      });

      return results;
    }
  }

  // 2. 既知のサービスにマッチしないが、支払い関連のメールかどうか確認
  if (isPaymentRelatedEmail(email.subject, email.body)) {
    const priceInfo = extractPrice(fullText);

    if (!priceInfo) {
      return results;
    }

    const billingCycle = extractBillingCycle(fullText);
    const serviceName = extractServiceNameFromEmail(email.from);
    const isSubscription = isSubscriptionPayment(fullText);

    let confidence = 0.3;
    if (billingCycle) confidence += 0.15;
    if (/receipt|invoice|領収|請求|支払/i.test(email.subject)) confidence += 0.15;
    if (isSubscription) confidence += 0.1;

    results.push({
      name: serviceName,
      category: 'other',
      price: priceInfo.price,
      currency: priceInfo.currency,
      billingCycle,
      email: email.from,
      detectedDate: email.date,
      confidence,
      type: isSubscription || billingCycle ? 'subscription' : 'payment',
    });
  }

  return results;
};

// 後方互換性のため
export const parseGenericEmailForSubscription = (
  email: GenericEmail,
): DetectedSubscription | null => {
  const results = parseGenericEmailForSubscriptions(email);
  return results.length > 0 ? results[0] : null;
};

// 汎用メール配列からサブスク/課金検出
export const parseMultipleGenericEmails = (
  emails: GenericEmail[],
): DetectedSubscription[] => {
  // サービスごとに支払い履歴を収集
  const serviceMap = new Map<string, {
    subscription: DetectedSubscription;
    paymentHistory: PaymentHistoryItem[];
  }>();

  for (const email of emails) {
    // 1つのメールから複数の課金を抽出（Apple領収書対応）
    const subscriptions = parseGenericEmailForSubscriptions(email);
    if (subscriptions.length === 0) continue;

    for (const subscription of subscriptions) {
      const existing = serviceMap.get(subscription.name);

      // 支払い履歴として追加（価格が検出できた場合）
      const paymentItem: PaymentHistoryItem | null = subscription.price
        ? {
            date: subscription.detectedDate,
            price: subscription.price,
            currency: subscription.currency || 'JPY',
            subject: email.subject,
          }
        : null;

      if (existing) {
        // 既存のサービスに支払い履歴を追加
        if (paymentItem) {
          existing.paymentHistory.push(paymentItem);
        }
        // より高い信頼度の情報で更新
        if (subscription.confidence > existing.subscription.confidence) {
          existing.subscription = {
            ...subscription,
            paymentHistory: existing.paymentHistory,
          };
        }
      } else {
        // 新しいサービスとして追加
        serviceMap.set(subscription.name, {
          subscription: {
            ...subscription,
            paymentHistory: paymentItem ? [paymentItem] : [],
          },
          paymentHistory: paymentItem ? [paymentItem] : [],
        });
      }
    }
  }

  // 結果を組み立て
  const results = Array.from(serviceMap.values()).map(({ subscription, paymentHistory }) => {
    // 支払い履歴を日付順にソート（古い順）
    paymentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 合計を計算
    const totalPaid = paymentHistory.reduce((sum, h) => sum + h.price, 0);

    return {
      ...subscription,
      paymentHistory,
      totalPaid,
      paymentCount: paymentHistory.length,
    };
  });

  return results.sort((a, b) => b.confidence - a.confidence);
};
