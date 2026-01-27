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

      // 2025年以降のApple領収書を検索
      const result = await client.search({
        from: 'no_reply@email.apple.com',
        since: new Date('2025-01-01')
      }, { uid: true });

      console.log(`2025年以降のApple領収書: ${result ? result.length : 0}件`);

      if (result && result.length > 0) {
        // 最新10件の詳細を表示
        const uids = result.slice(-10);
        console.log(`\n最新${uids.length}件の詳細:`);

        for (const uid of uids) {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const subject = parsed.subject || '';
          const date = parsed.date ? parsed.date.toISOString().slice(0, 10) : 'unknown';
          const body = parsed.text || '';

          console.log(`\n--- ${date} ---`);
          console.log(`件名: ${subject}`);

          // 金額を探す
          const priceMatch = body.match(/[¥￥]\s*([\d,]+)/g);
          if (priceMatch) {
            console.log(`金額: ${priceMatch.slice(0, 5).join(', ')}`);
          }

          // アプリ名を探す（「問題を報告する」の前の行）
          const lines = body.split(/[\n\r]+/).filter(l => l.trim());
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('問題を報告する') && lines[i].match(/[¥￥]/)) {
              console.log(`購入行: ${lines[i].substring(0, 80)}`);
              // 前の数行を表示
              for (let j = Math.max(0, i - 4); j < i; j++) {
                console.log(`  前${i-j}: ${lines[j].substring(0, 60)}`);
              }
            }
          }
        }
      }

    } finally {
      lock.release();
    }
  }

  await client.logout();
}

check().catch(e => console.error('エラー:', e.message));
