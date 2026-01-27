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

  // フォルダ一覧を取得
  const folders = await client.list();
  console.log('=== フォルダ一覧 ===');
  for (const f of folders) {
    console.log('  ' + f.path);
  }

  // 各フォルダで2025年以降のメールを検索
  const foldersToCheck = ['INBOX', 'Archive', 'Sent Messages'];

  for (const folder of foldersToCheck) {
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        console.log('\n=== ' + folder + ' ===');

        // 2025年以降の領収書メールを件名で検索
        const result = await client.search({
          and: [
            { since: new Date('2025-01-01') },
            { subject: '領収書' }
          ]
        }, { uid: true });

        console.log('2025年以降の領収書メール: ' + (result ? result.length : 0) + '件');

        if (result && result.length > 0) {
          const uids = result.slice(-10);
          for (const uid of uids) {
            const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
            const dateStr = msg.envelope.date.toISOString().slice(0,10);
            const from = msg.envelope.from && msg.envelope.from[0] ? msg.envelope.from[0].address : 'unknown';
            console.log('  ' + dateStr + ' [' + from + ']: ' + msg.envelope.subject);
          }
        }

        // Appleからの全メール（送信者で検索）
        const appleSenders = [
          'no_reply@email.apple.com',
          'noreply@email.apple.com',
          'appleid@id.apple.com',
          'noreply@apple.com'
        ];

        for (const sender of appleSenders) {
          const r = await client.search({
            and: [
              { from: sender },
              { since: new Date('2025-01-01') }
            ]
          }, { uid: true });
          if (r && r.length > 0) {
            console.log('  ' + sender + ': ' + r.length + '件');
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
