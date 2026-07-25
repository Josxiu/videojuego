// Smoke test: recorre el flujo completo del juego y falla si hay errores de consola.
// Uso: npm run dev (en otra terminal) y luego `npm run test:smoke`
// Opcional: CHROMIUM_PATH=/ruta/a/chromium para usar un navegador ya instalado.
import { chromium } from 'playwright';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
const results = [];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
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

const closeDialogue = async (page, scene) => {
  await page.waitForFunction(
    (sc) => window.__game.scene.getScene(sc)?.dialogue?.active,
    scene,
    { timeout: 25000 },
  );
  for (let i = 0; i < 40; i++) {
    const active = await page.evaluate(
      (sc) => window.__game.scene.getScene(sc).dialogue.active,
      scene,
    );
    if (!active) return;
    await page.mouse.click(480, 180);
    await page.waitForTimeout(200);
  }
};

// 1. Flujo real: menú → intro → hub
await check('menú → intro → hub', async (page) => {
  await page.goto(BASE);
  await waitScene(page, 'MainMenu');
  await page.waitForTimeout(800);
  await page.mouse.click(480, 428); // Jugar
  await waitScene(page, 'Intro');
  for (let i = 0; i < 9; i++) {
    await page.waitForTimeout(1100);
    await page.mouse.click(480, 300);
    const inHub = await page.evaluate(() => window.__game.scene.isActive('Hub'));
    if (inHub) break;
  }
  await waitScene(page, 'Hub');
});

// 2. Cada escena carga sin errores
for (const scene of ['Hub', 'DreamExam', 'DreamFall', 'DreamForest', 'DreamChase', 'Ending', 'Gallery']) {
  await check(`escena ${scene}`, async (page) => {
    await page.goto(`${BASE}?scene=${scene}`);
    await waitScene(page, scene);
    await page.waitForTimeout(2500);
  });
}

// 3. Emulación táctil: los controles en pantalla no rompen nada
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
  await tp.goto(`${BASE}?scene=Hub`);
  await tp.waitForFunction(() => window.__game?.scene?.isActive('Hub'), null, { timeout: 25000 });
  await tp.waitForTimeout(2000);
  await tp.touchscreen.tap(480, 270);
  await tp.waitForTimeout(500);
  if (errs.length) throw new Error(errs.join(' | '));
  await ctx.close();
});

// 4. Sin WebGL: los shaders de post-procesado deben omitirse sin romper el juego
await check('degradación sin WebGL (Canvas)', async (page) => {
  await page.close();
  const soft = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--disable-gpu', '--disable-webgl', '--disable-webgl2', '--disable-3d-apis'],
  });
  const sp = await soft.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  sp.on('pageerror', (e) => errs.push(String(e)));
  for (const scene of ['Hub', 'DreamExam', 'DreamChase']) {
    await sp.goto(`${BASE}?scene=${scene}`);
    await sp.waitForFunction((s) => window.__game?.scene?.isActive(s), scene, { timeout: 25000 });
    await sp.waitForTimeout(1500);
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
