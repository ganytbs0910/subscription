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
  console.log('利用可能なフォルダ:');
  for (const f of folders) {
    console.log('  ' + f.path);
  }
  
  // 各フォルダで2025年以降のAppleメールを検索
  const foldersToCheck = ['INBOX', 'Archive', 'Sent Messages', 'Deleted Messages', 'Junk'];
  
  console.log('\n2025年以降のApple領収書を検索:');
  for (const folder of foldersToCheck) {
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        const result = await client.search({
          and: [
            { from: 'no_reply@email.apple.com' },
            { since: new Date('2025-01-01') }
          ]
        }, { uid: true });
        
        const count = result && result.length ? result.length : 0;
        if (count > 0) {
          console.log('  ' + folder + ': ' + count + '件');
        }
      } finally {
        lock.release();
      }
    } catch (e) {
      // フォルダが存在しない場合はスキップ
    }
  }
  
  await client.logout();
}

check().catch(function(e) { console.error(e.message); });
