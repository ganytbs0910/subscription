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

async function check() {
  await client.connect();

  const lock = await client.getMailboxLock('Deleted Messages');

  try {
    // 2025年以降のApple領収書を1件取得
    const result = await client.search({
      subject: '領収書',
      from: 'apple',
      since: new Date('2025-01-01')
    }, { uid: true });

    console.log(`見つかった件数: ${result ? result.length : 0}`);

    if (result && result.length > 0) {
      // 最新の1件を詳細表示
      const uid = result[result.length - 1];
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });

      if (msg.source) {
        const parsed = await simpleParser(msg.source);
        console.log(`\n日付: ${parsed.date?.toISOString()}`);
        console.log(`送信者: ${parsed.from?.text}`);
        console.log(`件名: ${parsed.subject}`);
        console.log(`\n=== 本文(text) ===`);
        console.log(parsed.text?.substring(0, 2000) || '(なし)');
        console.log(`\n=== HTML有無 ===`);
        console.log(parsed.html ? `HTMLあり (${parsed.html.length}文字)` : 'HTMLなし');
      }
    }

  } finally {
    lock.release();
  }

  await client.logout();
}

check().catch(e => console.error('エラー:', e.message));
