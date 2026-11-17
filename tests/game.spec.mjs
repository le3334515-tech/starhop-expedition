import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 2560, height: 1440 }, { width: 844, height: 390 }]) {
  test(`pixel renderer and controls at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();
    const size = await canvas.evaluate(c => ({ width: c.width, height: c.height }));
    expect(size.width).toBeGreaterThanOrEqual(1920);
    expect(size.width / size.height).toBeCloseTo(16 / 9);
    await page.getByRole('button', { name: /开启(?:远征|试炼)/ }).click();
    await page.getByRole('button', { name: /我明白了，开始试炼/ }).click();
    await expect(page.locator('.game-shell')).toHaveAttribute('data-phase', 'playing');
    await page.keyboard.down('KeyD');
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
    await page.keyboard.press('Shift');
    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(450);
    await page.keyboard.up('KeyJ');
    await page.keyboard.up('KeyD');
    await page.keyboard.press('Escape');
    await expect(page.locator('.game-shell')).toHaveAttribute('data-phase', 'paused');
    expect(errors).toEqual([]);
    if (viewport.width === 1440) {
      await page.keyboard.press('Escape');
      await page.locator('.game-shell').screenshot({ path: 'preview-pixel-game.png' });
    }
  });
}

for (const weapon of ['blade', 'ember', 'disc']) {
  test(`live browser synchronizes ${weapon} animation with its action and release`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
    await page.locator(`.weapon-option[data-weapon="${weapon}"]`).click();
    await page.getByRole('button', { name: /开启试炼/ }).click();
    await page.getByRole('button', { name: /我明白了，开始试炼/ }).click();
    await expect(page.locator('#room-count')).toHaveText('01 / 01');
    await expect(page.locator('#weapon-tactic')).toHaveText({ blade: '闪后追击 · 绕后背击', ember: '短按灼印 · 长按引爆', disc: '去回程命中 · 再按召回' }[weapon]);
    await page.keyboard.down('KeyJ');
    await expect.poll(() => page.evaluate(async () => (await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine.state.hero.action?.weapon)).toBe(weapon);
    if (weapon === 'ember') {
      await expect.poll(() => page.evaluate(async () => (await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine.state.projectiles.some(p => p.owner === 'hero' && p.charged))).toBe(true);
    } else if (weapon === 'disc') {
      await expect.poll(() => page.evaluate(async () => (await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine.state.projectiles.some(p => p.kind === 'disc'))).toBe(true);
    }
    await page.keyboard.up('KeyJ');
    expect(errors).toEqual([]);
  });
}
