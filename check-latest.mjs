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
    const result = await client.search({ from: 'no_reply@email.apple.com' }, { uid: true });
    
    console.log('Appleメール総数: ' + (result ? result.length : 0) + '件');
    
    if (result && result.length > 0) {
      console.log('\n最新5件:');
      const uids = result.slice(-5).reverse();
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        const dateStr = msg.envelope.date.toISOString().slice(0,10);
        console.log('  ' + dateStr + ': ' + msg.envelope.subject);
      }
    }
  } finally {
    lock.release();
  }
  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
