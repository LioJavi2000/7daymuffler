import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function nextFilename(label) {
  const files = fs.existsSync(screenshotsDir)
    ? fs.readdirSync(screenshotsDir).filter(f => f.startsWith('screenshot-'))
    : [];
  const nums = files.map(f => {
    const m = f.match(/^screenshot-(\d+)/);
    return m ? parseInt(m[1]) : 0;
  });
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return label
    ? path.join(screenshotsDir, `screenshot-${n}-${label}.png`)
    : path.join(screenshotsDir, `screenshot-${n}.png`);
}

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const outFile = nextFilename(label);

const browser = await puppeteer.launch({
  executablePath: (() => {
    const base = 'C:/Users/jbern/.cache/puppeteer/chrome';
    if (!fs.existsSync(base)) return undefined;
    const builds = fs.readdirSync(base);
    if (!builds.length) return undefined;
    const exe = path.join(base, builds[0], 'chrome-win64', 'chrome.exe');
    return fs.existsSync(exe) ? exe : undefined;
  })(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Force all reveal elements visible and counters complete for screenshot
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  document.querySelectorAll('[data-count]').forEach(el => {
    const t = parseInt(el.dataset.count);
    if (!isNaN(t)) el.textContent = t + (t === 155 ? '+' : '');
  });
});
// Allow images and fonts to settle
await new Promise(r => setTimeout(r, 2000));

await page.screenshot({ path: outFile, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${outFile}`);
