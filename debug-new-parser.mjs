// 新しいパーサーのテスト

function extractApplePurchases(body) {
  const purchases = [];

  // JCT税額情報を除去
  const cleanedBody = body.replace(/JCT[（\(]\s*\d+%?\s*[）\)][をが]含む\s*[¥￥][\d,]+/g, '');
  console.log('クリーン後:', cleanedBody.substring(0, 300) + '...\n');

  const reportPattern = /(?:App\s*Store\s+)?([A-Za-z\u3040-\u9FFF][^問]+?)\s+問題を報告する\s*[¥￥]\s*([\d,]+)/g;
  let match;

  while ((match = reportPattern.exec(cleanedBody)) !== null) {
    const beforeReport = match[1].trim();
    const price = parseInt(match[2].replace(/,/g, ''), 10);

    console.log(`マッチ: "${beforeReport}" => ¥${price}`);

    if (price < 50 || price > 100000) continue;

    let appName = null;
    let itemName = null;
    let purchaseType = 'purchase';
    let billingCycle = null;

    if (/\(月額\)|（月額）|更新：/.test(beforeReport)) {
      purchaseType = 'subscription';
      billingCycle = 'monthly';
    }
    if (/\(年額\)|（年額）/.test(beforeReport)) {
      purchaseType = 'subscription';
      billingCycle = 'yearly';
    }
    if (/アプリ内課金|App\s*内課金/.test(beforeReport)) {
      purchaseType = 'in_app_purchase';
    }

    let content = beforeReport.replace(/^.*?App\s*Store\s*/, '');
    content = content.replace(/\s*更新：.*$/, '');
    content = content.replace(/\s*(?:アプリ内課金|App\s*内課金).*$/, '');
    content = content.replace(/\s*[（\(](?:月額|年額)[）\)].*$/, '');

    const parts = content.trim();

    const knownApps = [
      /^(ARK:\s*Ultimate Mobile Edition)\s+(.+)$/i,
      /^(ブロスタ)\s+(.+)$/i,
      /^(クラッシュ・ロワイヤル)\s+(.+)$/i,
      /^(クラッシュ・オブ・クラン)\s+(.+)$/i,
      /^(Tinder)\s+(.+)$/i,
      /^(YouTube)\s+(.+)$/i,
      /^(LINE)\s+(.+)$/i,
    ];

    let matched = false;
    for (const pattern of knownApps) {
      const appMatch = parts.match(pattern);
      if (appMatch) {
        appName = appMatch[1];
        itemName = appMatch[2];
        matched = true;
        break;
      }
    }

    if (!matched && parts.length > 0) {
      const itemMatch = parts.match(/^(.+?)\s+([A-Z][A-Z0-9\s\-]+(?:Pass|Premium|Plus|Pro|Coin|パック|UPGRADE).*)$/i);
      if (itemMatch) {
        appName = itemMatch[1].trim();
        itemName = itemMatch[2].trim();
      } else {
        appName = parts;
      }
    }

    if (appName) {
      const isDuplicate = purchases.some(p => p.name === appName && p.price === price);
      if (!isDuplicate) {
        purchases.push({ appName, itemName, price, purchaseType, billingCycle });
      }
    }
  }

  return purchases;
}

// テストデータ（実際のHTMLから変換したテキスト）
const testBody = `請求書 APPLE ACCOUNT nakakou2002@icloud.com 請求先 Amex .... 1007 nakanishikoki 520-3013 滋賀県 草津市 栗東市目川613-65 JPN 日付 2026年1月3日 ご注文番号 MS728KXVM8 書類番号 798071906261 App Store ARK: Ultimate Mobile Edition ARK Pass - Monthly (月額) 更新：2026年2月2日 問題を報告する ¥700 JCT（ 10% ）を含む ¥64 ブロスタ BRAWL PASS PLUS UPGRADE アプリ内課金 大にっし〜 問題を報告する ¥800 JCT（ 10% ）を含む ¥73 小計 ¥1,363 JCT10%課税 ¥137 合計 ¥1,500`;

console.log('=== 新しいパーサーのテスト ===\n');

const results = extractApplePurchases(testBody);

console.log('\n抽出結果:');
results.forEach(r => {
  console.log(`  ${r.appName}${r.itemName ? ' - ' + r.itemName : ''}: ¥${r.price} (${r.purchaseType})`);
});

console.log(`\n合計: ${results.length}件`);
