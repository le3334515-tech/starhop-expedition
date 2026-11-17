import { test, expect } from '@playwright/test';
import { JA } from '../assets/game-core.js';

function trial(weapon = 'blade') {
  const g = new JA(); g.start({ seed: 42, modifier: 'standard', weapon });
  g.state.transition = 0; return g;
}

test('each blade swing damages a crate once; break rewards are not duplicated', () => {
  const g = trial(), box = g.state.trial.crates[1];
  Object.assign(g.state.hero, { x: box.x - 42, y: 412, facing: 1 });
  g.attack(); g.advanceAction(.06, {});
  for (let i = 0; i < 5; i++) g.updateAttacks(.001);
  expect(box.hp).toBeCloseTo(.65); expect(box.broken).toBe(false);
  g.cancelAction(); g.state.hero.comboWindow = 0; g.attack(); g.advanceAction(.06, {}); g.updateAttacks(.001);
  expect(box.broken).toBe(true);
  const drops = g.state.pickups.filter(p => p.id > 50000);
  expect(drops.map(p => p.kind).sort()).toEqual(['coin', 'coin', 'heart']);
  for (let i = 0; i < 10; i++) g.updateAttacks(.001);
  expect(g.state.pickups.filter(p => p.id > 50000)).toHaveLength(3);
});

for (const weapon of ['ember', 'disc']) test(`${weapon} can break crates using released projectiles`, () => {
  const g = trial(weapon), box = g.state.trial.crates[0];
  g.state.enemies = []; Object.assign(g.state.hero, { x: box.x - 55, y: 412, facing: 1 });
  for (let shot = 0; shot < 3 && !box.broken; shot++) {
    g.cancelAction(); g.state.hero.stamina = 100;
    g.attack({ attackHeld: weapon === 'ember' }); g.advanceAction(weapon === 'ember' ? .49 : .09, { attackHeld: true });
    for (let n = 0; n < 80; n++) g.updateAttacks(1 / 120);
  }
  expect(box.broken).toBe(true);
});

test('checkpoint heals only once, records fall return, and stays fixed while walking', () => {
  const g = trial(), h = g.state.hero, flag = g.state.trial.checkpoints[1];
  g.state.enemies = []; g.state.pickups = []; g.state.roomCleared = true;
  Object.assign(h, { x: flag.x - h.w / 2, y: 448 - h.h, hp: 2, grounded: true });
  g.update(1 / 120, {});
  expect(flag.active).toBe(true); expect(h.hp).toBe(3);
  const checkpoint = { ...g.state.room.checkpoint };
  for (let i = 0; i < 160; i++) g.update(1 / 120, { right: true });
  expect(g.state.room.checkpoint).toEqual(checkpoint);
  g.respawnFromFall(); expect(h.x).toBe(checkpoint.x);
  g.update(1 / 120, {}); expect(h.hp).toBe(3);
});

test('full-health apple remains; real collection triggers a bounded animation', () => {
  const g = trial(), h = g.state.hero;
  g.state.pickups = [{ id: 99, kind: 'heart', x: h.x, y: h.y, w: 14, h: 16, value: 1, vy: 0, bob: 0, collected: false }];
  g.updatePickups(.01); expect(g.state.pickups).toHaveLength(1); expect(g.state.trial.effects).toHaveLength(0);
  h.hp--; g.updatePickups(.01);
  expect(h.hp).toBe(h.maxHp); expect(g.state.pickups).toHaveLength(0); expect(g.state.trial.effects).toHaveLength(1);
  g.state.enemies = [];
  for (let i = 0; i < 40; i++) g.update(1 / 120, {});
  expect(g.state.trial.effects).toHaveLength(0);
});

test('tree seed commits its aim and can be parried back at its source', () => {
  const g = trial(), h = g.state.hero, tree = g.state.enemies.find(e => e.role === 'trunk' && !e.optional);
  g.state.enemies = [tree]; Object.assign(h, { x: tree.x - 200, y: 412, facing: 1 });
  g.prepareMonster(tree); g.monsterWindup(tree);
  const aim = [tree.ai.aimX, tree.ai.aimY]; h.y = 300;
  for (let i = 0; i < 70; i++) g.updateEnemies(1 / 120);
  const seed = g.state.projectiles[0]; expect(seed.skin).toBe('seed');
  expect([tree.ai.aimX, tree.ai.aimY]).toEqual(aim);
  Object.assign(h, { y: 412, blocking: true, guardAge: .05, invincible: 0 });
  Object.assign(seed, { x: h.x + 12, y: h.y + 14, vx: -250, vy: 0 });
  g.updateAttacks(.001);
  expect(seed.owner).toBe('hero'); expect(seed.vx).toBeGreaterThan(0); expect(h.parryRiposte).toBeGreaterThan(0);
});

test('bat hovers without passive contact damage, dives then recovers altitude', () => {
  const g = trial(), bat = g.state.enemies.find(e => e.role === 'bat');
  g.state.enemies = [bat]; g.prepareMonster(bat);
  Object.assign(g.state.hero, { x: bat.x - 80, y: 412 });
  const hp = g.state.hero.hp; g.enemyContact(); expect(g.state.hero.hp).toBe(hp);
  g.monsterWindup(bat); const x = bat.x;
  for (let i = 0; i < 68; i++) g.updateEnemies(1 / 120);
  expect(bat.ai.phase).toBe('active'); expect(bat.x).toBe(x);
  g.updateEnemies(.12); expect(bat.x).toBeLessThan(x - 20);
  // Force no new target while checking post-dive recovery, without moving bat.
  g.state.hero.x = 0;
  for (let i = 0; i < 190; i++) g.updateEnemies(1 / 120);
  expect(Math.abs(bat.y - bat.originY)).toBeLessThan(12);
  g.staggerTarget(bat); const y = bat.y;
  g.updateEnemies(.02); expect(bat.ai.phase).toBe('stagger'); expect(Math.abs(bat.y - y)).toBeLessThan(3);
});

test('new sprite strips load and the forest trial renders without browser errors', async ({ page }) => {
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().includes('ashen-cloister') && !r.ok()) missing.push(r.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  const loaded = await page.evaluate(async () => (await import('/assets/forest-art.js')).forestSpritesReady);
  expect(loaded).toHaveLength(17); expect(loaded.every(Boolean)).toBe(true);
  await page.getByRole('button', { name: /开启试炼/ }).click();
  await page.getByRole('button', { name: /我明白了，开始试炼/ }).click();
  await page.waitForTimeout(400);
  await page.locator('.game-shell').screenshot({ path: 'preview-forest-start.png' });
  // Visual inspection of later scenery, separate from the real input playthrough tests.
  await page.evaluate(async () => {
    const g = (await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine;
    Object.assign(g.state.hero, { x: 1880, y: 412, invincible: 4 }); g.state.cameraX = 1660;
  });
  await page.waitForTimeout(350);
  await page.locator('.game-shell').screenshot({ path: 'preview-forest-checkpoint.png' });
  expect(errors).toEqual([]); expect(missing).toEqual([]);
});
