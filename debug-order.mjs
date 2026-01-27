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

async function check() {
  await client.connect();

  const folders = ['INBOX', 'Archive', 'Junk', 'Deleted Messages'];

  for (const folder of folders) {
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        console.log('\n=== ' + folder + ' ===');

        // 2026年1月3日のメールを検索
        const r1 = await client.search({
          on: new Date('2026-01-03')
        }, { uid: true });

        console.log('2026年1月3日のメール: ' + (r1 ? r1.length : 0) + '件');
        if (r1 && r1.length > 0) {
          for (const uid of r1) {
            const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
            const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
            console.log('  [' + from + ']: ' + (msg.envelope.subject || '').substring(0, 60));
          }
        }

        // 「請求書」を件名に含むメール
        const r2 = await client.search({
          subject: '請求書'
        }, { uid: true });

        console.log('「請求書」を含むメール: ' + (r2 ? r2.length : 0) + '件');
        if (r2 && r2.length > 0) {
          for (const uid of r2.slice(-5)) {
            const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
            const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
            console.log('  ' + msg.envelope.date.toISOString().slice(0,10) + ' [' + from + ']: ' + (msg.envelope.subject || '').substring(0, 60));
          }
        }

      } finally {
        lock.release();
      }
    } catch (e) {
      console.log('\n=== ' + folder + ' === (エラー: ' + e.message + ')');
    }
  }

  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
