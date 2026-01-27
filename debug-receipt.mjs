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
  const lock = await client.getMailboxLock('INBOX');

  try {
    // Apple領収書のすべての可能な送信者を検索
    const senders = [
      'no_reply@email.apple.com',
      'noreply@email.apple.com',
      'appleid@id.apple.com',
      'noreply@apple.com',
      'no-reply@apple.com'
    ];

    console.log('=== Apple領収書の送信者を検索 ===\n');

    for (const sender of senders) {
      const result = await client.search({ from: sender }, { uid: true });
      const count = result ? result.length : 0;
      console.log(sender + ': ' + count + '件');

      if (count > 0) {
        const uids = result.slice(-3).reverse();
        for (const uid of uids) {
          const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
          const dateStr = msg.envelope.date.toISOString().slice(0,10);
          console.log('  ' + dateStr + ': ' + (msg.envelope.subject || '').substring(0, 50));
        }
      }
    }

    // 件名に「領収書」または「Receipt」を含むAppleメール
    console.log('\n=== 件名に「領収書」を含むメール ===');
    const receipts = await client.search({
      and: [
        { from: 'apple' },
        { or: [{ subject: '領収書' }, { subject: 'Receipt' }] }
      ]
    }, { uid: true });

    console.log('件数: ' + (receipts ? receipts.length : 0));
    if (receipts && receipts.length > 0) {
      const uids = receipts.slice(-10).reverse();
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        const dateStr = msg.envelope.date.toISOString().slice(0,10);
        const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
        console.log('  ' + dateStr + ' [' + from + ']: ' + (msg.envelope.subject || '').substring(0, 60));
      }
    }

  } finally {
    lock.release();
  }
  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
