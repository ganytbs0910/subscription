import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImapFlow, FetchMessageObject } from 'imapflow';
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

interface DetectedSubscription {
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
}

const SERVICE_PATTERNS: ServicePattern[] = [
  // Streaming
  { pattern: /netflix/i, name: 'Netflix', category: 'streaming' },
  { pattern: /disney\+|disneyplus/i, name: 'Disney+', category: 'streaming' },
  { pattern: /hulu/i, name: 'Hulu', category: 'streaming' },
  { pattern: /amazon\s*prime\s*video|prime\s*video/i, name: 'Amazon Prime Video', category: 'streaming' },
  { pattern: /u-next|unext/i, name: 'U-NEXT', category: 'streaming' },
  { pattern: /abema/i, name: 'ABEMA', category: 'streaming' },
  { pattern: /dazn/i, name: 'DAZN', category: 'streaming' },
  { pattern: /crunchyroll/i, name: 'Crunchyroll', category: 'streaming' },
  { pattern: /hbo\s*max/i, name: 'HBO Max', category: 'streaming' },
  { pattern: /paramount\+|paramountplus/i, name: 'Paramount+', category: 'streaming' },
  { pattern: /youtube\s*premium/i, name: 'YouTube Premium', category: 'streaming' },
  { pattern: /apple\s*tv\+?/i, name: 'Apple TV+', category: 'streaming' },

  // Music
  { pattern: /spotify/i, name: 'Spotify', category: 'music' },
  { pattern: /apple\s*music/i, name: 'Apple Music', category: 'music' },
  { pattern: /youtube\s*music/i, name: 'YouTube Music', category: 'music' },
  { pattern: /amazon\s*music/i, name: 'Amazon Music', category: 'music' },
  { pattern: /line\s*music/i, name: 'LINE MUSIC', category: 'music' },
  { pattern: /awa\s/i, name: 'AWA', category: 'music' },
  { pattern: /tidal/i, name: 'TIDAL', category: 'music' },
  { pattern: /deezer/i, name: 'Deezer', category: 'music' },

  // Productivity
  { pattern: /notion/i, name: 'Notion', category: 'productivity' },
  { pattern: /slack/i, name: 'Slack', category: 'productivity' },
  { pattern: /zoom/i, name: 'Zoom', category: 'productivity' },
  { pattern: /microsoft\s*365|office\s*365/i, name: 'Microsoft 365', category: 'productivity' },
  { pattern: /evernote/i, name: 'Evernote', category: 'productivity' },
  { pattern: /todoist/i, name: 'Todoist', category: 'productivity' },
  { pattern: /1password|one\s*password/i, name: '1Password', category: 'productivity' },
  { pattern: /lastpass/i, name: 'LastPass', category: 'productivity' },
  { pattern: /grammarly/i, name: 'Grammarly', category: 'productivity' },
  { pattern: /canva/i, name: 'Canva', category: 'productivity' },

  // Cloud
  { pattern: /dropbox/i, name: 'Dropbox', category: 'cloud' },
  { pattern: /google\s*(one|drive|storage)/i, name: 'Google One', category: 'cloud' },
  { pattern: /icloud/i, name: 'iCloud+', category: 'cloud' },
  { pattern: /onedrive/i, name: 'OneDrive', category: 'cloud' },
  { pattern: /box\.com|box\s*storage/i, name: 'Box', category: 'cloud' },

  // Gaming
  { pattern: /playstation\s*(plus|now)|ps\s*plus/i, name: 'PlayStation Plus', category: 'gaming' },
  { pattern: /xbox\s*game\s*pass/i, name: 'Xbox Game Pass', category: 'gaming' },
  { pattern: /nintendo\s*(switch\s*)?online/i, name: 'Nintendo Switch Online', category: 'gaming' },
  { pattern: /ea\s*play/i, name: 'EA Play', category: 'gaming' },
  { pattern: /apple\s*arcade/i, name: 'Apple Arcade', category: 'gaming' },
  { pattern: /geforce\s*now/i, name: 'GeForce NOW', category: 'gaming' },

  // News / Media
  { pattern: /nikkei|日経/i, name: '日経電子版', category: 'news' },
  { pattern: /new\s*york\s*times|nytimes/i, name: 'New York Times', category: 'news' },
  { pattern: /washington\s*post/i, name: 'Washington Post', category: 'news' },
  { pattern: /wall\s*street\s*journal|wsj/i, name: 'Wall Street Journal', category: 'news' },
  { pattern: /medium/i, name: 'Medium', category: 'news' },

  // Fitness
  { pattern: /apple\s*fitness\+?/i, name: 'Apple Fitness+', category: 'fitness' },
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
  { pattern: /adobe|creative\s*cloud/i, name: 'Adobe Creative Cloud', category: 'other' },
  { pattern: /figma/i, name: 'Figma', category: 'other' },
  { pattern: /sketch/i, name: 'Sketch', category: 'other' },
  { pattern: /github/i, name: 'GitHub', category: 'other' },
  { pattern: /gitlab/i, name: 'GitLab', category: 'other' },
  { pattern: /chatgpt|openai/i, name: 'ChatGPT Plus', category: 'other' },
  { pattern: /claude\s*(pro)?/i, name: 'Claude Pro', category: 'other' },
  { pattern: /amazon\s*prime(?!\s*video)/i, name: 'Amazon Prime', category: 'other' },
  { pattern: /apple\s*one/i, name: 'Apple One', category: 'other' },
];

const PRICE_PATTERNS = [
  { pattern: /[¥￥]\s*([\d,]+)/, currency: 'JPY' },
  { pattern: /([\d,]+)\s*円/, currency: 'JPY' },
  { pattern: /JPY\s*([\d,]+)/, currency: 'JPY' },
  { pattern: /\$\s*([\d.]+)/, currency: 'USD' },
  { pattern: /USD\s*([\d.]+)/, currency: 'USD' },
  { pattern: /€\s*([\d.,]+)/, currency: 'EUR' },
  { pattern: /EUR\s*([\d.,]+)/, currency: 'EUR' },
];

const BILLING_CYCLE_PATTERNS: { pattern: RegExp; cycle: BillingCycle }[] = [
  { pattern: /月額|monthly|per\s*month|\/month|毎月/i, cycle: 'monthly' },
  { pattern: /年額|yearly|annual|per\s*year|\/year|毎年/i, cycle: 'yearly' },
  { pattern: /週額|weekly|per\s*week|\/week|毎週/i, cycle: 'weekly' },
  { pattern: /四半期|quarterly|3\s*month/i, cycle: 'quarterly' },
];

function extractPrice(text: string): { price: number; currency: string } | null {
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
}

function extractBillingCycle(text: string): BillingCycle | null {
  for (const { pattern, cycle } of BILLING_CYCLE_PATTERNS) {
    if (pattern.test(text)) {
      return cycle;
    }
  }
  return null;
}

// Apple領収書かどうかを判定
function isAppleReceipt(from: string, subject: string): boolean {
  const isFromApple = /no_reply@email\.apple\.com/i.test(from);
  const isReceipt = /領収書|receipt/i.test(subject);
  return isFromApple && isReceipt;
}

// Apple領収書から複数のアプリ課金を抽出
interface AppleAppPurchase {
  appName: string;
  itemName: string;
  price: number;
  isSubscription: boolean;
}

function parseAppleReceipt(body: string): AppleAppPurchase[] {
  const purchases: AppleAppPurchase[] = [];

  // HTMLタグを除去してテキスト化
  const text = body
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#165;/g, '¥')
    .replace(/&yen;/g, '¥')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  console.log(`[parseAppleReceipt] Processing ${lines.length} lines`);

  let currentApp = '';
  let currentItem = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 金額行を検出 (¥XXX または 「問題を報告する ¥XXX」形式)
    let priceMatch = line.match(/[¥￥]\s*([\d,]+)/);

    if (priceMatch && currentApp) {
      const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);

      // 税金行や小計行は除外
      if (/JCT|税|小計|合計|を含む/i.test(line)) {
        continue;
      }

      if (price > 0 && price < 50000) { // 妥当な範囲（50000円未満）
        const contextText = `${currentApp} ${currentItem}`;
        const isSubscription = /月額|年額|Pass|Premium|Plus|Pro|subscription|monthly|yearly/i.test(contextText);

        console.log(`[parseAppleReceipt] Found: ${currentApp} - ¥${price}`);

        purchases.push({
          appName: currentApp,
          itemName: currentItem,
          price,
          isSubscription,
        });

        currentApp = '';
        currentItem = '';
      }
      continue;
    }

    // 除外パターン
    if (/^(日付|ご注文番号|書類番号|請求先|更新|APPLE|Amex|Visa|JCB|Mastercard|\d{4}年|@|JPN|問題を報告)/i.test(line)) {
      continue;
    }

    // アプリ名/アイテム名の候補
    if (line.length > 1 && line.length < 100) {
      // アイテム名っぽい行（大文字英語や「月額」「アプリ内課金」を含む）
      if (/[A-Z]{2,}|月額|年額|アプリ内課金|Pass|Premium|Plus|Pro|Upgrade/i.test(line)) {
        currentItem = line;
      } else if (!currentApp || currentItem) {
        // 新しいアプリ名
        currentApp = line;
        currentItem = '';
      }
    }
  }

  return purchases;
}

function parseEmailForSubscription(
  subject: string,
  from: string,
  body: string,
  date: Date,
): DetectedSubscription | null {
  const fullText = `${subject} ${from} ${body}`;

  for (const service of SERVICE_PATTERNS) {
    if (service.pattern.test(fullText)) {
      const priceInfo = extractPrice(fullText);
      const billingCycle = extractBillingCycle(fullText);

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
        detectedDate: date.toISOString(),
        confidence,
      };
    }
  }

  return null;
}

// 1つのメールから複数の課金を抽出
function parseEmailForSubscriptions(
  subject: string,
  from: string,
  body: string,
  date: Date,
): DetectedSubscription[] {
  const results: DetectedSubscription[] = [];

  // Apple領収書の場合は専用パーサーを使用
  if (isAppleReceipt(from, subject)) {
    console.log(`[iCloud] Apple receipt detected: ${subject}`);
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

      const billingCycle = purchase.isSubscription ? 'monthly' as BillingCycle : null;

      results.push({
        name: serviceName,
        category,
        price: purchase.price,
        currency: 'JPY',
        billingCycle,
        email: from,
        detectedDate: date.toISOString(),
        confidence: 0.85,
      });
    }

    if (results.length > 0) {
      return results;
    }
  }

  // 通常のパース
  const single = parseEmailForSubscription(subject, from, body, date);
  if (single) {
    results.push(single);
  }

  return results;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parseResult.error.errors,
    });
  }

  const { email, appPassword, maxResults } = parseResult.data;

  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
  });

  try {
    await client.connect();

    const mailbox = await client.getMailboxLock('INBOX');
    const detected: DetectedSubscription[] = [];
    const seenServices = new Set<string>();

    try {
      // 課金メールを送る主要な送信者で検索
      const senderSearchQuery = {
        or: [
          { from: 'no_reply@email.apple.com' },      // Apple
          { from: 'noreply@youtube.com' },           // YouTube
          { from: 'googleplay-noreply@google.com' }, // Google Play
          { from: 'auto-confirm@amazon' },           // Amazon
          { from: 'digital-no-reply@amazon' },       // Amazon Digital
        ],
      };

      // 件名での検索（バックアップ）
      const subjectSearchQuery = {
        or: [
          { subject: 'receipt' },
          { subject: 'invoice' },
          { subject: '領収' },
          { subject: '請求' },
        ],
      };

      const messages: number[] = [];
      const seenUids = new Set<number>();

      // 1. まず送信者で検索（課金メールの送信者）
      console.log('[iCloud] Searching by sender...');
      try {
        for await (const msg of client.fetch(senderSearchQuery, { uid: true })) {
          if (!seenUids.has(msg.uid)) {
            seenUids.add(msg.uid);
            messages.push(msg.uid);
          }
          if (messages.length >= maxResults) break;
        }
      } catch (e) {
        console.log('[iCloud] Sender search failed, trying subject search');
      }

      console.log(`[iCloud] Found ${messages.length} emails by sender`);

      // 2. 件名で追加検索
      if (messages.length < maxResults) {
        try {
          for await (const msg of client.fetch(subjectSearchQuery, { uid: true })) {
            if (!seenUids.has(msg.uid)) {
              seenUids.add(msg.uid);
              messages.push(msg.uid);
            }
            if (messages.length >= maxResults) break;
          }
        } catch (e) {
          console.log('[iCloud] Subject search failed');
        }
      }

      console.log(`[iCloud] Total emails to process: ${messages.length}`);

      // Fetch full message content
      for (const uid of messages.slice(0, maxResults)) {
        try {
          const msg = await client.fetchOne(uid.toString(), {
            source: true,
          }, { uid: true });

          if (msg?.source) {
            const parsed: ParsedMail = await simpleParser(msg.source);

            const subject = parsed.subject || '';
            const from = typeof parsed.from?.text === 'string' ? parsed.from.text : '';
            const body = parsed.text || parsed.html?.replace(/<[^>]*>/g, ' ') || '';
            const date = parsed.date || new Date();

            console.log(`[iCloud] Processing: ${subject.substring(0, 50)} from ${from.substring(0, 30)}`);

            // 複数の課金を抽出（Apple領収書対応）
            const subscriptions = parseEmailForSubscriptions(subject, from, body, date);

            for (const subscription of subscriptions) {
              if (!seenServices.has(subscription.name)) {
                seenServices.add(subscription.name);
                detected.push(subscription);
                console.log(`[iCloud] Detected: ${subscription.name} - ${subscription.price} ${subscription.currency}`);
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing message:', parseError);
        }
      }
    } finally {
      mailbox.release();
    }

    await client.logout();

    // Sort by confidence
    detected.sort((a, b) => b.confidence - a.confidence);

    return res.status(200).json({
      success: true,
      subscriptions: detected,
      totalFound: detected.length,
    });
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

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
