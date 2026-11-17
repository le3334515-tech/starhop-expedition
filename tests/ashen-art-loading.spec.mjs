import { test, expect } from '@playwright/test';

async function observeTextureLoads(page) {
  await page.addInitScript(() => {
    window.__ashenLoading = { loaded: [], failed: [], backgroundDraws: 0, woodClips: 0 };
    const original = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...original,
      set(value) {
        if (String(value).includes('/art/ashen-cloister/')) {
          const name = String(value).split('/').pop().split('?')[0];
          this.addEventListener('load', () => window.__ashenLoading.loaded.push(name), { once: true });
          this.addEventListener('error', () => window.__ashenLoading.failed.push(name), { once: true });
        }
        original.set.call(this, value);
      },
    });
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image?.src?.includes('/art/ashen-cloister/background.png')) window.__ashenLoading.backgroundDraws++;
      return drawImage.call(this, image, ...args);
    };
    const rect = CanvasRenderingContext2D.prototype.rect;
    CanvasRenderingContext2D.prototype.rect = function (x, y, width, height) {
      if (x === 830 && y === 370 && width === 130 && height === 22) window.__ashenLoading.woodClips++;
      return rect.call(this, x, y, width, height);
    };
  });
}

async function state(page) {
  return page.evaluate(async () => {
    const { gameEngine } = await import(document.querySelector('script[type="module"][src*="game.js"]').src);
    return { phase: gameEngine.state.phase, x: gameEngine.state.hero.x, time: gameEngine.state.time };
  });
}

test('stone arriving before foundation and timber cannot stop the menu or fifty-floor campaign', async ({ page }, testInfo) => {
  const errors = [], delayedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await observeTextureLoads(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/art\/ashen-cloister\/(foundation|timber)\.png(?:\?.*)?$/, async route => {
    delayedRequests.push(route.request().url());
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-action="start"]')).toBeEnabled();
    await expect.poll(() => page.evaluate(() => ['stone.png', 'background.png'].every(name => window.__ashenLoading.loaded.includes(name)))).toBe(true);
    await expect.poll(() => delayedRequests.length).toBeGreaterThanOrEqual(2);
    const whileDelayed = await page.evaluate(() => structuredClone(window.__ashenLoading));
    expect(whileDelayed.loaded).not.toContain('foundation.png');
    expect(whileDelayed.loaded).not.toContain('timber.png');
    const drawsBefore = whileDelayed.backgroundDraws;
    await page.waitForTimeout(250);
    expect(errors).toEqual([]);
    await expect.poll(() => page.evaluate(() => window.__ashenLoading.backgroundDraws)).toBeGreaterThan(drawsBefore + 2);
    await page.locator('[data-action="campaign-start"]').click();
    await page.getByRole('button', { name: '我明白了，开始远征' }).click();
    await expect(page.locator('.game-shell')).toHaveAttribute('data-phase', 'loading');
    release();
    await expect(page.locator('.game-shell')).toHaveAttribute('data-phase', 'playing');
    await expect(page.locator('#room-count')).toHaveText('01 / 50');
    const before = await state(page);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(350);
    await page.keyboard.up('KeyD');
    const after = await state(page);
    expect(after.x).toBeGreaterThan(before.x + 20);
    expect(after.time).toBeGreaterThan(before.time);
    expect(errors).toEqual([]);
    await testInfo.attach('out-of-order-textures.json', {
      body: Buffer.from(JSON.stringify({ delayedRequests, whileDelayed, afterRelease: await page.evaluate(() => window.__ashenLoading), before, after, errors }, null, 2)),
      contentType: 'application/json',
    });
  } finally {
    release();
  }
});

test('a permanently missing timber image falls back while visible wooden platforms and gameplay keep rendering', async ({ page }, testInfo) => {
  const errors = [], blockedTimber = [];
  page.on('pageerror', error => errors.push(error.message));
  await observeTextureLoads(page);
  await page.route(/\/art\/ashen-cloister\/timber\.png(?:\?.*)?$/, async route => {
    blockedTimber.push(route.request().url());
    await route.abort('failed');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-action="start"]')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => ['stone.png', 'foundation.png', 'background.png'].every(name => window.__ashenLoading.loaded.includes(name)))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__ashenLoading.failed.includes('timber.png'))).toBe(true);
  await page.locator('[data-action="start"]').click();
  await page.getByRole('button', { name: '我明白了，开始试炼' }).click();
  await expect(page.locator('.game-shell')).toHaveAttribute('data-phase', 'playing');
  await expect.poll(() => page.evaluate(() => window.__ashenLoading.woodClips)).toBeGreaterThan(2);
  const before = await state(page);
  const woodClipsBefore = await page.evaluate(() => window.__ashenLoading.woodClips);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');
  const after = await state(page);
  expect(after.x).toBeGreaterThan(before.x + 20);
  expect(after.time).toBeGreaterThan(before.time);
  expect(await page.evaluate(() => window.__ashenLoading.woodClips)).toBeGreaterThan(woodClipsBefore + 2);
  expect(blockedTimber.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await testInfo.attach('missing-timber-fallback.json', {
    body: Buffer.from(JSON.stringify({ blockedTimber, textures: await page.evaluate(() => window.__ashenLoading), before, after, errors }, null, 2)),
    contentType: 'application/json',
  });
});
