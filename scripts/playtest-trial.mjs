import { JA } from '../assets/game-core.js';

// Deterministic playthrough using normal movement, attacks, guard and jump inputs.
// No actor teleports, health overrides, forced kills or damage multipliers.
export function playTrial(weapon, seed = 12345) {
  const engine = new JA(); engine.start({ seed, weapon, modifier: 'standard' });
  let parries = 0, hits = 0, blocked = 0;
  const receive = engine.receiveAttack;
  engine.receiveAttack = function (attack) {
    const result = receive.call(this, attack);
    if (result.result === 'parried') parries++;
    if (result.result === 'hurt') hits++;
    if (result.result === 'blocked') blocked++;
    return result;
  };
  for (let frame = 0; frame < 120 * 150; frame++) {
    const state = engine.state, h = state.hero;
    if (state.phase === 'upgrade') {
      const choices = state.upgradeChoices;
      engine.chooseUpgrade((choices.find(c => c.id === 'edge') || choices.find(c => c.id === 'vigor') || choices.find(c => c.id === 'tempo') || choices[0]).id);
    }
    if (['victory', 'gameover'].includes(state.phase)) break;
    const target = state.enemies.filter(e => !e.dead && !e.optional).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    const input = {};
    let desired = state.room.exit.x;
    if (target) {
      const dx = target.x + target.w / 2 - h.x - h.w / 2, distance = Math.abs(dx), direction = Math.sign(dx) || h.facing;
      const spacing = weapon === 'blade' ? 49 : weapon === 'ember' ? 200 : 160;
      desired = target.x - direction * spacing;
      // A ranged spacing point may fall in a pit after an enemy follows us.
      // Choose a supported point on the target's side, using normal jump inputs.
      const unsafe=state.room.hazards.find(gap=>desired+h.w>gap.x-14&&desired<gap.x+gap.w+14);
      if(unsafe)desired=target.x>unsafe.x?unsafe.x+unsafe.w+24:unsafe.x-h.w-24;
      input.moveX = Math.abs(desired - h.x) > 9 ? Math.sign(desired - h.x) : h.facing !== direction ? direction * .08 : 0;
      const attackRange = weapon === 'blade' ? 65 : 390;
      const danger = ['windup', 'active'].includes(target.ai?.phase) && distance < (target.role === 'elite' ? 115 : 95);
      const incoming = state.projectiles.find(shot => shot.owner !== 'hero' && Math.abs(shot.x - h.x) < 95 && Math.abs(shot.y - h.y - 18) < 30 && (h.x - shot.x) * shot.vx > 0);
      if (incoming) {
        input.moveX = Math.sign(incoming.x - h.x) * .08;
        input.guardHeld = true;
      } else if (danger) {
        input.moveX = h.facing !== direction ? direction * .08 : 0;
        input.guardHeld = target.ai.phase === 'active' || target.ai.age >= target.ai.duration - .105;
      } else input.attackHeld = distance < attackRange && Math.abs(target.y + target.h - h.y - h.h) < 70;
    } else input.moveX = desired > h.x ? 1 : -1;
    const gap = state.room.hazards.find(tile => tile.kind === 'lava' && h.x + h.w > tile.x - 80 && h.x < tile.x + tile.w + 30);
    if (gap) {
      input.jumpPressed = h.grounded || h.jumps === 1 && h.vy > 20;
      input.jumpHeld = true;
    }
    engine.update(1 / 120, input);
  }
  return { weapon, phase: engine.state.phase, time: +engine.state.time.toFixed(2), health: engine.state.hero.hp, kills: engine.state.kills, parries, hits, blocked, remaining: engine.state.enemies.filter(e => !e.dead && !e.optional).map(e => ({ role: e.role, hp: +e.hp.toFixed(2), x: +e.x.toFixed(0) })), x: +engine.state.hero.x.toFixed(1) };
}

if (process.argv[1]?.endsWith('playtest-trial.mjs')) {
  const results = ['blade', 'ember', 'disc'].map(weapon => playTrial(weapon));
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.phase !== 'victory')) process.exitCode = 1;
}
