import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const client = new ImapFlow({
  host: 'imap.mail.me.com',
  port: 993,
  secure: true,
  auth: { user: process.argv[2], pass: process.argv[3] },
  logger: false,
});

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&yen;/g, '¥')
    .replace(/&#165;/g, '¥')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractApplePurchases(body) {
  const purchases = [];
  const cleanedBody = body.replace(/JCT[（\(]\s*\d+%?\s*[）\)][をが]含む\s*[¥￥][\d,]+/g, '');
  const reportPattern = /(?:App\s*Store\s+)?([A-Za-z\u3040-\u9FFF][^問]+?)\s+問題を報告する\s*[¥￥]\s*([\d,]+)/g;
  let match;

  while ((match = reportPattern.exec(cleanedBody)) !== null) {
    const beforeReport = match[1].trim();
    const price = parseInt(match[2].replace(/,/g, ''), 10);
    if (price < 50 || price > 100000) continue;

    // ゴミデータを除外
    if (beforeReport.includes('での購入時に使用する') ||
        beforeReport.includes('パスワード設定を管理') ||
        beforeReport.includes('Apple Account') ||
        beforeReport.length > 200) {
      continue;
    }

    let appName = null;
    let itemName = null;
    let purchaseType = 'purchase';

    if (/\(月額\)|（月額）|更新：/.test(beforeReport)) purchaseType = 'subscription';
    if (/\(年額\)|（年額）/.test(beforeReport)) purchaseType = 'subscription';
    if (/アプリ内課金|App\s*内課金/.test(beforeReport)) purchaseType = 'in_app_purchase';

    let content = beforeReport.replace(/^.*?App\s*Store\s*/, '');
    content = content.replace(/\s*更新：.*$/, '');
    content = content.replace(/\s*(?:アプリ内課金|App\s*内課金).*$/, '');
    content = content.replace(/\s*[（\(](?:月額|年額)[）\)].*$/, '');
    const parts = content.trim();

    const knownApps = [
      /^(ARK:\s*Ultimate Mobile Edition)\s+(.+)$/i,
      /^(ブロスタ)\s+(.+)$/i,
      /^(クラッシュ・ロワイヤル)\s+(.+)$/i,
      /^(クラッシュ・オブ・クラン)\s+(.+)$/i,
      /^(Tinder)\s+(.+)$/i,
      /^(YouTube)\s+(.+)$/i,
      /^(LINE)\s+(.+)$/i,
      /^(Identity V)\s+(.+)$/i,
      /^(X)\s+(.+)$/i,
      /^(Pairs[^\s]*)\s+(.+)$/i,
    ];

    for (const pattern of knownApps) {
      const appMatch = parts.match(pattern);
      if (appMatch) {
        appName = appMatch[1];
        itemName = appMatch[2];
        break;
      }
    }

    if (!appName && parts.length > 0) {
      const itemMatch = parts.match(/^(.+?)\s+([A-Z][A-Z0-9\s\-]+(?:Pass|Premium|Plus|Pro|Coin|パック|UPGRADE|Bundle|Offer|エコー|Keys).*)$/i);
      if (itemMatch) {
        appName = itemMatch[1].trim();
        itemName = itemMatch[2].trim();
      } else {
        appName = parts;
      }
    }

    if (appName) {
      const isDuplicate = purchases.some(p => p.appName === appName && p.price === price);
      if (!isDuplicate) {
        purchases.push({ appName, itemName, price, purchaseType });
      }
    }
  }
  return purchases;
}

async function check() {
  await client.connect();
  console.log('=== 2025年以降のApple領収書を完全解析（改良版） ===\n');

  const folders = ['INBOX', 'Deleted Messages'];
  const allPurchases = [];

  for (const folder of folders) {
    let lock;
    try { lock = await client.getMailboxLock(folder); } catch (e) { continue; }

    try {
      const result = await client.search({ subject: '領収書', from: 'apple', since: new Date('2025-01-01') }, { uid: true });
      console.log(`[${folder}] 2025年以降のApple領収書: ${result ? result.length : 0}件`);

      if (result && result.length > 0) {
        for (const uid of result) {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const date = parsed.date ? parsed.date.toISOString().slice(0, 10) : 'unknown';
          const body = parsed.text || stripHtml(parsed.html || '');

          const purchases = extractApplePurchases(body);
          if (purchases.length > 0) {
            console.log(`\n  ${date}:`);
            purchases.forEach(p => {
              console.log(`    → ${p.appName}${p.itemName ? ' - ' + p.itemName : ''}: ¥${p.price} (${p.purchaseType})`);
              allPurchases.push({ ...p, date });
            });
          }
        }
      }
    } finally { lock.release(); }
  }

  console.log('\n\n=== サマリー ===');
  console.log(`2025年以降の課金: ${allPurchases.length}件\n`);

  const byApp = {};
  allPurchases.forEach(p => {
    if (!byApp[p.appName]) byApp[p.appName] = { count: 0, total: 0 };
    byApp[p.appName].count++;
    byApp[p.appName].total += p.price;
  });

  Object.entries(byApp).sort((a, b) => b[1].total - a[1].total).forEach(([app, data]) => {
    console.log(`${app}: ${data.count}回 / ¥${data.total.toLocaleString()}`);
  });

  await client.logout();
}

check().catch(e => console.error('エラー:', e.message));
