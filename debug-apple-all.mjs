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
    // no_reply@email.apple.com からの全メール（最新20件の件名を表示）
    console.log('=== no_reply@email.apple.com の全メール（最新20件） ===\n');
    const result1 = await client.search({ from: 'no_reply@email.apple.com' }, { uid: true });
    console.log('総数: ' + (result1 ? result1.length : 0) + '件\n');

    if (result1 && result1.length > 0) {
      const uids = result1.slice(-20).reverse();
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        const dateStr = msg.envelope.date.toISOString().slice(0,10);
        console.log(dateStr + ': ' + (msg.envelope.subject || '(no subject)'));
      }
    }

    // 「Apple から」を含む件名のメール
    console.log('\n=== 件名に「Apple」を含むメール（2025年以降） ===\n');
    const result2 = await client.search({
      and: [
        { since: new Date('2025-01-01') },
        { subject: 'Apple' }
      ]
    }, { uid: true });
    console.log('件数: ' + (result2 ? result2.length : 0));

    if (result2 && result2.length > 0) {
      const uids = result2.slice(-15).reverse();
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        const dateStr = msg.envelope.date.toISOString().slice(0,10);
        const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
        console.log(dateStr + ' [' + from + ']');
        console.log('  ' + (msg.envelope.subject || ''));
      }
    }

  } finally {
    lock.release();
  }
  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
