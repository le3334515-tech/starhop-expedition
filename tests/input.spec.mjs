import { test, expect } from '@playwright/test';

async function start(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /开启(?:远征|试炼)/ }).click();
  await page.getByRole('button', { name: /我明白了，开始试炼/ }).click();
  await expect(page.locator('.game-shell')).toHaveAttribute('data-phase', 'playing');
}

test('keyboard remapping rejects conflicts, works, and persists after reload', async ({ page }) => {
  await start(page); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /按键布局/ }).click();
  await page.locator('[data-bind="attack"]').click(); await page.keyboard.press('KeyA');
  await expect(page.locator('#binding-status')).toContainText('已用于');
  await page.keyboard.press('KeyV');
  await expect(page.locator('[data-bind="attack"]')).toHaveText('V');
  await page.locator('[data-bind="dash"]').click(); await page.keyboard.press('KeyC');
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyC');
  await expect.poll(() => page.locator('#stamina-fill').evaluate(e => parseFloat(e.style.width))).toBeLessThan(100);
  await page.reload(); await page.getByRole('button', { name: /开启(?:远征|试炼)/ }).click();
  await expect(page.locator('#guide-keyboard')).toContainText('V');
  await expect(page.locator('#guide-keyboard')).toContainText('C');
});

test('mobile joystick, guard and attack accept simultaneous touches and cancel cleanly', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  const joystick = page.locator('.touch-joystick'), guard = page.locator('.touch-guard'), attack = page.locator('[data-touch="attack"]');
  await expect(joystick).toBeVisible(); await expect(guard).toBeVisible();
  const box = await joystick.boundingBox(), gb = await guard.boundingBox(), ab = await attack.boundingBox();
  const client = await context.newCDPSession(page);
  const point = (x, y, id) => ({ x, y, id, radiusX: 5, radiusY: 5, force: 1 });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(box.x + box.width * .85, box.y + box.height / 2, 0), point(gb.x + gb.width / 2, gb.y + gb.height / 2, 1)] });
  await expect(joystick).toHaveClass(/pressed/); await expect(guard).toHaveClass(/pressed/);
  await page.waitForTimeout(100);
  await expect(page.locator('[data-guard-status]')).toHaveText('格挡');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(box.x + box.width * .85, box.y + box.height / 2, 0), point(gb.x + gb.width / 2, gb.y + gb.height / 2, 1), point(ab.x + ab.width / 2, ab.y + ab.height / 2, 2)] });
  await expect(attack).toHaveClass(/pressed/);
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(joystick).not.toHaveClass(/pressed/); await expect(guard).not.toHaveClass(/pressed/);
  await expect(attack).not.toHaveClass(/pressed/);
  expect(await joystick.evaluate(e => e.style.getPropertyValue('--stick-x'))).toBe('0px');
  await page.locator('.game-shell').screenshot({ path: 'preview-souls-mobile.png' });
  expect(errors).toEqual([]); await context.close();
});

test('touch layout editor can drag joystick and saves its position', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 600 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await start(page);
  await page.locator('[data-action="pause"]').first().click();
  await page.getByRole('button', { name: /按键布局/ }).click();
  await page.getByRole('button', { name: /拖动调整位置/ }).click();
  const stick = page.locator('.touch-joystick'), box = await stick.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 - 25); await page.mouse.up();
  await page.getByRole('button', { name: /保存布局/ }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('starhop.touch.v1')));
  expect(saved.positions.landscape.joystick.x).toBeGreaterThan(10);
  await context.close();
});

test('portrait fallback rotates joystick coordinates and clears movement on orientation change', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await start(page);
  await expect(page.locator('body')).toHaveClass(/virtual-landscape/);
  const stick = page.locator('.touch-joystick'), box = await stick.boundingBox();
  const client = await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 0, x: box.x + box.width / 2, y: box.y + box.height * .8 }] });
  const offset = await stick.evaluate(e => parseFloat(e.style.getPropertyValue('--stick-x')));
  expect(offset).toBeGreaterThan(0);
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(stick).not.toHaveClass(/pressed/);
  await expect(page.locator('body')).not.toHaveClass(/virtual-landscape/);
  await context.close();
});
