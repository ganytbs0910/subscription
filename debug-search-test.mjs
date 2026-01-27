import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
  host: 'imap.mail.me.com',
  port: 993,
  secure: true,
  auth: { user: process.argv[2], pass: process.argv[3] },
  logger: false,
});

async function testSearches() {
  await client.connect();

  const folders = ['INBOX', 'Deleted Messages', 'Archive', 'Junk'];

  for (const folder of folders) {
    let lock;
    try {
      lock = await client.getMailboxLock(folder);
    } catch (e) {
      console.log(`\n❌ ${folder}: フォルダが存在しません`);
      continue;
    }

    try {
      const mailbox = client.mailbox;
      console.log(`\n========== ${folder} (${mailbox.exists}件) ==========`);

      // 検索テスト
      const searches = [
        { name: 'Apple送信者', query: { from: 'no_reply@email.apple.com' } },
        { name: '件名:領収書', query: { subject: '領収書' } },
        { name: '件名:receipt', query: { subject: 'receipt' } },
        { name: '件名:ご注文', query: { subject: 'ご注文' } },
        { name: '@apple.comドメイン', query: { from: '@apple.com' } },
        { name: '2025年以降', query: { since: new Date('2025-01-01') } },
      ];

      for (const search of searches) {
        try {
          const result = await client.search(search.query, { uid: true });
          const count = result ? result.length : 0;
          if (count > 0) {
            console.log(`  ✓ ${search.name}: ${count}件`);

            // 最新5件の件名を表示
            if (count <= 10) {
              for (const uid of result.slice(-5)) {
                const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
                const date = msg.envelope.date.toISOString().slice(0, 10);
                const subj = (msg.envelope.subject || '').substring(0, 50);
                console.log(`      ${date}: ${subj}`);
              }
            }
          } else {
            console.log(`  - ${search.name}: 0件`);
          }
        } catch (e) {
          console.log(`  ⚠ ${search.name}: エラー (${e.message})`);
        }
      }

    } finally {
      lock.release();
    }
  }

  await client.logout();
  console.log('\n完了');
}

testSearches().catch(e => console.error('エラー:', e.message));
