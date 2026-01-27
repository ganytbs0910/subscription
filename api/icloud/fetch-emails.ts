import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
  appPassword: z.string().min(1),
  maxResults: z.number().min(1).max(500).optional().default(200),
});

type Category =
  | 'streaming'
  | 'music'
  | 'productivity'
  | 'cloud'
  | 'gaming'
  | 'news'
  | 'fitness'
  | 'education'
  | 'other';

type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'quarterly';

interface PaymentRecord {
  date: string;
  price: number;
  currency: string;
  subject: string;
}

// 個別の購入記録
interface SubItemPurchase {
  date: string;           // 購入日
  price: number;          // 金額
}

// サブアイテム（アイテム別内訳）
interface SubItem {
  name: string;           // アイテム名
  currency: string;
  purchases: SubItemPurchase[];  // 個別の購入履歴
  totalPaid: number;      // このアイテムの累計
}

type DetectionType = 'subscription' | 'payment';

interface DetectedSubscription {
  name: string;
  category: Category;
  price: number | null;
  currency: string;
  billingCycle: BillingCycle | null;
  nextBillingDate: string | null;
  email: string;
  detectedDate: string;
  confidence: number;
  priceDetected: boolean;
  isBilling: boolean;
  extractedByAI?: boolean;
  paymentHistory: PaymentRecord[];
  totalPaid: number;
  paymentCount: number;
  subItems?: SubItem[];   // アイテム別内訳
  type: DetectionType;    // サブスク or 単発課金
}

interface ServicePattern {
  pattern: RegExp;
  name: string;
  category: Category;
  senderPatterns?: RegExp[];
  subjectPatterns?: RegExp[];
}

// 統合されたサービスパターン（送信者パターン付き）
const SERVICE_PATTERNS: ServicePattern[] = [
  // Streaming
  { pattern: /netflix/i, name: 'Netflix', category: 'streaming', senderPatterns: [/@netflix\.com/i, /netflix/i], subjectPatterns: [/netflix/i] },
  { pattern: /disney\+|disneyplus/i, name: 'Disney+', category: 'streaming', senderPatterns: [/@disney/i, /@disneyplus/i], subjectPatterns: [/disney\+|disneyplus/i] },
  { pattern: /hulu/i, name: 'Hulu', category: 'streaming', senderPatterns: [/@hulu\.(com|jp)/i], subjectPatterns: [/hulu/i] },
  { pattern: /amazon\s*prime\s*video|prime\s*video/i, name: 'Amazon Prime Video', category: 'streaming' },
  { pattern: /u-next|unext/i, name: 'U-NEXT', category: 'streaming' },
  { pattern: /abema/i, name: 'ABEMA', category: 'streaming' },
  { pattern: /dazn/i, name: 'DAZN', category: 'streaming' },
  { pattern: /crunchyroll/i, name: 'Crunchyroll', category: 'streaming' },
  { pattern: /hbo\s*max/i, name: 'HBO Max', category: 'streaming' },
  { pattern: /paramount\+|paramountplus/i, name: 'Paramount+', category: 'streaming' },
  { pattern: /youtube\s*premium/i, name: 'YouTube Premium', category: 'streaming', senderPatterns: [/@youtube\.com/i, /@google\.com/i], subjectPatterns: [/youtube\s*premium/i] },
  { pattern: /apple\s*tv\+?/i, name: 'Apple TV+', category: 'streaming', senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i, /no_reply@.*apple/i], subjectPatterns: [/apple\s*tv\+|apple\s*tv\s*plus/i] },

  // Music
  { pattern: /spotify/i, name: 'Spotify', category: 'music', senderPatterns: [/@spotify\.com/i, /spotify/i], subjectPatterns: [/spotify/i] },
  { pattern: /apple\s*music/i, name: 'Apple Music', category: 'music', senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i, /no_reply@.*apple/i], subjectPatterns: [/apple\s*music/i] },
  { pattern: /youtube\s*music/i, name: 'YouTube Music', category: 'music' },
  { pattern: /amazon\s*music/i, name: 'Amazon Music', category: 'music' },
  { pattern: /line\s*music/i, name: 'LINE MUSIC', category: 'music' },
  { pattern: /awa\s/i, name: 'AWA', category: 'music' },
  { pattern: /tidal/i, name: 'TIDAL', category: 'music' },
  { pattern: /deezer/i, name: 'Deezer', category: 'music' },

  // Productivity
  { pattern: /notion/i, name: 'Notion', category: 'productivity', senderPatterns: [/@notion\.so/i, /@makenotion\.com/i], subjectPatterns: [/notion/i] },
  { pattern: /slack/i, name: 'Slack', category: 'productivity', senderPatterns: [/@slack\.com/i], subjectPatterns: [/slack/i] },
  { pattern: /zoom/i, name: 'Zoom', category: 'productivity', senderPatterns: [/@zoom\.(us|com)/i], subjectPatterns: [/zoom\s*(pro|business|enterprise|領収|invoice|receipt|請求)/i] },
  { pattern: /microsoft\s*365|office\s*365/i, name: 'Microsoft 365', category: 'productivity', senderPatterns: [/@microsoft\.com/i, /@office\.com/i], subjectPatterns: [/microsoft\s*365|office\s*365/i] },
  { pattern: /evernote/i, name: 'Evernote', category: 'productivity' },
  { pattern: /todoist/i, name: 'Todoist', category: 'productivity' },
  { pattern: /1password|one\s*password/i, name: '1Password', category: 'productivity' },
  { pattern: /lastpass/i, name: 'LastPass', category: 'productivity' },
  { pattern: /grammarly/i, name: 'Grammarly', category: 'productivity' },
  { pattern: /canva/i, name: 'Canva', category: 'productivity' },

  // Cloud
  { pattern: /dropbox/i, name: 'Dropbox', category: 'cloud', senderPatterns: [/@dropbox\.com/i], subjectPatterns: [/dropbox/i] },
  { pattern: /google\s*(one|drive|storage)/i, name: 'Google One', category: 'cloud' },
  { pattern: /icloud\+?(?:\s*ストレージ)?/i, name: 'iCloud+', category: 'cloud', senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i, /no_reply@.*apple/i], subjectPatterns: [/icloud\+|icloud\s*ストレージ|icloud\s*storage|icloud.*(?:領収|receipt|invoice|請求|支払|renewed)/i] },
  { pattern: /onedrive/i, name: 'OneDrive', category: 'cloud' },
  { pattern: /box\.com|box\s*storage/i, name: 'Box', category: 'cloud' },

  // Gaming
  { pattern: /playstation\s*(plus|now)|ps\s*plus/i, name: 'PlayStation Plus', category: 'gaming', senderPatterns: [/@playstation\.com/i, /@sony\.com/i], subjectPatterns: [/playstation\s*plus|ps\s*plus/i] },
  { pattern: /xbox\s*game\s*pass/i, name: 'Xbox Game Pass', category: 'gaming', senderPatterns: [/@xbox\.com/i, /@microsoft\.com/i], subjectPatterns: [/xbox\s*game\s*pass/i] },
  { pattern: /nintendo\s*(switch\s*)?online/i, name: 'Nintendo Switch Online', category: 'gaming', senderPatterns: [/@nintendo\.(com|co\.jp)/i], subjectPatterns: [/nintendo\s*switch\s*online|ニンテンドースイッチオンライン/i] },
  { pattern: /ea\s*play/i, name: 'EA Play', category: 'gaming' },
  { pattern: /apple\s*arcade/i, name: 'Apple Arcade', category: 'gaming', senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i, /no_reply@.*apple/i], subjectPatterns: [/apple\s*arcade/i] },
  { pattern: /geforce\s*now/i, name: 'GeForce NOW', category: 'gaming' },

  // News / Media
  { pattern: /nikkei|日経/i, name: '日経電子版', category: 'news' },
  { pattern: /new\s*york\s*times|nytimes/i, name: 'New York Times', category: 'news' },
  { pattern: /washington\s*post/i, name: 'Washington Post', category: 'news' },
  { pattern: /wall\s*street\s*journal|wsj/i, name: 'Wall Street Journal', category: 'news' },
  { pattern: /medium/i, name: 'Medium', category: 'news' },

  // Fitness
  { pattern: /apple\s*fitness\+?/i, name: 'Apple Fitness+', category: 'fitness', senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i, /no_reply@.*apple/i], subjectPatterns: [/apple\s*fitness\+|apple\s*fitness\s*plus/i] },
  { pattern: /strava/i, name: 'Strava', category: 'fitness' },
  { pattern: /peloton/i, name: 'Peloton', category: 'fitness' },
  { pattern: /nike\s*(training|run)/i, name: 'Nike Training', category: 'fitness' },

  // Education
  { pattern: /coursera/i, name: 'Coursera', category: 'education' },
  { pattern: /udemy/i, name: 'Udemy', category: 'education' },
  { pattern: /skillshare/i, name: 'Skillshare', category: 'education' },
  { pattern: /duolingo/i, name: 'Duolingo', category: 'education' },
  { pattern: /linkedin\s*learning/i, name: 'LinkedIn Learning', category: 'education' },
  { pattern: /masterclass/i, name: 'MasterClass', category: 'education' },

  // Other / Design / Dev
  { pattern: /adobe|creative\s*cloud/i, name: 'Adobe Creative Cloud', category: 'other', senderPatterns: [/@adobe\.com/i], subjectPatterns: [/adobe|creative\s*cloud/i] },
  { pattern: /figma/i, name: 'Figma', category: 'other' },
  { pattern: /sketch/i, name: 'Sketch', category: 'other' },
  { pattern: /github/i, name: 'GitHub', category: 'other', senderPatterns: [/@github\.com/i], subjectPatterns: [/github\s*(pro|team|enterprise|receipt|invoice|領収|請求)/i] },
  { pattern: /gitlab/i, name: 'GitLab', category: 'other' },
  { pattern: /chatgpt|openai/i, name: 'ChatGPT Plus', category: 'other', senderPatterns: [/@openai\.com/i], subjectPatterns: [/chatgpt|openai/i] },
  { pattern: /claude\s*(pro)?/i, name: 'Claude Pro', category: 'other', senderPatterns: [/@anthropic\.com/i], subjectPatterns: [/claude|anthropic/i] },
  { pattern: /amazon\s*prime(?!\s*video)/i, name: 'Amazon Prime', category: 'other', senderPatterns: [/@amazon\.(com|co\.jp)/i], subjectPatterns: [/amazon\s*prime|プライム会員/i] },
  { pattern: /apple\s*one/i, name: 'Apple One', category: 'other', senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i, /no_reply@.*apple/i], subjectPatterns: [/apple\s*one/i] },
  { pattern: /apple\s*news\+?/i, name: 'Apple News+', category: 'other', senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i, /no_reply@.*apple/i], subjectPatterns: [/apple\s*news\+|apple\s*news\s*plus/i] },
];

// ★ 厳格な請求メール判定キーワード（件名用）
const BILLING_SUBJECT_KEYWORDS = [
  /receipt/i, /invoice/i, /payment\s*confirm/i, /billing\s*statement/i,
  /thank you for your (purchase|payment|order)/i, /order confirmation/i,
  /領収書/i, /請求書/i, /ご利用明細/i, /お支払い完了/i, /決済完了/i,
  /ご注文確認/i, /購入完了/i, /引き落とし/i, /課金完了/i,
];

// プロモーション・宣伝メールの除外パターン
const PROMO_PATTERNS = [
  /ご存じですか/i, /キャンペーン/i, /お得/i, /無料/i, /割引/i,
  /おすすめ/i, /新機能/i, /アップグレード/i, /特別/i, /限定/i,
  /did you know/i, /special offer/i, /upgrade/i, /free trial/i,
  /% off/i, /save \$/i, /discount/i,
];

const PRICE_PATTERNS: { pattern: RegExp; currency: string }[] = [
  { pattern: /合計[：:\s]*[¥￥]\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /total[：:\s]*[¥￥]\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /金額[：:\s]*[¥￥]?\s*([\d,]+)\s*円?/i, currency: 'JPY' },
  { pattern: /料金[：:\s]*[¥￥]?\s*([\d,]+)\s*円?/i, currency: 'JPY' },
  { pattern: /価格[：:\s]*[¥￥]?\s*([\d,]+)\s*円?/i, currency: 'JPY' },
  { pattern: /[¥￥]\s*([\d,]+)\s*(?:\(税込\)|\(税別\)|円|JPY)?/i, currency: 'JPY' },
  { pattern: /([\d,]+)\s*円\s*(?:\(税込\)|\(税別\))?/i, currency: 'JPY' },
  { pattern: /JPY\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /([\d,]+)\s*JPY/i, currency: 'JPY' },
  { pattern: /total[：:\s]*(?:US)?\$\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /amount[：:\s]*(?:US)?\$\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /US\$\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /\$\s*([\d.]+)\s*USD/i, currency: 'USD' },
  { pattern: /\$\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /USD\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /([\d.]+)\s*USD/i, currency: 'USD' },
  { pattern: /€\s*([\d.,]+)/, currency: 'EUR' },
  { pattern: /EUR\s*([\d.,]+)/, currency: 'EUR' },
];

const BILLING_CYCLE_PATTERNS: { pattern: RegExp; cycle: BillingCycle }[] = [
  { pattern: /月額|monthly|per\s*month|\/month|毎月/i, cycle: 'monthly' },
  { pattern: /年額|yearly|annual|per\s*year|\/year|毎年/i, cycle: 'yearly' },
  { pattern: /週額|weekly|per\s*week|\/week|毎週/i, cycle: 'weekly' },
  { pattern: /四半期|quarterly|3\s*month/i, cycle: 'quarterly' },
];

// HTMLからテキストを抽出
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&yen;/g, '¥')
    .replace(/&#165;/g, '¥')
    .replace(/\s+/g, ' ')
    .trim();
}

// 請求メールかどうかを判定（厳格版）
function isBillingEmail(subject: string, body: string): boolean {
  // プロモーションメールは除外
  if (PROMO_PATTERNS.some(pattern => pattern.test(subject))) {
    return false;
  }

  // 件名に請求関連キーワードがあるかチェック
  return BILLING_SUBJECT_KEYWORDS.some(pattern => pattern.test(subject));
}

// 金額を抽出（日本円として扱う）
function extractPrice(text: string): { price: number; currency: string } | null {
  const MIN_JPY = 50, MAX_JPY = 500000;

  // すべてのパターンから金額を抽出し、JPYとして返す
  for (const { pattern } of PRICE_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      for (const matchStr of matches) {
        const match = matchStr.match(pattern);
        if (match) {
          const price = parseFloat(match[1].replace(/,/g, ''));

          // 妥当な日本円の範囲内であればJPYとして返す
          if (price >= MIN_JPY && price <= MAX_JPY) {
            return { price: Math.round(price), currency: 'JPY' };
          }
        }
      }
    }
  }
  return null;
}

// 課金サイクルを抽出
function extractBillingCycle(text: string): BillingCycle | null {
  for (const { pattern, cycle } of BILLING_CYCLE_PATTERNS) {
    if (pattern.test(text)) return cycle;
  }
  return null;
}

// Apple領収書から課金情報を抽出（サブスクリプション + アプリ内課金）
interface ApplePurchase {
  name: string;          // アプリ名
  item: string | null;   // アイテム名（アプリ内課金の場合）
  category: Category;
  price: number | null;
  currency: string;
  purchaseType: 'subscription' | 'in_app_purchase' | 'purchase';
  billingCycle?: BillingCycle;
  nextBillingDate?: string | null;
}

function extractApplePurchases(subject: string, body: string): ApplePurchase[] {
  const purchases: ApplePurchase[] = [];

  // 1. 有効期限通知: 「サービス名（期間）¥金額／月」
  const expirationPattern = /([A-Za-z][A-Za-z0-9\s\-]+?)(?:（|[\(])(\d+か?[月年週])(?:）|[\)])\s*[¥￥]\s*([\d,]+)[／\/]([月年週])/g;
  let match;
  while ((match = expirationPattern.exec(body)) !== null) {
    const serviceName = match[1].trim();
    const period = match[2];
    const price = parseInt(match[3].replace(/,/g, ''), 10);
    const cycleChar = match[4];

    let billingCycle: BillingCycle = 'monthly';
    if (cycleChar === '年' || /年/.test(period)) billingCycle = 'yearly';
    if (cycleChar === '週' || /週/.test(period)) billingCycle = 'weekly';

    // 有効期限日を抽出
    const dateMatch = body.substring(match.index).match(/有効期限[はが]?\s*(\d{1,2})月(\d{1,2})日/);
    let nextBillingDate: string | null = null;
    if (dateMatch) {
      const now = new Date();
      const year = now.getFullYear();
      const month = parseInt(dateMatch[1], 10);
      nextBillingDate = `${year}-${month.toString().padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
    }

    purchases.push({
      name: serviceName,
      item: null,
      category: 'streaming',
      price,
      currency: 'JPY',
      purchaseType: 'subscription',
      billingCycle,
      nextBillingDate,
    });
  }

  // 2. Apple領収書フォーマットを解析
  // フォーマット:
  // アプリ名                                                                      ¥金額
  // アイテム名
  // アプリ内課金 または 更新：YYYY年M月D日
  // アカウント名

  const lines = body.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

  console.log(`[APPLE PARSE] Lines count: ${lines.length}`);

  // 無視するパターン
  const ignorePatterns = [
    /^App\s*Store$/i, /合計/, /^小計/, /APPLE\s*(ID|ACCOUNT)/i,
    /^請求先$/, /^日付/, /^ご注文番号/, /^書類番号/, /^PayPay/i,
    /クレジット/, /^-+$/, /^JCT/, /課税/, /Amex|Visa|JCB|Mastercard/i,
    /^\d{3}-\d{4}/, /^JPN$/, /@.*\.com/, /滋賀県|草津市|栗東市/,
  ];

  const isIgnored = (text: string) => ignorePatterns.some(p => p.test(text));

  // 方法1: 「問題を報告する ¥XXX」パターンを探して、前の行からアプリ名を取得
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 「問題を報告する ¥700」形式を検出
    const reportPriceMatch = line.match(/問題を報告.*?[¥￥]\s*([\d,]+)/);
    if (reportPriceMatch) {
      const price = parseInt(reportPriceMatch[1].replace(/,/g, ''), 10);
      if (price < 50 || price > 100000) continue;

      // 前の数行を遡ってアプリ名とアイテム名を探す
      let appName: string | null = null;
      let itemName: string | null = null;
      let purchaseType: 'subscription' | 'in_app_purchase' | 'purchase' = 'purchase';
      let billingCycle: BillingCycle | undefined;

      for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
        const prevLine = lines[j];
        if (isIgnored(prevLine)) continue;

        // 更新日/アプリ内課金の判定
        if (prevLine.includes('更新：') || prevLine.includes('(月額)') || prevLine.includes('（月額）')) {
          purchaseType = 'subscription';
          billingCycle = 'monthly';
          continue;
        }
        if (prevLine.includes('(年額)') || prevLine.includes('（年額）')) {
          purchaseType = 'subscription';
          billingCycle = 'yearly';
          continue;
        }
        if (prevLine === 'アプリ内課金' || prevLine === 'App 内課金') {
          purchaseType = 'in_app_purchase';
          continue;
        }

        // アイテム名（大文字英語、月額、Pass等を含む行）
        if (!itemName && /[A-Z]{2,}|月額|年額|Pass|Premium|Plus|Pro|Coin|パック|UPGRADE/i.test(prevLine)) {
          itemName = prevLine;
          continue;
        }

        // アプリ名（それ以外の有効な行）
        if (!appName && prevLine.length > 1 && prevLine.length < 50 && !prevLine.match(/^[¥￥\d]/)) {
          appName = prevLine;
          break;
        }
      }

      if (appName) {
        let category: Category = 'gaming';
        if (/YouTube|Netflix|Disney|Hulu|Prime|ARK/i.test(appName)) category = 'streaming';
        if (/Spotify|Music|AWA/i.test(appName)) category = 'music';
        if (/iCloud|Dropbox|Google/i.test(appName)) category = 'cloud';
        if (/Twitter|X\s/i.test(appName)) category = 'other';
        if (/Tinder|マッチング/i.test(appName)) category = 'other';

        console.log(`[APPLE PARSE] Found: ${appName} - ${itemName} - ¥${price}`);
        purchases.push({
          name: appName,
          item: itemName,
          category,
          price,
          currency: 'JPY',
          purchaseType,
          billingCycle,
        });
      }
    }
  }

  // 方法2: 従来の「アプリ名    ¥700」形式（同一行）
  const appPricePattern = /^(.+?)\s{2,}[¥￥]\s*([\d,]+)$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const priceMatch = line.match(appPricePattern);

    if (priceMatch && !isIgnored(priceMatch[1].trim())) {
      const appName = priceMatch[1].trim();
      const price = parseInt(priceMatch[2].replace(/,/g, ''), 10);

      // 既に同じアプリ・同じ金額で追加済みなら重複を避ける
      const isDuplicate = purchases.some(p => p.name === appName && p.price === price);
      if (isDuplicate) continue;

      if (price >= 50 && price <= 100000) {
        let itemName: string | null = null;
        let purchaseType: 'subscription' | 'in_app_purchase' | 'purchase' = 'purchase';
        let billingCycle: BillingCycle | undefined;

        // 次の数行をチェック
        for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
          const nextLine = lines[j];
          if (nextLine === 'アプリ内課金' || nextLine === 'App 内課金') {
            purchaseType = 'in_app_purchase';
          } else if (nextLine.includes('更新：') || nextLine.includes('(月額)')) {
            purchaseType = 'subscription';
            billingCycle = 'monthly';
          } else if (nextLine.includes('(年額)')) {
            purchaseType = 'subscription';
            billingCycle = 'yearly';
          } else if (!itemName && !nextLine.match(/^[¥￥]/) && !isIgnored(nextLine)) {
            itemName = nextLine;
          }
        }

        let category: Category = 'gaming';
        if (/YouTube|Netflix|Disney|Hulu|Prime|ARK/i.test(appName)) category = 'streaming';
        if (/Spotify|Music|AWA/i.test(appName)) category = 'music';
        if (/iCloud|Dropbox|Google/i.test(appName)) category = 'cloud';
        if (/Twitter|X\s/i.test(appName)) category = 'other';

        console.log(`[APPLE PARSE] Found (pattern2): ${appName} - ${itemName} - ¥${price}`);
        purchases.push({
          name: appName,
          item: itemName,
          category,
          price,
          currency: 'JPY',
          purchaseType,
          billingCycle,
        });
      }
    }
  }

  console.log(`[APPLE PARSE] Total purchases found: ${purchases.length}`);
  return purchases;
}

// サービスマッチング
interface MatchResult {
  service: ServicePattern;
  senderMatch: boolean;
  contentMatch: boolean;
  isAppStorePurchase?: boolean;
  purchaseType?: 'subscription' | 'in_app_purchase' | 'purchase';
  itemName?: string | null;
  extractedPrice?: number | null;
  extractedCurrency?: string;
  extractedBillingCycle?: BillingCycle;
  extractedNextBillingDate?: string | null;
}

function matchService(fromAddress: string, subject: string, body: string): MatchResult[] | null {
  const fromLower = fromAddress.toLowerCase();
  const fullText = `${subject} ${body}`;

  // ★ Apple領収書を最優先で処理（個別のアプリ課金を抽出するため）
  const isAppleEmail = /@(apple\.com|itunes\.com|email\.apple\.com)/i.test(fromLower) || /no_reply@.*apple/i.test(fromLower);
  const isAppleReceipt = /領収書|receipt/i.test(subject);

  if (isAppleEmail && isAppleReceipt) {
    const purchases = extractApplePurchases(subject, fullText);

    if (purchases.length > 0) {
      console.log(`[APPLE] Found ${purchases.length} purchase(s) from receipt`);
      return purchases.map(purchase => {
        // アイテム名がある場合は「アプリ名 - アイテム名」形式で表示名を作成
        const displayName = purchase.item
          ? `${purchase.name} - ${purchase.item}`
          : purchase.name;

        return {
          service: {
            pattern: new RegExp(purchase.name, 'i'),
            name: displayName,
            category: purchase.category,
            senderPatterns: [],
            subjectPatterns: []
          },
          senderMatch: true,
          contentMatch: true,
          isAppStorePurchase: true,
          purchaseType: purchase.purchaseType,
          itemName: purchase.item,
          extractedPrice: purchase.price,
          extractedCurrency: purchase.currency,
          extractedBillingCycle: purchase.billingCycle,
          extractedNextBillingDate: purchase.nextBillingDate,
        };
      });
    }
  }

  // Appleの有効期限通知・サブスクリプション確認
  if (isAppleEmail && /有効期限|サブスクリプション/i.test(subject)) {
    const purchases = extractApplePurchases(subject, fullText);
    if (purchases.length > 0) {
      console.log(`[APPLE] Found ${purchases.length} subscription(s) from notification`);
      return purchases.map(purchase => ({
        service: {
          pattern: new RegExp(purchase.name, 'i'),
          name: purchase.name,
          category: purchase.category,
          senderPatterns: [],
          subjectPatterns: []
        },
        senderMatch: true,
        contentMatch: true,
        isAppStorePurchase: true,
        purchaseType: purchase.purchaseType,
        itemName: purchase.item,
        extractedPrice: purchase.price,
        extractedCurrency: purchase.currency,
        extractedBillingCycle: purchase.billingCycle,
        extractedNextBillingDate: purchase.nextBillingDate,
      }));
    }
  }

  // 定義済みサービスをチェック（Apple以外）
  // ★ 送信者パターンがマッチした場合のみ検出（誤検出防止）
  for (const service of SERVICE_PATTERNS) {
    if (service.senderPatterns && service.subjectPatterns) {
      // Appleメールはスキップ（上で処理済み）
      if (isAppleEmail) continue;

      const senderMatch = service.senderPatterns.some(p => p.test(fromLower));
      if (!senderMatch) continue; // 送信者がマッチしない場合はスキップ

      const contentMatch = service.subjectPatterns.some(p => p.test(fullText));
      if (contentMatch || isBillingEmail(subject, fullText)) {
        return [{ service, senderMatch, contentMatch }];
      }
    }
  }

  // ★ 一般的なパターンマッチングは無効化（誤検出が多いため）
  // 送信者パターンがない場合は検出しない

  return null;
}

// OpenAI APIで金額を抽出
async function extractPriceWithAI(emailContent: string, serviceName: string): Promise<{ price: number; currency: string; billingCycle: BillingCycle | null } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(`[AI] No API key for ${serviceName}`);
    return null;
  }

  console.log(`[AI] Extracting price for ${serviceName}, content length: ${emailContent.length}`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting subscription payment information from emails.
Your task is to find the subscription price for "${serviceName}".

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "price": <number or null>,
  "currency": "<JPY or USD or null>",
  "billingCycle": "<monthly or yearly or weekly or null>"
}

IMPORTANT Rules:
- price should be a number without currency symbols or commas (e.g., 1280 not ¥1,280)
- Look for ANY price mentioned that could be a subscription fee
- Common subscription prices:
  - YouTube Premium: around ¥1,280/month or $13.99/month
  - iCloud+: ¥130-¥1,300/month or $0.99-$9.99/month
  - Slack: varies by plan
  - Claude Pro: $20/month
  - Notion: $8-$10/month or ¥1,000-¥1,500/month
- For Japanese emails: look for 円, ¥, ￥, JPY, 税込, 合計, 請求
- For English emails: look for $, USD, total, amount, charged
- If multiple prices found, prefer the one that looks like a subscription total
- Even if the email doesn't explicitly say "subscription", extract any price found`
          },
          {
            role: 'user',
            content: `Extract the subscription price for "${serviceName}" from this email content:\n\n${emailContent.substring(0, 4000)}`
          }
        ],
        temperature: 0,
        max_tokens: 150,
      }),
    });

    const data = await response.json() as { choices?: { message?: { content?: string } }[]; error?: unknown };
    console.log(`[AI] Response for ${serviceName}:`, JSON.stringify(data.choices?.[0]?.message?.content || data.error));

    if (data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content.trim();
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(jsonStr);
      console.log(`[AI] Parsed result for ${serviceName}:`, result);
      if (result.price !== null && result.price > 0) {
        return {
          price: result.price,
          currency: result.currency || 'JPY',
          billingCycle: result.billingCycle || null,
        };
      }
    }
  } catch (error: any) {
    console.error(`[AI] Error for ${serviceName}:`, error.message);
  }
  return null;
}

// サブスク関連の送信者アドレス（IMAP検索用）
const SUBSCRIPTION_SENDERS = [
  // Apple
  'no_reply@email.apple.com',
  'noreply@email.apple.com',
  'appleid@id.apple.com',
  'noreply@apple.com',
  // Google / YouTube
  'noreply@youtube.com',
  'googleplay-noreply@google.com',
  'payments-noreply@google.com',
  // Amazon
  'auto-confirm@amazon.co.jp',
  'auto-confirm@amazon.com',
  'digital-no-reply@amazon.co.jp',
  'digital-no-reply@amazon.com',
  'store-news@amazon.co.jp',
  // Netflix
  'info@mailer.netflix.com',
  'info@account.netflix.com',
  // Spotify
  'no-reply@spotify.com',
  // Disney+
  'disneyplus@mail.disneyplus.com',
  // Adobe
  'mail@mail.adobe.com',
  'adobeid@adobesystems.com',
  // Microsoft
  'microsoft@email.microsoft.com',
  'msa@communication.microsoft.com',
  // Notion
  'notify@mail.notion.so',
  // Slack
  'feedback@slack.com',
  // GitHub
  'noreply@github.com',
  // OpenAI / ChatGPT
  'noreply@openai.com',
  'noreply@tm.openai.com',
  // Anthropic / Claude
  'noreply@anthropic.com',
  // Dropbox
  'no-reply@dropbox.com',
  // PlayStation
  'reply@txn-email.playstation.com',
  'Sony@email.sonyentertainmentnetwork.com',
  // Nintendo
  'no-reply@accounts.nintendo.com',
  // Hulu
  'huluinfo@hulumail.jp',
  // U-NEXT
  'unext-info@unext-info.jp',
  // Zoom
  'no-reply@zoom.us',
];

// 送信者ドメイン（部分一致検索用）
const SUBSCRIPTION_DOMAINS = [
  'apple.com',
  'itunes.com',
  'netflix.com',
  'spotify.com',
  'amazon.co.jp',
  'amazon.com',
  'google.com',
  'youtube.com',
  'microsoft.com',
  'adobe.com',
  'notion.so',
  'slack.com',
  'github.com',
  'openai.com',
  'anthropic.com',
  'dropbox.com',
  'playstation.com',
  'nintendo.com',
  'zoom.us',
  'hulu.jp',
  'disneyplus.com',
];

// メイン処理
async function fetchEmails(email: string, appPassword: string, _maxResults: number = 500): Promise<{
  success: boolean;
  subscriptions: DetectedSubscription[];
  totalFound: number;
  scannedEmails: number;
  debug?: { servicesNeedingAI: string[]; aiExtractionResults: unknown[] };
}> {
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });

  await client.connect();

  const detected = new Map<string, Omit<DetectedSubscription, 'paymentHistory' | 'totalPaid' | 'paymentCount' | 'subItems'>>();
  const paymentHistories = new Map<string, PaymentRecord[]>();
  const purchaseTypes = new Map<string, 'subscription' | 'in_app_purchase' | 'purchase'>(); // 課金タイプを追跡
  const emailContents = new Map<string, { content: string; isBilling: boolean }>();
  let totalScanned = 0;

  // INBOXのみスキャン（高速化）
  const foldersToScan = ['INBOX'];

  for (const folderName of foldersToScan) {
    let lock;
    try {
      lock = await client.getMailboxLock(folderName);
    } catch (e) {
      console.log(`Folder "${folderName}" not found, skipping`);
      continue;
    }

    try {
      const mailbox = client.mailbox;
      if (!mailbox || mailbox.exists === 0) {
        lock.release();
        continue;
      }

      console.log(`\n[SCAN] Folder: ${folderName} (${mailbox.exists} emails)`);

      // 高速化: 重要な送信者のみに絞って検索
      const matchingUids = new Set<number>();

      // 優先度の高い送信者（Apple, Netflix, Spotify等の主要サービス）
      const prioritySenders = [
        'no_reply@email.apple.com',  // Apple領収書
        'appleid@id.apple.com',
        'info@mailer.netflix.com',
        'no-reply@spotify.com',
        'noreply@youtube.com',
        'payments-noreply@google.com',
      ];

      for (const sender of prioritySenders) {
        try {
          const result = await client.search({ from: sender }, { uid: true });
          if (result && Array.isArray(result) && result.length > 0) {
            result.forEach(uid => matchingUids.add(uid));
            console.log(`  [SEARCH] ${sender}: ${result.length} emails`);
          }
        } catch (e) {
          // 検索エラーは無視
        }
      }

      // 件名で領収書を検索（高速）
      try {
        const result = await client.search({ subject: '領収書' }, { uid: true });
        if (result && Array.isArray(result) && result.length > 0) {
          result.forEach(uid => matchingUids.add(uid));
          console.log(`  [SEARCH] Subject "領収書": ${result.length} emails`);
        }
      } catch (e) {}

      console.log(`  [TOTAL] ${matchingUids.size} unique emails to process in ${folderName}`);

      if (matchingUids.size === 0) {
        lock.release();
        continue;
      }

      // マッチしたメールを処理
      const uidArray = Array.from(matchingUids);
      const uidRanges = uidArray.join(',');

      for await (const msg of client.fetch(uidRanges, { source: true }, { uid: true })) {
        if (!msg.source) continue;
        totalScanned++;

        const parsed: ParsedMail = await simpleParser(msg.source);
        const subject = parsed.subject || '';
        const fromAddress = parsed.from?.value?.[0]?.address || '';
        const fromText = parsed.from?.text || '';
        const body = parsed.text || '';
        const htmlBody = parsed.html || '';
        const fullText = `${subject} ${body} ${htmlBody}`;
        const emailDate = parsed.date || new Date();

        const matchResults = matchService(fromAddress, subject, fullText);
        if (!matchResults) continue;

        const isBilling = isBillingEmail(subject, fullText);
        const htmlText = stripHtml(htmlBody);
        const currentContent = `Subject: ${subject}\nFrom: ${fromText}\n\n--- Plain Text ---\n${body}\n\n--- HTML Content ---\n${htmlText}`;

        for (const matchResult of matchResults) {
          const { service, senderMatch, contentMatch, purchaseType, itemName, extractedPrice, extractedCurrency, extractedBillingCycle, extractedNextBillingDate } = matchResult;

          let priceInfo = extractedPrice != null ? { price: extractedPrice, currency: extractedCurrency || 'JPY' } : extractPrice(fullText);
          let billingCycle = extractedBillingCycle || extractBillingCycle(fullText);

          console.log(`[DETECTED] ${service.name}`);
          console.log(`  From: ${fromAddress}`);
          console.log(`  Subject: ${subject.substring(0, 80)}`);
          console.log(`  Date: ${emailDate.toISOString()}`);
          console.log(`  Is Billing Email: ${isBilling}`);
          if (purchaseType) {
            console.log(`  Purchase Type: ${purchaseType}`);
          }
          if (itemName) {
            console.log(`  Item: ${itemName}`);
          }
          if (priceInfo) {
            console.log(`  ✓ Price Found: ${priceInfo.price} ${priceInfo.currency} (${extractedPrice != null ? 'Apple Receipt' : 'Pattern Matching'})`);
          }
          if (billingCycle) {
            console.log(`  ✓ Billing Cycle: ${billingCycle}`);
          }
          if (extractedNextBillingDate) {
            console.log(`  ✓ Next Billing: ${extractedNextBillingDate}`);
          }

          let confidence = 0.2;
          if (senderMatch) confidence += 0.2;
          if (contentMatch) confidence += 0.1;
          if (isBilling) confidence += 0.3;
          if (priceInfo) confidence += 0.15;
          if (billingCycle) confidence += 0.05;

          // 請求メールで金額が見つかった場合は支払い履歴に追加
          if (isBilling && priceInfo) {
            if (!paymentHistories.has(service.name)) paymentHistories.set(service.name, []);
            paymentHistories.get(service.name)!.push({
              date: emailDate.toISOString(),
              price: priceInfo.price,
              currency: priceInfo.currency,
              subject: subject.substring(0, 100),
            });
            console.log(`[PAYMENT] Added to history: ${service.name} - ${priceInfo.price} ${priceInfo.currency} on ${emailDate.toISOString().split('T')[0]}`);
          }

          // 課金タイプを保存（サブスクリプションを優先）
          if (purchaseType) {
            const existingType = purchaseTypes.get(service.name);
            // サブスクリプションは他のタイプより優先
            if (!existingType || purchaseType === 'subscription') {
              purchaseTypes.set(service.name, purchaseType);
            }
          }

          // メール内容を保存（AI抽出用）
          const existingContent = emailContents.get(service.name);
          if (!existingContent ||
              (isBilling && !existingContent.isBilling) ||
              (isBilling === existingContent.isBilling && currentContent.length > existingContent.content.length)) {
            emailContents.set(service.name, { content: currentContent, isBilling });
          }

          // サブスク情報を更新
          const existing = detected.get(service.name);
          const shouldUpdate = !existing ||
            (isBilling && !existing.isBilling) ||
            (isBilling === existing.isBilling && confidence > existing.confidence);

          if (shouldUpdate) {
            // タイプを判定: サブスクリプションか単発課金か
            const detectedType: DetectionType =
              purchaseType === 'subscription' || billingCycle ? 'subscription' : 'payment';

            detected.set(service.name, {
              name: service.name,
              category: service.category,
              price: (isBilling && priceInfo) ? priceInfo.price : (existing?.price ?? null),
              currency: (isBilling && priceInfo) ? priceInfo.currency : (existing?.currency ?? 'JPY'),
              billingCycle: billingCycle ?? existing?.billingCycle ?? null,
              nextBillingDate: extractedNextBillingDate ?? existing?.nextBillingDate ?? null,
              email: fromText,
              detectedDate: emailDate.toISOString(),
              confidence,
              priceDetected: !!(isBilling && priceInfo),
              isBilling,
              type: detectedType,
            });
          }
        }
      }
    } finally {
      lock.release();
    }
  }

  await client.logout();

  // AI抽出は無効化（高速化のため）
  const aiExtractionResults: unknown[] = [];
  const servicesNeedingAI: string[] = [];
  console.log('\n=== AI Extraction Disabled for Speed ===\n');

  // 同じアプリの課金を統合
  const getBaseName = (name: string) => {
    let base = name.split(' - ')[0].trim();

    // 正規化: 似た名前を統一
    if (/^Tinder/i.test(base)) return 'Tinder';
    if (/^YouTube/i.test(base)) return 'YouTube';
    if (/^LINE\b/i.test(base)) return 'LINE';
    if (/^Spotify/i.test(base)) return 'Spotify';
    if (/クラッシュ・オブ・クラン|Clash of Clans/i.test(base)) return 'クラッシュ・オブ・クラン';
    if (/クラッシュ・ロワイヤル|Clash Royale/i.test(base)) return 'クラッシュ・ロワイヤル';

    return base;
  };

  // アプリ名ごとにグループ化
  const appGroups = new Map<string, {
    items: Map<string, SubItemPurchase[]>;  // アイテム名 -> 購入履歴
    category: Category;
    currency: string;
    isSubscription: boolean;  // サブスクリプションかどうか
    billingCycle: BillingCycle | null;
    email: string;
    latestDate: string;
    paymentHistory: PaymentRecord[];
  }>();

  for (const [name, sub] of detected.entries()) {
    const baseName = getBaseName(name);
    const itemName = name.includes(' - ') ? name.split(' - ').slice(1).join(' - ') : null;
    const history = paymentHistories.get(name) || [];

    // 課金タイプを取得（サブスクリプションかどうか）
    const pType = purchaseTypes.get(name);
    const isSubscription = sub.type === 'subscription' || pType === 'subscription' || !!sub.billingCycle;

    if (!appGroups.has(baseName)) {
      appGroups.set(baseName, {
        items: new Map(),
        category: sub.category,
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        email: sub.email,
        latestDate: sub.detectedDate,
        paymentHistory: [],
        isSubscription: isSubscription,
      });
    }

    const group = appGroups.get(baseName)!;

    // サブスクリプションが1つでもあれば全体をサブスクとして扱う
    if (isSubscription) {
      group.isSubscription = true;
    }

    // アイテム別の購入履歴を追加
    if (itemName && history.length > 0) {
      if (!group.items.has(itemName)) {
        group.items.set(itemName, []);
      }
      const itemPurchases = group.items.get(itemName)!;
      for (const h of history) {
        itemPurchases.push({
          date: h.date,
          price: h.price,
        });
      }
    }

    group.paymentHistory.push(...history);
    if (sub.detectedDate > group.latestDate) {
      group.latestDate = sub.detectedDate;
    }
  }

  // 統合結果を作成
  const results: DetectedSubscription[] = [];
  for (const [baseName, group] of appGroups.entries()) {
    // 支払い履歴を日付順にソート
    group.paymentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalPaid = group.paymentHistory.reduce((sum, h) => sum + h.price, 0);

    // サブアイテムを構築（購入日の新しい順にソート）
    const subItems: SubItem[] = Array.from(group.items.entries())
      .map(([name, purchases]) => {
        // 購入履歴を日付の新しい順にソート
        const sortedPurchases = [...purchases].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return {
          name,
          currency: group.currency,
          purchases: sortedPurchases,
          totalPaid: purchases.reduce((sum, p) => sum + p.price, 0),
        };
      })
      .sort((a, b) => b.totalPaid - a.totalPaid); // 累計金額の高い順

    results.push({
      name: baseName,  // シンプルなアプリ名のみ
      category: group.category,
      // 最新の支払い金額を表示（履歴は古い順なので最後の要素）
      price: group.paymentHistory.length > 0 ? group.paymentHistory[group.paymentHistory.length - 1].price : null,
      currency: group.currency,
      billingCycle: group.billingCycle,
      nextBillingDate: null,
      email: group.email,
      detectedDate: group.latestDate,
      confidence: 1,
      priceDetected: totalPaid > 0,
      isBilling: true,
      paymentHistory: group.paymentHistory,
      totalPaid,
      paymentCount: group.paymentHistory.length,
      subItems: subItems.length > 0 ? subItems : undefined,
      type: group.isSubscription ? 'subscription' : 'payment',
    });
  }

  // アプリ名でソート
  results.sort((a, b) => {
    const baseA = a.name.split(' (')[0].trim();
    const baseB = b.name.split(' (')[0].trim();
    return baseA.localeCompare(baseB, 'ja');
  });

  // 最終結果のサマリーログ
  console.log('\n=== Final Results Summary ===');
  results.forEach(sub => {
    const priceStr = sub.price !== null ? `${sub.price} ${sub.currency}` : '金額不明';
    const source = sub.extractedByAI ? 'AI' : (sub.priceDetected ? 'Pattern' : 'N/A');
    const historyCount = sub.paymentHistory?.length || 0;
    console.log(`${sub.name}: ${priceStr} [Source: ${source}] [History: ${historyCount}件]`);
  });
  console.log('=============================\n');

  return {
    success: true,
    subscriptions: results,
    totalFound: results.length,
    scannedEmails: totalScanned,
    debug: {
      servicesNeedingAI,
      aiExtractionResults,
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parseResult.error.issues,
    });
  }

  const { email, appPassword, maxResults } = parseResult.data;

  try {
    const result = await fetchEmails(email, appPassword, maxResults);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('iCloud fetch error:', error);

    let errorMessage = 'Failed to fetch emails';
    if (error.authenticationFailed) {
      errorMessage = 'Authentication failed. Please check your email and app-specific password.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Could not connect to iCloud mail server.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out.';
    }

    return res.status(error.authenticationFailed ? 401 : 500).json({
      success: false,
      error: errorMessage,
    });
  }
}
