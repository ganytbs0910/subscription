const express = require('express');
const cors = require('cors');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'iCloud IMAP Proxy Server' });
});

// Scan iCloud emails for subscriptions
app.post('/api/scan-icloud', async (req, res) => {
  const { email, appPassword } = req.body;

  if (!email || !appPassword) {
    return res.status(400).json({
      error: 'Missing credentials',
      message: 'メールアドレスとアプリ用パスワードが必要です'
    });
  }

  console.log(`Scanning iCloud for: ${email}`);

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
    // Connect
    await client.connect();
    console.log('Connected to iCloud IMAP');

    // Select INBOX
    const mailbox = await client.mailboxOpen('INBOX');
    console.log(`Mailbox opened: ${mailbox.exists} messages`);

    // Search for subscription-related emails
    const searchQueries = [
      { or: [{ subject: 'receipt' }, { subject: 'invoice' }] },
      { or: [{ subject: '領収' }, { subject: '請求' }] },
      { or: [{ subject: 'subscription' }, { subject: 'サブスクリプション' }] },
      { or: [{ subject: '月額' }, { subject: '年額' }] },
    ];

    const senderSearches = [
      { from: 'netflix' },
      { from: 'spotify' },
      { from: 'apple' },
      { from: 'amazon' },
      { from: 'google' },
      { from: 'adobe' },
      { from: 'microsoft' },
      { from: 'youtube' },
      { from: 'disney' },
      { from: 'dropbox' },
      { from: 'notion' },
      { from: 'slack' },
      { from: 'zoom' },
      { from: 'github' },
    ];

    const allUids = new Set();

    // Search by subject
    for (const query of searchQueries) {
      try {
        const uids = await client.search(query, { uid: true });
        uids.forEach(uid => allUids.add(uid));
      } catch (e) {
        console.log('Search query failed:', e.message);
      }
    }

    // Search by sender
    for (const query of senderSearches) {
      try {
        const uids = await client.search(query, { uid: true });
        uids.forEach(uid => allUids.add(uid));
      } catch (e) {
        // Ignore
      }
    }

    console.log(`Found ${allUids.size} potential subscription emails`);

    // Fetch latest 50 emails
    const uidsArray = Array.from(allUids).sort((a, b) => b - a).slice(0, 50);
    const emails = [];

    for (const uid of uidsArray) {
      try {
        const message = await client.fetchOne(uid, {
          source: true,
          envelope: true,
        }, { uid: true });

        if (message && message.source) {
          const parsed = await simpleParser(message.source);
          emails.push({
            id: String(uid),
            subject: parsed.subject || '',
            from: parsed.from?.text || '',
            date: parsed.date?.toISOString() || '',
            body: parsed.text || parsed.html || '',
            snippet: (parsed.text || '').substring(0, 200),
          });
        }
      } catch (e) {
        console.log(`Failed to fetch email ${uid}:`, e.message);
      }
    }

    // Logout
    await client.logout();
    console.log('Disconnected from iCloud IMAP');

    // Parse subscriptions from emails
    const subscriptions = parseSubscriptions(emails);

    res.json({
      success: true,
      emailCount: emails.length,
      subscriptions,
    });

  } catch (error) {
    console.error('IMAP error:', error);

    try {
      await client.logout();
    } catch (e) {
      // Ignore
    }

    // Determine error type
    let message = 'iCloudへの接続に失敗しました';
    if (error.message?.includes('Authentication failed') ||
        error.message?.includes('AUTHENTICATIONFAILED')) {
      message = 'ログインに失敗しました。メールアドレスとアプリ用パスワードを確認してください。';
    } else if (error.message?.includes('ENOTFOUND') ||
               error.message?.includes('ETIMEDOUT')) {
      message = 'サーバーに接続できません。ネットワークを確認してください。';
    }

    res.status(500).json({
      error: 'IMAP Error',
      message,
      detail: error.message,
    });
  }
});

// Parse subscriptions from email content
function parseSubscriptions(emails) {
  const subscriptionPatterns = [
    { name: 'Netflix', pattern: /netflix/i, category: 'entertainment' },
    { name: 'Spotify', pattern: /spotify/i, category: 'entertainment' },
    { name: 'Apple Music', pattern: /apple\s*music/i, category: 'entertainment' },
    { name: 'Apple TV+', pattern: /apple\s*tv\+?/i, category: 'entertainment' },
    { name: 'Apple One', pattern: /apple\s*one/i, category: 'entertainment' },
    { name: 'iCloud+', pattern: /icloud\+|icloud\s*storage/i, category: 'utilities' },
    { name: 'Amazon Prime', pattern: /amazon\s*prime|プライム会員/i, category: 'entertainment' },
    { name: 'YouTube Premium', pattern: /youtube\s*premium/i, category: 'entertainment' },
    { name: 'Disney+', pattern: /disney\+|disney\s*plus/i, category: 'entertainment' },
    { name: 'Adobe Creative Cloud', pattern: /adobe|creative\s*cloud/i, category: 'productivity' },
    { name: 'Microsoft 365', pattern: /microsoft\s*365|office\s*365/i, category: 'productivity' },
    { name: 'Dropbox', pattern: /dropbox/i, category: 'utilities' },
    { name: 'Google One', pattern: /google\s*one/i, category: 'utilities' },
    { name: 'Notion', pattern: /notion/i, category: 'productivity' },
    { name: 'Slack', pattern: /slack/i, category: 'productivity' },
    { name: 'Zoom', pattern: /zoom/i, category: 'productivity' },
    { name: 'GitHub', pattern: /github/i, category: 'productivity' },
    { name: 'ChatGPT Plus', pattern: /chatgpt|openai/i, category: 'productivity' },
    { name: 'Claude Pro', pattern: /claude|anthropic/i, category: 'productivity' },
    { name: 'Hulu', pattern: /hulu/i, category: 'entertainment' },
    { name: 'U-NEXT', pattern: /u-next|unext/i, category: 'entertainment' },
    { name: 'dアニメストア', pattern: /dアニメ/i, category: 'entertainment' },
    { name: 'Nintendo Switch Online', pattern: /nintendo|switch\s*online/i, category: 'entertainment' },
    { name: 'PlayStation Plus', pattern: /playstation\s*plus|ps\s*plus/i, category: 'entertainment' },
  ];

  const pricePatterns = [
    /[¥￥]\s*([\d,]+)/,
    /(\d{1,3}(?:,\d{3})*)\s*円/,
    /\$\s*([\d.]+)/,
    /USD\s*([\d.]+)/,
    /JPY\s*([\d,]+)/,
  ];

  const detected = new Map();

  for (const email of emails) {
    const content = `${email.subject} ${email.from} ${email.body}`;

    for (const { name, pattern, category } of subscriptionPatterns) {
      if (pattern.test(content) && !detected.has(name)) {
        // Try to extract price
        let price = null;
        let currency = 'JPY';

        for (const pricePattern of pricePatterns) {
          const match = content.match(pricePattern);
          if (match) {
            const priceStr = match[1].replace(/,/g, '');
            price = parseFloat(priceStr);
            if (match[0].includes('$') || match[0].includes('USD')) {
              currency = 'USD';
            }
            break;
          }
        }

        // Detect billing cycle
        let billingCycle = 'monthly';
        if (/年額|yearly|annual|year/i.test(content)) {
          billingCycle = 'yearly';
        } else if (/週額|weekly|week/i.test(content)) {
          billingCycle = 'weekly';
        }

        detected.set(name, {
          name,
          category,
          price,
          currency,
          billingCycle,
          source: 'icloud',
        });
      }
    }
  }

  return Array.from(detected.values());
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
