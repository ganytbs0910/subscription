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

// Apple領収書からアプリ名と金額を抽出（APIと同じロジック）
function extractApplePurchases(subject, body) {
  const purchases = [];
  const lines = body.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

  const ignorePatterns = [
    /^App\s*Store$/i, /合計/, /^小計/, /APPLE\s*(ID|ACCOUNT)/i,
    /^請求先$/, /^日付/, /^ご注文番号/, /^書類番号/, /^PayPay/i,
    /クレジット/, /^-+$/, /^JCT/, /課税/, /Amex|Visa|JCB|Mastercard/i,
    /^\d{3}-\d{4}/, /^JPN$/, /@.*\.com/, /滋賀県|草津市|栗東市/,
  ];

  const isIgnored = (text) => ignorePatterns.some(p => p.test(text));

  // 「問題を報告する ¥XXX」パターンを探す
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const reportPriceMatch = line.match(/問題を報告.*?[¥￥]\s*([\d,]+)/);

    if (reportPriceMatch) {
      const price = parseInt(reportPriceMatch[1].replace(/,/g, ''), 10);
      if (price < 50 || price > 100000) continue;

      let appName = null;
      let itemName = null;
      let purchaseType = 'purchase';

      for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
        const prevLine = lines[j];
        if (isIgnored(prevLine)) continue;

        if (prevLine.includes('更新：') || prevLine.includes('(月額)') || prevLine.includes('（月額）')) {
          purchaseType = 'subscription';
          continue;
        }
        if (prevLine.includes('(年額)') || prevLine.includes('（年額）')) {
          purchaseType = 'subscription';
          continue;
        }
        if (prevLine === 'アプリ内課金' || prevLine === 'App 内課金') {
          purchaseType = 'in_app_purchase';
          continue;
        }

        if (!itemName && /[A-Z]{2,}|月額|年額|Pass|Premium|Plus|Pro|Coin|パック|UPGRADE/i.test(prevLine)) {
          itemName = prevLine;
          continue;
        }

        if (!appName && prevLine.length > 1 && prevLine.length < 50 && !prevLine.match(/^[¥￥\d]/)) {
          appName = prevLine;
          break;
        }
      }

      if (appName) {
        purchases.push({ appName, itemName, price, purchaseType });
      }
    }
  }

  return purchases;
}

async function check() {
  await client.connect();

  console.log('=== 2025年以降のApple領収書を解析 ===\n');

  const folders = ['INBOX', 'Deleted Messages'];
  let totalPurchases = [];

  for (const folder of folders) {
    let lock;
    try {
      lock = await client.getMailboxLock(folder);
    } catch (e) {
      continue;
    }

    try {
      // 件名に「領収書」+ 2025年以降
      const result = await client.search({
        subject: '領収書',
        since: new Date('2025-01-01')
      }, { uid: true });

      console.log(`[${folder}] 2025年以降の領収書: ${result ? result.length : 0}件`);

      if (result && result.length > 0) {
        for (const uid of result) {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const subject = parsed.subject || '';
          const from = parsed.from?.value?.[0]?.address || '';
          const date = parsed.date ? parsed.date.toISOString().slice(0, 10) : 'unknown';
          const body = parsed.text || '';

          // Appleからの領収書のみ解析
          if (!from.includes('apple')) continue;

          const purchases = extractApplePurchases(subject, body);

          if (purchases.length > 0) {
            console.log(`\n  ${date}: ${subject}`);
            purchases.forEach(p => {
              console.log(`    → ${p.appName}${p.itemName ? ' - ' + p.itemName : ''}: ¥${p.price} (${p.purchaseType})`);
              totalPurchases.push({ ...p, date });
            });
          }
        }
      }

    } finally {
      lock.release();
    }
  }

  console.log('\n=== 2025年以降の課金サマリー ===');
  console.log(`合計: ${totalPurchases.length}件\n`);

  // アプリ別に集計
  const byApp = {};
  totalPurchases.forEach(p => {
    if (!byApp[p.appName]) byApp[p.appName] = { count: 0, total: 0, items: [] };
    byApp[p.appName].count++;
    byApp[p.appName].total += p.price;
    byApp[p.appName].items.push(p);
  });

  Object.entries(byApp)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([app, data]) => {
      console.log(`${app}: ${data.count}回 / ¥${data.total.toLocaleString()}`);
    });

  await client.logout();
}

check().catch(e => console.error('エラー:', e.message));
