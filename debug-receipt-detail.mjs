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

  const folders = ['INBOX', 'Deleted Messages'];

  for (const folder of folders) {
    let lock;
    try {
      lock = await client.getMailboxLock(folder);
    } catch (e) {
      continue;
    }

    try {
      console.log(`\n========== ${folder} ==========`);

      // 件名に「領収書」を含むメールを検索
      const result = await client.search({ subject: '領収書' }, { uid: true });
      console.log(`「領収書」を含むメール: ${result ? result.length : 0}件`);

      if (result && result.length > 0) {
        // 全件の日付と送信者を表示
        console.log(`\n全件リスト:`);
        for (const uid of result.slice(-20).reverse()) {
          const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
          const date = msg.envelope.date ? msg.envelope.date.toISOString().slice(0, 10) : 'unknown';
          const from = msg.envelope.from?.[0]?.address || 'unknown';
          const subject = (msg.envelope.subject || '').substring(0, 50);
          console.log(`  ${date} [${from}] ${subject}`);
        }

        // 最新の領収書メールの中身を確認
        console.log(`\n--- 最新メールの詳細 ---`);
        const latestUid = result[result.length - 1];
        const msg = await client.fetchOne(latestUid, { source: true }, { uid: true });
        if (msg.source) {
          const parsed = await simpleParser(msg.source);
          console.log(`日付: ${parsed.date?.toISOString()}`);
          console.log(`送信者: ${parsed.from?.text}`);
          console.log(`件名: ${parsed.subject}`);
          console.log(`\n本文プレビュー (最初500文字):`);
          console.log((parsed.text || '').substring(0, 500));
        }
      }

    } finally {
      lock.release();
    }
  }

  await client.logout();
}

check().catch(e => console.error('エラー:', e.message));
