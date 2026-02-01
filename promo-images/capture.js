const puppeteer = require('puppeteer');
const path = require('path');

async function capturePromoImages() {
  console.log('🚀 Starting screenshot capture...\n');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // App Store 6.7インチサイズ: 1290 x 2796
  const width = 1290;
  const height = 2796;

  // HTMLファイルを開く
  const htmlPath = path.join(__dirname, 'promo-template.html');
  await page.goto(`file://${htmlPath}`);

  // フォントの読み込みを待つ
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));

  // 各カードをキャプチャ
  const cards = await page.$$('.promo-card');

  for (let i = 0; i < cards.length; i++) {
    const filename = `promo_${String(i + 1).padStart(2, '0')}.png`;
    const outputPath = path.join(__dirname, filename);

    // カードのスクリーンショットを撮影
    await cards[i].screenshot({
      path: outputPath,
      // デバイスピクセル比を調整してApp Storeサイズに近づける
      captureBeyondViewport: true,
    });

    console.log(`✅ Saved: ${filename}`);
  }

  await browser.close();

  console.log('\n🎉 Done! Screenshots saved to promo-images/');
  console.log('\n📐 Note: Images may need resizing to 1290x2796px for App Store');
}

capturePromoImages().catch(console.error);
