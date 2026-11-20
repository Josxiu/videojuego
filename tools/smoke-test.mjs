// Smoke test: recorre las 16 escenas del juego y falla si hay errores de consola.
// Uso: npm run preview (o dev) y luego `npm run test:smoke`
// Opcional: CHROMIUM_PATH=/ruta/a/chromium para usar un navegador ya instalado.
import { chromium } from 'playwright';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
const results = [];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function check(name, fn) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
  });
  try {
    await fn(page);
    results.push([name, errors.length === 0, errors.join(' | ')]);
  } catch (e) {
    results.push([name, false, String(e)]);
  }
  await page.close();
}

const waitScene = (page, scene) =>
  page.waitForFunction((sc) => window.__game?.scene?.isActive(sc), scene, { timeout: 25000 });

// 1. Flujo real: menú → intro → hub
await check('menú → intro → hub', async (page) => {
  await page.goto(BASE);
  await waitScene(page, 'MainMenu');
  await page.waitForTimeout(800);
  await page.mouse.click(250, 300); // Dormir
  await waitScene(page, 'Intro');
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(1000);
    await page.mouse.click(480, 300);
    const inHub = await page.evaluate(() => window.__game.scene.isActive('Hub'));
    if (inHub) break;
  }
  await waitScene(page, 'Hub');
});

// 2. Todas las escenas (Hub, Álbum, los 10 sueños, Epílogo y Galería) cargan sin errores
const ALL_SCENES = [
  'Hub',
  'Album',
  'DreamExam',
  'DreamFall',
  'DreamForest',
  'DreamShadow',
  'DreamEmbroidery',
  'DreamGlass',
  'DreamChase',
  'DreamWoodcut',
  'DreamChamber3D',
  'DreamSong',
  'Ending',
  'Gallery',
];

for (const scene of ALL_SCENES) {
  await check(`escena ${scene}`, async (page) => {
    await page.goto(`${BASE}?scene=${scene}`);
    await waitScene(page, scene);
    await page.waitForTimeout(1400);
  });
}

// 3. Emulación táctil de un dedo (celular) en Hub, escenas nuevas y 3D
await check('modo táctil (celular)', async (page) => {
  await page.close();
  const ctx = await browser.newContext({
    viewport: { width: 960, height: 540 },
    hasTouch: true,
    isMobile: true,
  });
  const tp = await ctx.newPage();
  const errs = [];
  tp.on('pageerror', (e) => errs.push(String(e)));
  tp.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const sc of ['Hub', 'DreamEmbroidery', 'DreamChamber3D']) {
    await tp.goto(`${BASE}?scene=${sc}`);
    await tp.waitForFunction((s) => window.__game?.scene?.isActive(s), sc, { timeout: 25000 });
    await tp.waitForTimeout(1200);
    await tp.touchscreen.tap(480, 270);
    await tp.waitForTimeout(350);
  }
  if (errs.length) throw new Error(errs.join(' | '));
  await ctx.close();
});

// 4. Sin WebGL: los shaders de post-procesado deben omitirse sin romper ninguno de los 10 sueños ni el 3D
await check('degradación sin WebGL (Canvas)', async (page) => {
  await page.close();
  const soft = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--disable-gpu', '--disable-webgl', '--disable-webgl2', '--disable-3d-apis'],
  });
  const sp = await soft.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  sp.on('pageerror', (e) => errs.push(String(e)));
  sp.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const scene of [
    'Hub',
    'Album',
    'DreamExam',
    'DreamFall',
    'DreamForest',
    'DreamShadow',
    'DreamEmbroidery',
    'DreamGlass',
    'DreamChase',
    'DreamWoodcut',
    'DreamChamber3D',
    'DreamSong',
  ]) {
    await sp.goto(`${BASE}?scene=${scene}`);
    await sp.waitForFunction((s) => window.__game?.scene?.isActive(s), scene, { timeout: 25000 });
    await sp.waitForTimeout(900);
  }
  const isCanvas = await sp.evaluate(() => window.__game.renderer.type === 1);
  await soft.close();
  if (!isCanvas) throw new Error('se esperaba el renderer Canvas para esta prueba');
  if (errs.length) throw new Error(errs.join(' | '));
});

let failed = 0;
for (const [name, ok, detail] of results) {
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : ' — ' + detail}`);
  if (!ok) failed += 1;
}
await browser.close();
process.exit(failed ? 1 : 0);
