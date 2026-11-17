import { test, expect } from '@playwright/test';
import { JA, mA } from '../assets/game-core.js';

function arena(weapon = 'blade') {
  const g = new JA(); g.start({ seed: 12345, modifier: 'standard', weapon });
  Object.assign(g.state.hero, { x: 100, y: 412, grounded: true, critChance: 0 });
  g.state.enemies = []; g.state.pickups = []; g.state.room.hazards = [];
  g.state.room.platforms = [{ x: 0, y: 448, w: 2250, h: 120, kind: 'ground' }];
  g.state.roomCleared = true; g.state.transition = 0; delete g.state.trial;
  return g;
}
function enemy(id, x, hp = 100) { return { id, kind: 'slime', x, y: 420, w: 32, h: 28, hp, maxHp: hp, facing: -1, vx: 0, vy: 0, timer: 0, hurt: 0, dead: false, originX: x, attackCooldown: 5 }; }
const tick = (g, input = {}, count = 1) => { for (let n = 0; n < count; n++) g.update(1 / 120, { left: false, right: false, jumpHeld: false, ...input }); };

test('tap jump clears low ledges; holding jumps higher; air steering responds', () => {
  function height(hold) {
    const g = arena(); let top = 412;
    tick(g, { jumpPressed: true, jumpHeld: true });
    for (let n = 0; n < 110; n++) { tick(g, { jumpHeld: n < hold, right: true }); top = Math.min(top, g.state.hero.y); }
    expect(g.state.hero.x).toBeGreaterThan(250);
    return 412 - top;
  }
  const tap = height(0), full = height(35);
  expect(tap).toBeGreaterThan(35); expect(full).toBeGreaterThan(tap + 30);
});

test('late jump from a ledge uses coyote time', () => {
  const g = arena(); Object.assign(g.state.hero, { grounded: false, coyote: .08, jumps: 0, y: 360 });
  tick(g, { jumpPressed: true, jumpHeld: true });
  expect(g.state.hero.vy).toBeLessThan(-500); expect(g.state.hero.jumps).toBe(1);
});

test('landing buffer executes jump without a second press', () => {
  const g = arena(); Object.assign(g.state.hero, { grounded: false, y: 404, vy: 200, jumps: 2 });
  tick(g, { jumpPressed: true, jumpHeld: true }); tick(g, { jumpHeld: true }, 10);
  expect(g.state.hero.vy).toBeLessThan(-400);
});

test('dodge damages a target once and cancels the attack recovery', () => {
  const g = arena(); const h = g.state.hero, target = enemy(17, 150); g.state.enemies = [target]; h.attackCooldown = 1;
  tick(g, { dashPressed: true }); tick(g, {}, 28);
  expect(target.hp).toBeCloseTo(98.9);
  expect(h.stamina).toBeCloseTo(80); expect(h.attackCooldown).toBe(0);
});

test('attack pressed during early dodge is buffered into a boosted chase', () => {
  const g = arena(); tick(g, { dashPressed: true }); tick(g, { attackPressed: true }); tick(g, {}, 13);
  expect(g.state.hero.attackTimer).toBeGreaterThan(0);
  expect(g.state.hero.dashTimer).toBe(0); expect(g.attackPower).toBeGreaterThan(1);
  expect(g.state.hero.stamina).toBeCloseTo(75);
});

test('jump pressed at dodge startup is buffered instead of being consumed in place', () => {
  const g = arena(); tick(g, { dashPressed: true, jumpPressed: true, jumpHeld: true });
  tick(g, { jumpHeld: true }, 26);
  expect(g.state.hero.y).toBeLessThan(400); expect(g.state.hero.vy).toBeLessThan(-300);
});

test('exhausted hero cannot dodge; stamina regenerates while resting', () => {
  const g = arena(); g.state.hero.stamina = 5;
  tick(g, { dashPressed: true }); expect(g.state.hero.dashTimer).toBe(0);
  tick(g, {}, 100); expect(g.state.hero.stamina).toBeGreaterThan(20);
});

test('front guard spends stamina, back and terrain damage bypass guard', () => {
  const g = arena(), h = g.state.hero;
  Object.assign(h, { blocking: true, guardAge: .3 });
  g.hurtHero(1, 160); expect(h.hp).toBe(5); expect(h.stamina).toBe(72);
  h.invincible = 0; g.hurtHero(1, 50); expect(h.hp).toBe(4);
  h.invincible = 0; g.hurtHero(1, 160, true); expect(h.hp).toBe(3);
});

test('precise guard affects the actual source and grants a counterattack', () => {
  const g = arena(), h = g.state.hero;
  Object.assign(h, { blocking: true, guardAge: .05, stamina: 50 });
  const boss = { active: true, hp: 100, maxHp: 100, guard: 12, maxGuard: 30, mode: 'charge', w: 104, h: 118, x: 180, y: 330 };
  g.state.boss = boss;
  g.receiveAttack({ damage: 1, sourceX: 180, source: boss, canParry: true });
  expect(h.hp).toBe(5); expect(h.stamina).toBe(66);
  expect(boss.mode).toBe('stagger'); expect(h.parryRiposte).toBeGreaterThan(1);
  g.attack(); expect(g.attackPower).toBeGreaterThanOrEqual(1.65);
});

test('holding guard does not reopen the parry window', () => {
  const g = arena(); tick(g, { guardHeld: true }, 35);
  expect(g.state.hero.guardAge).toBeGreaterThan(.16);
  g.hurtHero(1, 180); expect(g.state.hero.parryRiposte).toBe(0);
  expect(g.state.hero.stamina).toBe(72);
});

test('brief guard input during hitstop is not lost before simulation resumes', () => {
  const g = arena(); g.state.hitstop = .04;
  tick(g, { guardPressed: true }); tick(g, {}, 6);
  expect(g.state.hero.blocking).toBe(true); expect(g.state.hero.guardAge).toBeLessThan(.16);
});

test('guard breaks when stamina cannot absorb a hit', () => {
  const g = arena(), h = g.state.hero;
  Object.assign(h, { blocking: true, guardAge: .5, stamina: 10 });
  g.hurtHero(1, 180); expect(h.hp).toBe(4); expect(h.stamina).toBe(0); expect(h.guardBroken).toBeGreaterThan(0);
});

test('spikes bypass guard while preserving the normal hurt invulnerability', () => {
  const g = arena(), h = g.state.hero;
  Object.assign(h, { blocking: true, guardAge: .01 });
  g.hurtHero(1, 160, false, true); expect(h.hp).toBe(4);
  g.hurtHero(1, 160, false, true); expect(h.hp).toBe(4);
  expect(h.parryRiposte).toBe(0);
});

test('all upgrades heal once when levelling, never beyond max health', () => {
  const g = arena(), h = g.state.hero; h.hp = 2;
  g.gainXp(h.xpNeeded); expect(g.state.phase).toBe('upgrade'); expect(h.hp).toBe(3);
  g.chooseUpgrade(g.state.upgradeChoices.find(c => c.id !== 'vigor').id); expect(h.hp).toBe(3);
  h.hp = h.maxHp; g.gainXp(h.xpNeeded); expect(h.hp).toBe(h.maxHp);
});

test('staff releases after startup: tap marks, full charge is stronger', () => {
  const g = arena('ember'); g.attack();
  expect(g.state.projectiles).toHaveLength(0);
  g.advanceAction(.07, { attackHeld: false });
  const tap = g.state.projectiles[0]; expect(tap.charged).toBe(false);
  g.cancelAction(); g.attack({ attackHeld: true }); g.advanceAction(.48, { attackHeld: true });
  const charged = g.state.projectiles.at(-1); expect(charged.charged).toBe(true);
  expect(charged.damage).toBeGreaterThan(tap.damage * 2); expect(charged.poise).toBeGreaterThan(tap.poise);
});

test('third mark ignites once and splashes nearby targets without recursion', () => {
  const g = arena('ember'), a = enemy(11, 160), b = enemy(12, 195); g.state.enemies = [a, b];
  const hit = { type: 'ember', damage: 1, poise: 6, sourceX: 100, dir: 1 };
  g.applyPlayerAttack(a, hit); g.applyPlayerAttack(a, hit);
  expect(a.burnMarks).toBe(2); expect(b.hp).toBe(100);
  g.applyPlayerAttack(a, hit);
  expect(a.burnMarks).toBe(0); expect(b.hp).toBeLessThan(100);
  expect(g.state.floatingTexts.filter(t => t.text === '灼印引爆')).toHaveLength(1);
});

test('disc cannot flood the screen and returns stamina on catch', () => {
  const g = arena('disc'); g.state.hero.stamina = 40; g.attack(); g.advanceAction(.09, { attackHeld: true });
  const shot = g.state.projectiles[0]; expect(shot).toBeDefined();
  g.cancelAction(); expect(g.attack({ attackPressed: true })).toBe(false);
  expect(g.state.projectiles).toHaveLength(1); expect(shot.returning).toBe(true);
  Object.assign(shot, { x: 114, y: 430 });
  g.updateAttacks(1 / 120); expect(g.state.hero.stamina).toBe(41); expect(g.state.projectiles).toHaveLength(0);
  expect(g.state.hero.catchBoost).toBeGreaterThan(0);
});

test('disc return rewards hitting the same target on both passes', () => {
  const g = arena('disc'), a = enemy(11, 160), b = enemy(12, 160); g.state.enemies = [a, b];
  const hit = { type: 'disc', damage: 1, poise: 8, sourceX: 100, dir: 1, returning: true };
  g.applyPlayerAttack(a, hit); g.applyPlayerAttack(b, { ...hit, outboundHit: true });
  expect(b.hp).toBeLessThan(a.hp);
});

test('room layouts and supplies are deterministic, varied, and supported', () => {
  const variants = new Set();
  for (let seed = 1; seed < 50; seed++) {
    for (let room = 0; room < 7; room++) {
      const generated = mA(seed * 7919, room);
      expect(generated).toEqual(mA(seed * 7919, room)); variants.add(generated.room.encounter);
      for (const heart of generated.pickups.filter(p => p.kind === 'heart')) {
        expect(generated.room.platforms.some(p => heart.x + heart.w > p.x && heart.x < p.x + p.w && heart.y < p.y)).toBe(true);
      }
      expect(generated.room.platforms.every(p => p.x >= 0 && p.x + p.w <= generated.room.width)).toBe(true);
    }
  }
  expect(variants.size).toBe(4);
});

test('blade only hits during active frames, once per swing', () => {
  const g = arena(), target = enemy(20, 145); g.state.enemies = [target];
  g.attack(); tick(g, {}, 4); expect(target.hp).toBe(100);
  tick(g, {}, 5); expect(target.hp).toBeLessThan(100);
  const after = target.hp; tick(g, {}, 30); expect(target.hp).toBe(after);
});

test('startup has commitment; recovery cancellation closes the old hitbox', () => {
  const g = arena(); g.attack(); tick(g, {}, 3);
  const stamina = g.state.hero.stamina;
  expect(g.beginDodge()).toBe(false); expect(g.state.hero.stamina).toBe(stamina);
  tick(g, {}, 15); expect(g.beginDodge()).toBe(true);
  g.state.hero.dashTimer = 0;
  const target = enemy(21, 150); g.state.enemies = [target]; g.updateAttacks(1 / 120);
  expect(target.hp).toBe(100); expect(g.state.hero.action).toBeNull();
});

test('buffered light attack transitions into the next strike at its combo window', () => {
  const g = arena(); g.attack(); tick(g, {}, 16);
  const first = g.state.hero.action.id;
  tick(g, { attackPressed: true }); expect(g.state.hero.action.id).toBe(first);
  tick(g, {}, 10); expect(g.state.hero.action.id).toBeGreaterThan(first); expect(g.state.hero.attackStep).toBe(2);
});

test('passive enemy overlap does not hurt; telegraphed active attack does', () => {
  const g = arena(), target = enemy(22, 125); g.state.enemies = [target];
  g.enemyContact(); expect(g.state.hero.hp).toBe(5);
  tick(g, {}, 35); expect(g.state.hero.hp).toBe(5); expect(target.ai.phase).toBe('windup');
  tick(g, {}, 20); expect(g.state.hero.hp).toBe(4);
});

test('normal enemy parry does not stagger an unrelated boss', () => {
  const g = arena(), target = enemy(23, 150); g.prepareMonster(target);
  g.state.boss = { active: true, mode: 'charge', guard: 30 };
  Object.assign(g.state.hero, { blocking: true, guardAge: .05 });
  g.receiveAttack({ damage: 1, source: target, sourceX: 170, canParry: true });
  expect(target.ai.phase).toBe('stagger'); expect(g.state.boss.mode).toBe('charge');
});

test('death cancels an enemy attack and its unreflected missiles', () => {
  const g = arena(), target = { ...enemy(50, 180), role: 'ranged' }; g.prepareMonster(target); g.state.enemies = [target];
  g.state.projectiles.push({ id: 900, source: target, owner: 'enemy', life: 2, hitIds: [] });
  g.hitEnemy(target, 200); expect(target.ai.phase).toBe('dead'); expect(g.state.projectiles[0].life).toBe(0);
});

test('shield blocks frontal light hits and can be defeated by backstabs or poise breaks', () => {
  const g = arena(), target = { ...enemy(24, 155), role: 'shield' }; g.prepareMonster(target); g.state.enemies = [target];
  const attack = { type: 'blade', damage: 1, poise: 12, sourceX: 100, dir: 1 };
  expect(g.applyPlayerAttack(target, attack).result).toBe('blocked'); expect(target.hp).toBe(100);
  expect(g.applyPlayerAttack(target, { ...attack, sourceX: 210, dir: -1 }).result).toBe('critical');
  target.poise = 5;
  g.applyPlayerAttack(target, { ...attack, heavy: true, poise: 38 }); expect(target.ai.phase).toBe('stagger');
});

test('ranged monster commits its aim and encounters limit simultaneous attackers', () => {
  const g = arena(), target = { ...enemy(25, 320), role: 'ranged' }; g.state.enemies = [target];
  g.updateEnemies(.01); expect(target.ai.phase).toBe('windup');
  const aim = target.ai.aimX; g.state.hero.x = 600;
  g.updateEnemies(.65); g.updateEnemies(.01);
  expect(target.ai.aimX).toBe(aim); expect(g.state.projectiles[0].vx).toBeLessThan(0);
  g.state.enemies = [enemy(30, 640), enemy(31, 650), enemy(32, 660)];
  g.updateEnemies(.01);
  expect(g.state.enemies.filter(e => ['windup', 'active'].includes(e.ai.phase)).length).toBeLessThanOrEqual(2);
});
