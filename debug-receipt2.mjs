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

        // 「領収書」を件名に含むメール
        const r1 = await client.search({
          subject: '領収書'
        }, { uid: true });

        console.log('「領収書」を含むメール: ' + (r1 ? r1.length : 0) + '件');
        if (r1 && r1.length > 0) {
          for (const uid of r1.slice(-10)) {
            const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
            const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
            console.log('  ' + msg.envelope.date.toISOString().slice(0,10) + ' [' + from + ']: ' + (msg.envelope.subject || '').substring(0, 60));
          }
        }

      } finally {
        lock.release();
      }
    } catch (e) {
      console.log('\n=== ' + folder + ' === (エラー)');
    }
  }

  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
