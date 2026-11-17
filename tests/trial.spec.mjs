import { test, expect } from '@playwright/test';
import { JA } from '../assets/game-core.js';
import { createTrialMap } from '../assets/trial-map.js';
import { playTrial } from '../scripts/playtest-trial.mjs';

for (const weapon of ['blade', 'ember', 'disc']) {
  for (const seed of [12345, 7, 42]) {
    test(`${weapon} completes the main trial with normal inputs, seed ${seed}`, () => {
      const result = playTrial(weapon, seed);
      expect(result.phase, JSON.stringify(result)).toBe('victory');
      expect(result.remaining).toEqual([]); expect(result.health).toBeGreaterThan(0);
    });
  }
}

test('optional guard does not lock the main exit; finishing the trial creates a real result', () => {
  const g = new JA(); g.start({ seed: 42, modifier: 'standard', weapon: 'blade' });
  g.state.enemies.filter(e => !e.optional).forEach(e => e.dead = true);
  g.update(1 / 120); expect(g.state.roomCleared).toBe(true);
  expect(g.state.enemies.find(e => e.optional).dead).toBe(false);
  Object.assign(g.state.hero, { x: 2920, y: 412 }); g.update(1 / 120, { interactPressed: true });
  expect(g.state.phase).toBe('victory'); expect(g.state.result.won).toBe(true);
  expect(g.state.result.roomsCleared).toBe(1); expect(g.state.trial.reward).toBe(false);
});

test('reward route is reachable through actual double jumps and returns to the main floor', () => {
  const g = new JA(); g.start({ seed: 42, modifier: 'standard', weapon: 'blade' });
  // Isolate traversal geometry; combat on both routes has separate tests.
  g.state.enemies = []; g.state.pickups = []; g.state.roomCleared = true;
  const tick = input => g.update(1 / 120, input || {});
  const walkTo = x => {
    for (let n = 0; n < 1600; n++) {
      const h = g.state.hero;
      if (Math.abs(h.x - x) < 4 && Math.abs(h.vx) < 30) return;
      tick({ left: h.x > x + 2, right: h.x < x - 2 });
    }
    throw new Error(`Unable to walk to ${x}`);
  };
  for (let n = 0; n < 20; n++) tick();
  walkTo(790);
  for (const [x, floor] of [[862, 370], [1030, 302], [1190, 234]]) {
    let landed = false;
    for (let n = 0; n < 600; n++) {
      const h = g.state.hero;
      if (n > 15 && h.grounded && Math.abs(h.y + h.h - floor) < 2 && Math.abs(h.x - x) < 16) { landed = true; break; }
      tick({ left: h.x > x + 3, right: h.x < x - 3, jumpPressed: n === 0 || n === 28, jumpHeld: n < 65 });
    }
    expect(landed, `ledge ${x}`).toBe(true);
  }
  walkTo(1436); tick({ interactPressed: true });
  expect(g.state.trial.reward).toBe(true); expect(g.state.hero.damage).toBeCloseTo(1.35); expect(g.state.hero.shield).toBe(1);
  const coins = g.state.coins; tick({ interactPressed: true }); expect(g.state.coins).toBe(coins);
  walkTo(1850);
  for (let n = 0; n < 160; n++) tick();
  expect(g.state.hero.y + g.state.hero.h).toBeCloseTo(448); expect(g.state.hero.hp).toBe(5);
});

test('reward chest requires its guard and interaction, and grants only once', () => {
  const g = new JA(); g.start({ seed: 42, modifier: 'standard', weapon: 'blade' });
  Object.assign(g.state.hero, { x: 1436, y: 198 });
  g.update(1 / 120, { interactPressed: true }); expect(g.state.trial.reward).toBe(false);
  g.state.enemies.find(e => e.optional).dead = true;
  g.update(1 / 120, { interactPressed: true }); expect(g.state.trial.reward).toBe(true);
  const damage = g.state.hero.damage; g.update(1 / 120, { interactPressed: true }); expect(g.state.hero.damage).toBe(damage);
});

test('elite delays its second swing; staggering cancels the active attack', () => {
  const g = new JA(); g.start({ seed: 42, modifier: 'standard', weapon: 'blade' });
  const elite = g.state.enemies.find(e => e.elite); g.prepareMonster(elite);
  Object.assign(g.state.hero, { x: elite.x - 50, y: 412 });
  g.monsterWindup(elite);
  const attacks = []; let time = 0;
  g.receiveAttack = attack => { attacks.push({ time, source: attack.source }); return { result: 'evaded' }; };
  for (let n = 0; n < 180; n++) { time += 1 / 120; g.updateEnemies(1 / 120); }
  expect(attacks).toHaveLength(2); expect(attacks[1].time - attacks[0].time).toBeGreaterThan(.4);
  g.staggerTarget(elite); attacks.length = 0;
  for (let n = 0; n < 40; n++) g.updateEnemies(1 / 120);
  expect(attacks).toHaveLength(0);
});

test('trial generation is reproducible and required actors have support', () => {
  const map = createTrialMap(42); expect(map).toEqual(createTrialMap(42));
  expect(map.enemies.filter(e => e.elite)).toHaveLength(1);
  expect(map.enemies.filter(e => e.optional)).toHaveLength(2);
  for (const enemy of map.enemies.filter(e => e.role !== 'bat')) expect(map.room.platforms.some(p => Math.abs(enemy.y + enemy.h - p.y) < 1 && enemy.x >= p.x && enemy.x + enemy.w <= p.x + p.w)).toBe(true);
  expect(map.enemies.find(e => e.role === 'bat').y).toBeLessThan(420);
});

test('multiple projectiles upgrade keeps separate ids and disc capacity', () => {
  const g = new JA(); g.start({ seed: 42, modifier: 'standard', weapon: 'disc' });
  g.state.hero.extraProjectiles = 2; g.attack(); g.advanceAction(.09, { attackHeld: true });
  expect(g.state.projectiles).toHaveLength(3);
  expect(new Set(g.state.projectiles.map(p => p.id)).size).toBe(3);
});
