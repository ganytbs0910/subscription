const http = require('http');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const PORT = 3000;

// Service patterns for subscription detection
const SERVICE_PATTERNS = [
  { pattern: /netflix/i, name: 'Netflix', category: 'streaming' },
  { pattern: /disney\+|disneyplus/i, name: 'Disney+', category: 'streaming' },
  { pattern: /spotify/i, name: 'Spotify', category: 'music' },
  { pattern: /apple\s*music/i, name: 'Apple Music', category: 'music' },
  { pattern: /youtube\s*premium/i, name: 'YouTube Premium', category: 'streaming' },
  { pattern: /amazon\s*prime/i, name: 'Amazon Prime', category: 'other' },
  { pattern: /hulu/i, name: 'Hulu', category: 'streaming' },
  { pattern: /notion/i, name: 'Notion', category: 'productivity' },
  { pattern: /slack/i, name: 'Slack', category: 'productivity' },
  { pattern: /zoom/i, name: 'Zoom', category: 'productivity' },
  { pattern: /dropbox/i, name: 'Dropbox', category: 'cloud' },
  { pattern: /icloud/i, name: 'iCloud+', category: 'cloud' },
  { pattern: /github/i, name: 'GitHub', category: 'other' },
  { pattern: /adobe|creative\s*cloud/i, name: 'Adobe Creative Cloud', category: 'other' },
  { pattern: /chatgpt|openai/i, name: 'ChatGPT Plus', category: 'other' },
  { pattern: /microsoft\s*365|office\s*365/i, name: 'Microsoft 365', category: 'productivity' },
];

const PRICE_PATTERNS = [
  { pattern: /[¥￥]\s*([\d,]+)/, currency: 'JPY' },
  { pattern: /([\d,]+)\s*円/, currency: 'JPY' },
  { pattern: /JPY\s*([\d,]+)/i, currency: 'JPY' },
  { pattern: /([\d,]+)\s*JPY/i, currency: 'JPY' },
  { pattern: /\$\s*([\d.]+)/, currency: 'USD' },
  { pattern: /USD\s*([\d.]+)/i, currency: 'USD' },
  { pattern: /([\d.]+)\s*USD/i, currency: 'USD' },
];

const BILLING_PATTERNS = [
  { pattern: /月額|monthly|per\s*month|\/month/i, cycle: 'monthly' },
  { pattern: /年額|yearly|annual|per\s*year/i, cycle: 'yearly' },
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

function extractPrice(text) {
  for (const { pattern, currency } of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 0 && price < 1000000) {
        return { price, currency };
      }
    }
  }
  return null;
}

function extractBillingCycle(text) {
  for (const { pattern, cycle } of BILLING_PATTERNS) {
    if (pattern.test(text)) return cycle;
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

async function fetchEmails(email, appPassword, maxResults = 50) {
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const detected = [];
  const seenServices = new Set();

  try {
    // Get recent messages
    const totalMessages = client.mailbox.exists;
    const startSeq = Math.max(1, totalMessages - maxResults + 1);

    for await (const msg of client.fetch(`${startSeq}:*`, { source: true })) {
      if (msg.source) {
        const parsed = await simpleParser(msg.source);
        const subject = parsed.subject || '';
        const from = parsed.from?.text || '';
        const body = parsed.text || '';
        const fullText = `${subject} ${from} ${body}`;

        for (const service of SERVICE_PATTERNS) {
          if (service.pattern.test(fullText) && !seenServices.has(service.name)) {
            seenServices.add(service.name);
            const priceInfo = extractPrice(fullText);
            const billingCycle = extractBillingCycle(fullText);

            console.log(`🔍 Detected: ${service.name}`);
            console.log(`   Subject: ${subject}`);
            console.log(`   Price: ${priceInfo ? `${priceInfo.price} ${priceInfo.currency}` : 'not found'}`);
            console.log(`   Cycle: ${billingCycle || 'not found'}`);

            let confidence = 0.5;
            if (priceInfo) confidence += 0.2;
            if (billingCycle) confidence += 0.15;
            if (/receipt|invoice|領収|請求/i.test(subject)) confidence += 0.15;

            detected.push({
              name: service.name,
              category: service.category,
              price: priceInfo?.price || null,
              currency: priceInfo?.currency || 'JPY',
              billingCycle,
              email: from,
              detectedDate: (parsed.date || new Date()).toISOString(),
              confidence,
            });
            break;
          }
        }
      }
    }
  } finally {
    lock.release();
  }

  await client.logout();
  detected.sort((a, b) => b.confidence - a.confidence);
  return { success: true, subscriptions: detected, totalFound: detected.length };
}

const server = http.createServer(async (req, res) => {
  // CORS headers
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
      const result = await fetchEmails(email, appPassword, maxResults || 50);
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
