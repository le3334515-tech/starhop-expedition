import { installCombatRuntime } from "./combat-runtime.js";
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const COMBAT = { stamina: 100, dodgeCost: 20, parryWindow: .16, guardCost: 28, attackBuffer: .24 };

export function enrichRoom(generated, seed, index) {
  if (generated.room.isBoss) return generated;
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  const random = () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
  const { room, pickups, enemies } = generated;
  const variant = Math.floor(random() * 4);
  room.encounter = ['断桥捷径', '高台藏珍', '守卫巡游', '灵泉补给'][variant];
  room.subtitle += ` · ${room.encounter}`;
  // Only move one-way ledges; the validated floor, spawn and exit remain intact.
  for (const p of room.platforms.filter(p => p.oneWay)) {
    p.y = Math.max(208, Math.min(366, p.y + Math.floor(random() * 3 - 1) * 12));
  }
  if (variant === 0) {
    for (const gap of room.hazards.filter(h => h.kind === 'lava')) {
      room.platforms.push({ x: gap.x - 22, y: 382, w: gap.w + 44, h: 18, kind: 'wood', oneWay: true });
    }
  }
  if (variant === 1) {
    const anchor = room.platforms.find(p => p.oneWay && p.y > 290);
    if (anchor) {
      const ledge = { x: anchor.x + 105, y: anchor.y - 64, w: 110, h: 20, kind: 'stone', oneWay: true };
      room.platforms.push(ledge);
      for (let j = 0; j < 4; j++) pickups.push({ id: 80000 + index * 100 + j, kind: 'coin', x: ledge.x + 15 + j * 23, y: ledge.y - 30, w: 13, h: 16, value: 3, vy: 0, bob: j, collected: false });
    }
  }
  if (variant === 2) {
    const guard = enemies.find(e => e.kind === 'sentry') || enemies[0];
    if (guard) { guard.elite = true; guard.hp *= 1.7; guard.maxHp = guard.hp; guard.attackCooldown = .7; }
  }
  const safe = room.platforms.filter(p => p.oneWay || (p.kind === 'ground' && p.w > 180));
  const count = variant === 3 ? 3 : 1 + Number(random() > .65);
  for (let j = 0; j < count && safe.length; j++) {
    const p = safe[Math.floor(random() * safe.length)];
    const x = p.x + 24 + random() * Math.max(0, p.w - 66);
    if (room.hazards.some(h => x + 18 > h.x - 20 && x < h.x + h.w + 20)) continue;
    pickups.push({ id: 90000 + index * 10 + j, kind: 'heart', x, y: p.y - 30, w: 18, h: 18, value: 1, vy: 0, bob: random() * 6, collected: false });
  }
  return generated;
}

export function installSouls(Engine,upgradePool) {
  installCombatRuntime(Engine,upgradePool);
}
