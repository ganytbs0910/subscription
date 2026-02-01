const puppeteer = require('puppeteer');
const path = require('path');

async function captureIPadPromoImages() {
  console.log('🚀 Starting iPad screenshot capture...\n');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // HTMLファイルを開く
  const htmlPath = path.join(__dirname, 'promo-template-ipad.html');
  await page.goto(`file://${htmlPath}`);

  // フォントの読み込みを待つ
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));

  // 各カードをキャプチャ
  const cards = await page.$$('.promo-card');

  for (let i = 0; i < cards.length; i++) {
    const filename = `ipad_promo_${String(i + 1).padStart(2, '0')}.png`;
    const outputPath = path.join(__dirname, filename);

    await cards[i].screenshot({
      path: outputPath,
      captureBeyondViewport: true,
    });

    console.log(`✅ Saved: ${filename}`);
  }

  await browser.close();

  console.log('\n🎉 Done! iPad screenshots saved to promo-images/');
}

captureIPadPromoImages().catch(console.error);
