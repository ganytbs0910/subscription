const http = require('http');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const PORT = 3000;

// サービス定義: 送信者アドレスパターン、サービス名のパターン
const SERVICES = [
  {
    name: 'Netflix',
    category: 'streaming',
    senderPatterns: [/@netflix\.com/i, /netflix/i],
    subjectPatterns: [/netflix/i],
  },
  {
    name: 'Disney+',
    category: 'streaming',
    senderPatterns: [/@disney/i, /@disneyplus/i],
    subjectPatterns: [/disney\+|disneyplus/i],
  },
  {
    name: 'Spotify',
    category: 'music',
    senderPatterns: [/@spotify\.com/i, /spotify/i],
    subjectPatterns: [/spotify/i],
  },
  {
    name: 'Apple Music',
    category: 'music',
    senderPatterns: [/@apple\.com/i, /@itunes\.com/i],
    subjectPatterns: [/apple\s*music/i],
  },
  {
    name: 'Apple One',
    category: 'other',
    senderPatterns: [/@apple\.com/i, /@itunes\.com/i],
    subjectPatterns: [/apple\s*one/i],
  },
  {
    name: 'iCloud+',
    category: 'cloud',
    senderPatterns: [/@apple\.com/i, /@itunes\.com/i, /@email\.apple\.com/i],
    subjectPatterns: [/icloud\+|icloud\s*ストレージ|icloud\s*storage|icloud.*(?:領収|receipt|invoice|請求|支払|renewed)/i],
  },
  {
    name: 'YouTube Premium',
    category: 'streaming',
    senderPatterns: [/@youtube\.com/i, /@google\.com/i],
    subjectPatterns: [/youtube\s*premium/i],
  },
  {
    name: 'Amazon Prime',
    category: 'other',
    senderPatterns: [/@amazon\.(com|co\.jp)/i],
    subjectPatterns: [/amazon\s*prime|プライム会員/i],
  },
  {
    name: 'Hulu',
    category: 'streaming',
    senderPatterns: [/@hulu\.(com|jp)/i],
    subjectPatterns: [/hulu/i],
  },
  {
    name: 'Notion',
    category: 'productivity',
    senderPatterns: [/@notion\.so/i, /@makenotion\.com/i],
    subjectPatterns: [/notion/i],
  },
  {
    name: 'Slack',
    category: 'productivity',
    senderPatterns: [/@slack\.com/i],
    subjectPatterns: [/slack/i],
  },
  {
    name: 'Zoom',
    category: 'productivity',
    senderPatterns: [/@zoom\.(us|com)/i],
    subjectPatterns: [/zoom\s*(pro|business|enterprise|領収|invoice|receipt|請求)/i],
  },
  {
    name: 'Dropbox',
    category: 'cloud',
    senderPatterns: [/@dropbox\.com/i],
    subjectPatterns: [/dropbox/i],
  },
  {
    name: 'GitHub',
    category: 'other',
    senderPatterns: [/@github\.com/i],
    subjectPatterns: [/github\s*(pro|team|enterprise|receipt|invoice|領収|請求)/i],
  },
  {
    name: 'Adobe Creative Cloud',
    category: 'other',
    senderPatterns: [/@adobe\.com/i],
    subjectPatterns: [/adobe|creative\s*cloud/i],
  },
  {
    name: 'ChatGPT Plus',
    category: 'other',
    senderPatterns: [/@openai\.com/i],
    subjectPatterns: [/chatgpt|openai/i],
  },
  {
    name: 'Microsoft 365',
    category: 'productivity',
    senderPatterns: [/@microsoft\.com/i, /@office\.com/i],
    subjectPatterns: [/microsoft\s*365|office\s*365/i],
  },
  {
    name: 'Claude Pro',
    category: 'other',
    senderPatterns: [/@anthropic\.com/i],
    subjectPatterns: [/claude|anthropic/i],
  },
  {
    name: 'Nintendo Switch Online',
    category: 'gaming',
    senderPatterns: [/@nintendo\.(com|co\.jp)/i],
    subjectPatterns: [/nintendo\s*switch\s*online|ニンテンドースイッチオンライン/i],
  },
  {
    name: 'PlayStation Plus',
    category: 'gaming',
    senderPatterns: [/@playstation\.com/i, /@sony\.com/i],
    subjectPatterns: [/playstation\s*plus|ps\s*plus/i],
  },
  {
    name: 'Xbox Game Pass',
    category: 'gaming',
    senderPatterns: [/@xbox\.com/i, /@microsoft\.com/i],
    subjectPatterns: [/xbox\s*game\s*pass/i],
  },
];

// 請求書/領収書メールを識別するキーワード
const BILLING_KEYWORDS = [
  /receipt/i,
  /invoice/i,
  /payment/i,
  /billing/i,
  /subscription/i,
  /renewed/i,
  /charge/i,
  /領収/i,
  /請求/i,
  /支払い/i,
  /お支払い/i,
  /ご利用/i,
  /更新/i,
  /継続/i,
  /課金/i,
  /明細/i,
];

// 金額抽出パターン（優先度順）
const PRICE_PATTERNS = [
  // 日本円
  { pattern: /合計[：:\s]*[¥￥]\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /total[：:\s]*[¥￥]\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /[¥￥]\s*([\d,]+)\s*(?:円|JPY)?/i, currency: 'JPY' },
  { pattern: /([\d,]+)\s*円/i, currency: 'JPY' },
  { pattern: /JPY\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /([\d,]+)\s*JPY/i, currency: 'JPY' },
  // 米ドル
  { pattern: /total[：:\s]*\$\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /\$\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /USD\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /([\d.]+)\s*USD/i, currency: 'USD' },
];

// 課金サイクルパターン
const BILLING_CYCLE_PATTERNS = [
  { pattern: /月額|monthly|per\s*month|\/month|毎月/i, cycle: 'monthly' },
  { pattern: /年額|yearly|annual|per\s*year|\/year|毎年/i, cycle: 'yearly' },
  { pattern: /週額|weekly|per\s*week|\/week|毎週/i, cycle: 'weekly' },
];

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function isBillingEmail(subject, body) {
  const text = `${subject} ${body}`;
  return BILLING_KEYWORDS.some(pattern => pattern.test(text));
}

function extractPrice(text) {
  // 価格らしくない数値を除外するための最小値・最大値
  const MIN_PRICE = 100; // 100円未満は除外
  const MAX_PRICE = 100000; // 10万円以上は除外
  const MIN_USD = 1;
  const MAX_USD = 1000;

  for (const { pattern, currency } of PRICE_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      for (const matchStr of matches) {
        const match = matchStr.match(pattern);
        if (match) {
          const price = parseFloat(match[1].replace(/,/g, ''));
          if (currency === 'JPY' && price >= MIN_PRICE && price <= MAX_PRICE) {
            return { price, currency };
          }
          if (currency === 'USD' && price >= MIN_USD && price <= MAX_USD) {
            return { price, currency };
          }
        }
      }
    }
  }
  return null;
}

function extractBillingCycle(text) {
  for (const { pattern, cycle } of BILLING_CYCLE_PATTERNS) {
    if (pattern.test(text)) return cycle;
  }
  return null;
}

function matchService(fromAddress, subject, body) {
  const fromLower = fromAddress.toLowerCase();
  const fullText = `${subject} ${body}`;

  for (const service of SERVICES) {
    // 送信者アドレスでマッチ
    const senderMatch = service.senderPatterns.some(p => p.test(fromLower));
    // 件名または本文でサービス名をマッチ
    const contentMatch = service.subjectPatterns.some(p => p.test(fullText));

    // 送信者アドレスまたはコンテンツがマッチすればOK
    if (senderMatch || contentMatch) {
      return { service, senderMatch, contentMatch };
    }
  }

  return null;
}

async function testConnection(email, appPassword) {
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });

  await client.connect();
  await client.logout();
  return { success: true, message: 'Connection successful' };
}

async function fetchEmails(email, appPassword, maxResults = 500) {
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const detected = new Map(); // サービス名 -> 検出情報
  const paymentHistories = new Map(); // サービス名 -> 支払い履歴配列

  try {
    const totalMessages = client.mailbox.exists;
    // すべてのメールをスキャン（最大500件）
    const startSeq = Math.max(1, totalMessages - maxResults + 1);

    console.log(`📧 Scanning ${totalMessages - startSeq + 1} emails...`);

    for await (const msg of client.fetch(`${startSeq}:*`, { source: true })) {
      if (!msg.source) continue;

      const parsed = await simpleParser(msg.source);
      const subject = parsed.subject || '';
      const fromAddress = parsed.from?.value?.[0]?.address || '';
      const fromText = parsed.from?.text || '';
      const body = parsed.text || '';
      const htmlBody = parsed.html || '';
      const fullText = `${subject} ${body} ${htmlBody}`;
      const emailDate = parsed.date || new Date();

      // 請求書/領収書メールかどうかチェック
      const isBilling = isBillingEmail(subject, fullText);

      // サービスをマッチ
      const matchResult = matchService(fromAddress, subject, fullText);

      if (!matchResult) continue;

      const { service, senderMatch, contentMatch } = matchResult;

      // 価格と課金サイクルを抽出
      const priceInfo = extractPrice(fullText);
      const billingCycle = extractBillingCycle(fullText);

      // 信頼度を計算
      let confidence = 0.2;
      if (senderMatch) confidence += 0.2;
      if (contentMatch) confidence += 0.1;
      if (isBilling) confidence += 0.3;
      if (priceInfo) confidence += 0.15;
      if (billingCycle) confidence += 0.05;

      // 支払い履歴に追加（請求書メールで価格が検出された場合）
      if (isBilling && priceInfo) {
        if (!paymentHistories.has(service.name)) {
          paymentHistories.set(service.name, []);
        }
        paymentHistories.get(service.name).push({
          date: emailDate.toISOString(),
          price: priceInfo.price,
          currency: priceInfo.currency,
          subject: subject.substring(0, 100),
        });
        console.log(`💰 Payment found: ${service.name} - ${priceInfo.price} ${priceInfo.currency} on ${emailDate.toISOString().split('T')[0]}`);
      }

      // 最新の情報を保持（より高い信頼度のものを優先）
      const existing = detected.get(service.name);
      if (!existing || confidence > existing.confidence) {
        detected.set(service.name, {
          name: service.name,
          category: service.category,
          price: priceInfo?.price ?? null,
          currency: priceInfo?.currency ?? null,
          billingCycle: billingCycle ?? null,
          email: fromText,
          detectedDate: emailDate.toISOString(),
          confidence,
          priceDetected: !!priceInfo,
        });
      }
    }
  } finally {
    lock.release();
  }

  await client.logout();

  // 結果を組み立て
  const results = Array.from(detected.values()).map(sub => {
    const history = paymentHistories.get(sub.name) || [];
    // 日付でソート（古い順）
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 支払い履歴から合計を計算
    const totalPaid = history.reduce((sum, h) => sum + h.price, 0);

    return {
      ...sub,
      paymentHistory: history,
      totalPaid,
      paymentCount: history.length,
    };
  });

  results.sort((a, b) => b.confidence - a.confidence);

  console.log(`✅ Total detected: ${results.length} subscriptions`);
  results.forEach(r => {
    console.log(`   ${r.name}: ${r.paymentCount} payments, total ${r.totalPaid} ${r.currency}`);
  });

  return { success: true, subscriptions: results, totalFound: results.length };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  console.log(`📨 ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'POST' && req.url === '/api/icloud/test-connection') {
      const { email, appPassword } = await parseBody(req);
      const result = await testConnection(email, appPassword);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } else if (req.method === 'POST' && req.url === '/api/icloud/fetch-emails') {
      const { email, appPassword, maxResults } = await parseBody(req);
      const result = await fetchEmails(email, appPassword, maxResults || 100);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Error:', error);
    const statusCode = error.authenticationFailed ? 401 : 500;
    const message = error.authenticationFailed
      ? 'Authentication failed. Check your email and app-specific password.'
      : error.message || 'Internal server error';
    res.writeHead(statusCode);
    res.end(JSON.stringify({ success: false, error: message }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 iCloud API server running at http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/icloud/test-connection');
  console.log('  POST /api/icloud/fetch-emails');
});
