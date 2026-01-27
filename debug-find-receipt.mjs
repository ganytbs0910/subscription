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

        // App Storeを含むメール
        const r1 = await client.search({
          and: [
            { since: new Date('2025-01-01') },
            { or: [{ subject: 'App Store' }, { subject: 'ご注文' }] }
          ]
        }, { uid: true });

        if (r1 && r1.length > 0) {
          console.log('App Store/ご注文 メール: ' + r1.length + '件');
          for (const uid of r1.slice(-5)) {
            const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
            const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
            console.log('  ' + msg.envelope.date.toISOString().slice(0,10) + ' [' + from + ']: ' + (msg.envelope.subject || '').substring(0, 50));
          }
        }

        // 2026年1月のメール（最新）
        const r2 = await client.search({
          since: new Date('2026-01-01')
        }, { uid: true });

        console.log('2026年1月以降のメール: ' + (r2 ? r2.length : 0) + '件');

        // このフォルダのAppleメール
        const r3 = await client.search({
          and: [
            { since: new Date('2025-01-01') },
            { from: 'apple' }
          ]
        }, { uid: true });

        if (r3 && r3.length > 0) {
          console.log('Appleからのメール(2025以降): ' + r3.length + '件');
          for (const uid of r3.slice(-5)) {
            const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
            const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
            console.log('  ' + msg.envelope.date.toISOString().slice(0,10) + ' [' + from + ']: ' + (msg.envelope.subject || '').substring(0, 50));
          }
        }

      } finally {
        lock.release();
      }
    } catch (e) {
      console.log('\n=== ' + folder + ' === (アクセス不可)');
    }
  }

  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
