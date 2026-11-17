// Original action definitions for STARHOP. Seconds refer to simulation time.
export const WEAPONS = {
  blade: {
    cost: 5,
    strikes: [
      { startup: .055, active: .065, recovery: .14, power: 1.35, reach: 66, height: 54, poise: 12, cancelAfter: .13, comboAfter: .21, move: .85, cancel: { dodge:.13, guard:.12, jump:.14, weapon:.16 }, animation: { sheet:'blade',offset:0,frames:12 } },
      { startup: .07, active: .07, recovery: .15, power: 1.6, reach: 74, height: 60, poise: 16, cancelAfter: .15, comboAfter: .24, move: .8, cancel: { dodge:.15, guard:.14, jump:.17, weapon:.18 }, animation: { sheet:'blade',offset:12,frames:12 } },
      { startup: .16, active: .10, recovery: .24, power: 2.8, reach: 94, height: 76, poise: 38, cancelAfter: .32, comboAfter: .46, move: .48, heavy: true, cancel: { dodge:.32, guard:.30, jump:.34, weapon:.36 }, animation: { sheet:'blade',offset:24,frames:12 } },
    ],
  },
  ember: { cost: 4, strikes: [{ startup: .48, active: .045, recovery: .17, power: 1.0, poise: 6, cancelAfter: .55, comboAfter: .66, move: .65, charge: true, cancel: { dodge:.55, guard:.55, jump:.57, weapon:.6 }, animation:{sheet:'cast',offset:0,frames:12} }] },
  disc: { cost: 7, strikes: [{ startup: .085, active: .035, recovery: .21, power: 1.35, poise: 12, cancelAfter: .14, comboAfter: .3, move: .9, cancel: { dodge:.14, guard:.12, jump:.16, weapon:.18 }, animation:{sheet:'cast',offset:12,frames:12} }] },
};

export const MONSTERS = {
  melee: { name: '巡林客', speed: 76, detect: 440, range: 68, startup: .42, active: .12, recovery: .62, poise: 20 },
  ranged: { name: '朱灯弩手', speed: 44, detect: 520, range: 350, startup: .64, active: .08, recovery: .92, poise: 16 },
  trunk: { name: '腐化木灵', speed: 34, detect: 460, range: 300, startup: .55, active: .08, recovery: .92, poise: 16 },
  rock: { name: '苔甲石傀', speed: 58, detect: 390, range: 68, startup: .58, active: .18, recovery: .85, poise: 26 },
  bat: { name: '裂翼妖蝠', speed: 65, detect: 330, range: 145, startup: .56, active: .32, recovery: .95, poise: 12 },
  shield: { name: '重盾守卫', speed: 54, detect: 420, range: 80, startup: .55, active: .14, recovery: .8, poise: 30 },
  elite: { name: '精英 · 灰烬监守', speed: 82, detect: 490, range: 98, startup: .55, active: .14, recovery: .95, poise: 42 },
};

export function actionPhase(action) {
  const { startup, active, recovery } = action.spec;
  return action.age < startup ? 'startup' : action.age < startup + active ? 'active' : action.age < startup + active + recovery ? 'recovery' : 'done';
}

export function attackBox(entity, reach, height, facing = entity.facing) {
  const center = entity.x + entity.w / 2;
  return { x: facing > 0 ? center : center - reach, y: entity.y + entity.h / 2 - height / 2, w: reach, h: height };
}
export const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
