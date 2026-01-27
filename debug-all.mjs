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
    const mailbox = client.mailbox;
    console.log('INBOX総メール数: ' + mailbox.exists);

    // 2025年以降の全メールを取得（最新20件）
    console.log('\n=== 2025年以降の最新メール20件 ===');
    const recent = await client.search({
      since: new Date('2025-01-01')
    }, { uid: true });

    console.log('2025年以降のメール総数: ' + (recent ? recent.length : 0) + '件');

    if (recent && recent.length > 0) {
      const uids = recent.slice(-20).reverse();
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        const dateStr = msg.envelope.date.toISOString().slice(0,10);
        const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
        const subject = msg.envelope.subject || '(no subject)';
        console.log(dateStr + ' [' + from + ']');
        console.log('  ' + subject.substring(0, 60));
      }
    }

    // Appleを含むメールを検索
    console.log('\n=== "apple" を含む送信者のメール ===');
    const appleEmails = await client.search({
      from: 'apple'
    }, { uid: true });

    console.log('Appleからのメール総数: ' + (appleEmails ? appleEmails.length : 0) + '件');

    if (appleEmails && appleEmails.length > 0) {
      const uids = appleEmails.slice(-10).reverse();
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        const dateStr = msg.envelope.date.toISOString().slice(0,10);
        const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
        console.log('  ' + dateStr + ' [' + from + ']: ' + (msg.envelope.subject || '').substring(0, 50));
      }
    }

  } finally {
    lock.release();
  }
  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
