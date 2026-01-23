import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImapFlow, FetchMessageObject } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
  appPassword: z.string().min(1),
  maxResults: z.number().min(1).max(100).optional().default(50),
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
      // Search for subscription-related emails
      const searchQuery = {
        or: [
          { subject: 'receipt' },
          { subject: 'invoice' },
          { subject: '領収' },
          { subject: '請求' },
          { subject: 'subscription' },
          { subject: 'サブスクリプション' },
          { subject: '月額' },
          { subject: '年額' },
          { subject: 'renewal' },
          { subject: '更新' },
        ],
      };

      const messages: number[] = [];
      for await (const msg of client.fetch(searchQuery, { uid: true })) {
        messages.push(msg.uid);
        if (messages.length >= maxResults) break;
      }

      // If no search results, fetch recent messages
      if (messages.length === 0) {
        const range = `${Math.max(1, client.mailbox?.exists || 1 - maxResults)}:*`;
        for await (const msg of client.fetch(range, { uid: true })) {
          messages.push(msg.uid);
          if (messages.length >= maxResults) break;
        }
      }

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

            const subscription = parseEmailForSubscription(subject, from, body, date);

            if (subscription && !seenServices.has(subscription.name)) {
              seenServices.add(subscription.name);
              detected.push(subscription);
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
