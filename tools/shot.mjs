// Capturas de pantalla para revisar escenas: node tools/shot.mjs "<query>" out.png [esperas ms...] [--click x,y@ms ...]
import { chromium } from 'playwright';

const [, , query = '', out = 'shot.png', ...rest] = process.argv;
const waits = rest.filter((a) => /^\d+$/.test(a)).map(Number);
const actions = rest.filter((a) => a.startsWith('--')).map((a) => a.slice(2));
const base = process.env.URL ?? 'http://localhost:5173/';

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto(base + (query ? `?${query}` : ''));
let t = 0;
const shots = waits.length ? waits : [2500];
for (let i = 0; i < shots.length; i++) {
  const target = shots[i];
  // acciones programadas antes de esta captura
  for (const a of actions) {
    const [what, at] = a.split('@');
    const ms = Number(at ?? 0);
    if (ms > t && ms <= target) {
      await page.waitForTimeout(ms - t);
      t = ms;
      if (what.startsWith('click:')) {
        const [x, y] = what.slice(6).split(',').map(Number);
        await page.mouse.click(x, y);
      } else if (what.startsWith('key:')) {
        await page.keyboard.press(what.slice(4));
      } else if (what.startsWith('hold:')) {
        const [x, y, d] = what.slice(5).split(',').map(Number);
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.waitForTimeout(d);
        await page.mouse.up();
        t += d;
      }
    }
  }
  await page.waitForTimeout(Math.max(0, target - t));
  t = target;
  const name = shots.length > 1 ? out.replace(/\.png$/, `-${i}.png`) : out;
  await page.screenshot({ path: name });
}
if (errors.length) console.log('ERRORES:\n' + errors.join('\n'));
await browser.close();
