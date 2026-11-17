import { attackBox, intersects } from './combat-actions.js';

// Interactive scenery uses the same action windows and projectiles as combat.
export function installForestRuntime(Engine) {
  const p = Engine.prototype, attacks = p.updateAttacks, pickups = p.updatePickups, step = p.step;
  p.damageCrate = function (crate, damage) {
    if (crate.broken) return;
    crate.hp -= damage; crate.hitAge = 0;
    this.sound('hit'); this.burst(crate.x + 19, crate.y + 12, '#b69c70', 6, 90);
    if (crate.hp > 0) return;
    crate.broken = true; crate.breakAge = 0;
    this.sound('heavy'); this.state.shake = Math.max(this.state.shake, 2);
    this.burst(crate.x + 19, crate.y + 16, '#9d8862', 14, 150);
    this.drop('coin', crate.x + 8, crate.y, 2);
    this.drop('coin', crate.x + 25, crate.y - 5, 1);
    if (crate.heart) this.drop('heart', crate.x + 17, crate.y - 18, 1);
  };
  p.updateAttacks = function (dt) {
    // Resolve crates before projectile lifetime cleanup. A non-piercing shot is
    // consumed by the first crate; a returning disc may hit it once per pass.
    const s = this.state, h = s.hero, trial = s.trial, action = h.action;
    if (trial) for (const crate of trial.crates) {
      if (crate.broken) continue;
      const id = `crate-${crate.id}`;
      if (action?.phase === 'active' && action.weapon === 'blade' && !action.hitTargets.has(id) && intersects(attackBox(h, action.spec.reach, action.spec.height, action.facing), crate)) {
        action.hitTargets.add(id); this.damageCrate(crate, action.spec.power);
      }
      for (const shot of s.projectiles) if (!crate.broken && shot.owner === 'hero' && shot.life > 0 && !shot.hitIds.includes(id)) {
        // Include the upcoming movement so fast projectiles cannot skip a box.
        const box = { x: Math.min(shot.x, shot.x + shot.vx * dt), y: Math.min(shot.y, shot.y + shot.vy * dt), w: shot.w + Math.abs(shot.vx * dt), h: shot.h + Math.abs(shot.vy * dt) };
        if (!intersects(box, crate)) continue;
        shot.hitIds.push(id); this.damageCrate(crate, shot.damage);
        if (shot.kind !== 'disc') shot.life = 0;
      }
    }
    attacks.call(this, dt);
  };
  p.updatePickups = function (dt) {
    const s = this.state, before = s.trial ? [...s.pickups] : [];
    pickups.call(this, dt);
    if (!s.trial) return;
    for (const item of before) if (item.collected && item.y < 550) {
      s.trial.effects.push({ x: item.x + item.w / 2, y: item.y + item.h / 2, age: 0, kind: 'collected', tint: item.kind });
    }
  };
  p.step = function (dt, input) {
    const s = this.state, trial = s.trial;
    if (trial && s.phase === 'playing') {
      for (const crate of trial.crates) { crate.hitAge += dt; if (crate.broken) crate.breakAge += dt; }
      for (const flag of trial.checkpoints) if (flag.active) flag.age += dt;
      for (const effect of trial.effects) effect.age += dt;
      trial.effects = trial.effects.filter(e => e.age < .3);
    }
    step.call(this, dt, input);
    if (!trial || s.phase !== 'playing') return;
    const h = s.hero;
    for (const flag of trial.checkpoints) {
      if (flag.active || !h.grounded || Math.abs(h.x + h.w / 2 - flag.x) > 42 || Math.abs(h.y + h.h - flag.y) > 8) continue;
      if (s.enemies.some(e => !e.dead && Math.hypot(e.x - flag.x, e.y + e.h - flag.y) < 140)) continue;
      flag.active = true; flag.age = 0;
      s.room.checkpoint = { x: flag.x - h.w / 2, y: flag.y - h.h };
      h.hp = Math.min(h.maxHp, h.hp + 1); h.stamina = 100;
      this.sound('upgrade'); this.burst(flag.x, flag.y - 30, '#c5dab0', 16, 90);
      this.label(flag.x, flag.y - 80, '烛火燃起 · 恢复 +1 ♥', '#d7dfb2');
    }
  };
}
