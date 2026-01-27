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

// HTMLからテキスト抽出
function stripHtml(html) {
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

async function check() {
  await client.connect();

  const lock = await client.getMailboxLock('Deleted Messages');

  try {
    const result = await client.search({
      subject: '領収書',
      from: 'apple',
      since: new Date('2025-01-01')
    }, { uid: true });

    if (result && result.length > 0) {
      const uid = result[result.length - 1];
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });

      if (msg.source) {
        const parsed = await simpleParser(msg.source);
        const html = parsed.html || '';
        const text = stripHtml(html);

        console.log(`日付: ${parsed.date?.toISOString().slice(0, 10)}`);
        console.log(`件名: ${parsed.subject}\n`);
        console.log(`=== HTMLをテキスト変換した結果 (最初3000文字) ===\n`);
        console.log(text.substring(0, 3000));

        // 「問題を報告する」と金額を探す
        console.log(`\n\n=== 「問題を報告する」を含む部分 ===`);
        const matches = text.match(/.{0,100}問題を報告.{0,100}/g);
        if (matches) {
          matches.forEach(m => console.log(m + '\n'));
        } else {
          console.log('見つかりませんでした');
        }

        // 金額パターンを探す
        console.log(`\n=== 金額パターン ===`);
        const priceMatches = text.match(/[¥￥]\s*[\d,]+/g);
        if (priceMatches) {
          console.log(priceMatches.join(', '));
        }
      }
    }

  } finally {
    lock.release();
  }

  await client.logout();
}

check().catch(e => console.error('エラー:', e.message));
