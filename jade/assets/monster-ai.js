import { MONSTERS, attackBox, intersects } from './combat-actions.js';
import { canScheduleAttack } from './encounter-rules.js';

export function installMonsterAI(Engine) {
  const p = Engine.prototype;
  p.prepareMonster = function (enemy) {
    if (enemy.ai) return;
    enemy.role ||= enemy.elite ? 'elite' : enemy.kind === 'sentry' || enemy.kind === 'bat' ? 'ranged' : 'melee';
    const spec = MONSTERS[enemy.role];
    enemy.poiseMax = spec.poise; enemy.poise = spec.poise;
    enemy.ai = { phase: 'patrol', age: 0, duration: 0, sequence: 0, hit: false, released: false, attackId: 0, facing: enemy.facing || -1, aimX: 0, aimY: 0 };
  };
  p.monsterWindup = function (enemy, followup = false) {
    const ai = enemy.ai, h = this.state.hero, spec = MONSTERS[enemy.role];
    Object.assign(ai, { phase: 'windup', age: 0, duration: followup ? .38 : spec.startup, hit: false, released: false, attackId: ai.attackId + 1 });
    if (!followup) { ai.sequence = 0; ai.facing = h.x + h.w / 2 >= enemy.x + enemy.w / 2 ? 1 : -1; }
    enemy.facing = ai.facing;
    ai.aimX = h.x + h.w / 2; ai.aimY = h.y + h.h / 2;
    enemy.vx = 0;
  };
  p.updateEnemies = function (dt) {
    const s = this.state, h = s.hero;
    for (const enemy of s.enemies) {
      if (enemy.dead) continue;
      this.prepareMonster(enemy);
      const ai = enemy.ai, spec = MONSTERS[enemy.role];
      enemy.timer += dt; enemy.hurt = Math.max(0, enemy.hurt - dt); ai.age += dt;
      enemy.poiseDelay = Math.max(0, (enemy.poiseDelay || 0) - dt);
      if (enemy.poiseDelay <= 0 && ai.phase !== 'stagger') enemy.poise = Math.min(enemy.poiseMax, enemy.poise + 10 * dt);
      enemy.markLife = Math.max(0, (enemy.markLife || 0) - dt);
      if (enemy.markLife <= 0) enemy.burnMarks = 0;
      const dx = h.x + h.w / 2 - enemy.x - enemy.w / 2, distance = Math.abs(dx);
      const sameTier = Math.abs(h.y + h.h - enemy.y - enemy.h) < 100;
      if (ai.phase === 'stagger') {
        enemy.vx *= .8;
        if (ai.age >= ai.duration) { ai.phase = 'recovery'; ai.age = 0; ai.duration = .25; enemy.poise = enemy.poiseMax; }
      } else if (ai.phase === 'patrol' || ai.phase === 'approach') {
        if (distance < spec.detect && sameTier) {
          ai.phase = 'approach'; enemy.facing = dx >= 0 ? 1 : -1;
          const busy = s.enemies.filter(e => !e.dead && ['windup', 'active'].includes(e.ai?.phase)).length;
          const retreat=['ranged','trunk'].includes(enemy.role)&&distance<95&&Math.abs(enemy.x-enemy.originX)<130;
          if(retreat)enemy.vx=-enemy.facing*spec.speed*1.5;
          else if (distance <= spec.range && busy < 2 && canScheduleAttack(enemy,s)) this.monsterWindup(enemy);
          else if (['ranged', 'trunk'].includes(enemy.role) && distance < 120) enemy.vx = -enemy.facing * spec.speed;
          else enemy.vx = distance > spec.range * .8 ? enemy.facing * spec.speed : 0;
        } else {
          ai.phase = 'patrol';
          if (Math.abs(enemy.x - enemy.originX) > 55) enemy.facing = enemy.x > enemy.originX ? -1 : 1;
          enemy.vx = enemy.facing * spec.speed * .22;
        }
      } else if (ai.phase === 'windup') {
        enemy.vx = 0;
        if (ai.age >= ai.duration) { ai.phase = 'active'; ai.age = 0; ai.duration = spec.active; ai.hit = false; }
      } else if (ai.phase === 'active') {
        enemy.vx = enemy.role === 'elite' ? ai.facing * (ai.sequence === 0 ? 170 : 55) : enemy.role === 'rock' ? ai.facing * 150 : 0;
        if (enemy.role === 'bat') {
          const dx = ai.aimX - (enemy.x + enemy.w / 2), dy = ai.aimY - (enemy.y + enemy.h / 2);
          if (!ai.released) { const length = Math.hypot(dx, dy) || 1; ai.diveX = dx / length * 280; ai.diveY = dy / length * 280; ai.released = true; }
          enemy.vx = ai.diveX; enemy.vy = ai.diveY;
        }
        if (['ranged', 'trunk'].includes(enemy.role) && !ai.released) {
          ai.released = true;
          const x = enemy.x + enemy.w / 2, y = enemy.y + enemy.h * .4;
          const angle = Math.atan2(ai.aimY - y, ai.aimX - x);
          s.projectiles.push({ id: ++this.projectileId, kind: 'enemy', skin: enemy.role === 'trunk' ? 'seed' : undefined, x, y, w: 12, h: 12, vx: Math.cos(angle) * 250, vy: Math.sin(angle) * 250, life: 2.2, owner: 'enemy', damage: 1, source: enemy, hitIds: [] });
          this.sound('fire'); this.burst(x, y, '#ffbc8e', 5, 65);
        } else if (!['ranged', 'trunk'].includes(enemy.role) && !ai.hit && intersects(enemy.role === 'bat' ? { x: enemy.x - 6, y: enemy.y - 6, w: enemy.w + 12, h: enemy.h + 12 } : attackBox(enemy, spec.range, enemy.elite ? 72 : 48, ai.facing), h)) {
          ai.hit = true;
          this.receiveAttack({ id: `mob-${enemy.id}-${ai.attackId}`, source: enemy, sourceX: enemy.x + enemy.w / 2, type: 'melee', damage: 1, canBlock: true, canParry: true });
        }
        if (ai.phase === 'active' && ai.age >= ai.duration) {
          if (enemy.role === 'elite' && ai.sequence === 0) { ai.sequence = 1; this.monsterWindup(enemy, true); }
          else { ai.phase = 'recovery'; ai.age = 0; ai.duration = spec.recovery; enemy.vx = 0; }
        }
      } else if (ai.phase === 'recovery') {
        enemy.vx *= .8;
        if (ai.age >= ai.duration) { ai.phase = 'approach'; ai.age = 0; }
      }
      if (enemy.role === 'bat') {
        if (ai.phase !== 'active') {
          const hover = enemy.originY + Math.sin(enemy.timer * 3) * 8;
          enemy.vy = Math.max(-100, Math.min(100, (hover - enemy.y) * 4));
        }
        enemy.x = Math.max(0, Math.min(s.room.width - enemy.w, enemy.x + enemy.vx * dt));
        enemy.y = Math.max(100, Math.min(448 - enemy.h, enemy.y + enemy.vy * dt));
        continue;
      }
      // Only step on a supporting surface. Upper-route guards never walk off a perch.
      const nextFoot = enemy.x + enemy.w / 2 + Math.sign(enemy.vx) * (enemy.w / 2 + 7);
      const support = s.room.platforms.some(tile => Math.abs(tile.y - enemy.y - enemy.h) < 7 && nextFoot > tile.x + 2 && nextFoot < tile.x + tile.w - 2);
      if (!support && Math.abs(enemy.vy) < 1) enemy.vx = 0;
      enemy.x = Math.max(0, Math.min(s.room.width - enemy.w, enemy.x + enemy.vx * dt));
      const bottom = enemy.y + enemy.h;
      enemy.vy = Math.min(700, enemy.vy + 1500 * dt); enemy.y += enemy.vy * dt;
      for (const tile of s.room.platforms) if (enemy.x + enemy.w > tile.x && enemy.x < tile.x + tile.w && bottom <= tile.y + 4 && enemy.y + enemy.h >= tile.y && enemy.vy >= 0) { enemy.y = tile.y - enemy.h; enemy.vy = 0; }
      if (enemy.y > 620) this.hitEnemy(enemy, enemy.hp + 100, true);
    }
  };
}
