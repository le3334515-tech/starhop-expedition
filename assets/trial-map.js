const platform = (x, y, w, kind = 'stone') => ({ x, y, w, h: 22, kind, oneWay: true });
const mob = (id, role, x, floor, hp, optional = false) => {
  const elite = role === 'elite';
  const h = elite ? 78 : role === 'trunk' ? 66 : role === 'rock' ? 60 : role === 'shield' ? 68 : role === 'melee' ? 32 : 44;
  return { id, role, kind: role === 'melee' ? 'slime' : 'sentry', x, y: floor - h, w: elite ? 42 : role === 'rock' ? 40 : 32, h, hp, maxHp: hp, vx: 0, vy: 0, facing: -1, timer: 0, hurt: 0, dead: false, originX: x, originY: floor - h, attackCooldown: .7, optional, elite };
};

export function createTrialMap(seed) {
  const variation = ((seed >>> 0) % 3) * 14;
  const platforms = [
    { x: 0, y: 448, w: 1660, h: 120, kind: 'ground' },
    { x: 1780, y: 448, w: 1300, h: 120, kind: 'ground' },
    platform(830, 370, 130, 'wood'), platform(1000, 302, 140),
    platform(1160, 234, 380), platform(1500, 302, 140, 'wood'),
    platform(1630, 382, 210, 'wood'), platform(1910, 352, 150),
    platform(2460,370,130,'wood'), platform(2630,302,200),
  ];
  const signs = [
    { kind: 'trial-sign', x: 220, y: 448, title: '灰烬回廊', text: '试刀 → 藏珍支路 ↑ 精英 → 星门' },
    { kind: 'trial-sign', x: 810, y: 448, title: '藏珍支路 ↑', text: '踏上高台 · 击败木灵 · 开启宝匣' },
    { kind: 'trial-sign', x: 2000, y: 448, title: '监守前庭 →', text: '精英二连击 · 精准格挡削减架势' },
  ];
  return {
    room: { index: 0, name: '灰烬回廊 · 监守前庭', subtitle: 'ASHEN CLOISTER', encounter: '精英与藏珍支路', width: 3080, height: 640, theme: 0, platforms,
      hazards: [{ x: 1660, y: 520, w: 120, h: 50, kind: 'lava' }],
      decorations: [...signs, { kind: 'tree', x: 620, y: 448, scale: 1.1 }, { kind: 'lamp', x: 1130, y: 448, scale: 1 }, { kind: 'crystal', x: 2030, y: 448, scale: 1 }, { kind: 'trial-chest', x: 1440, y: 234 },{kind:'trial-chest',x:2770,y:302,rewardId:'relic'},{kind:'trial-sign',x:2430,y:448,title:'圣物支路 ↑',text:'攀上残桥 · 击破守卫 · 铭刻圣匣'}],
      spawn: { x: 100, y: 410 }, checkpoint: { x: 100, y: 410 }, exit: { x: 2920, y: 352, w: 64, h: 96 }, isBoss: false },
    enemies: [
      { ...mob(1, 'rock', 470 + variation, 448, 4.2), skin: 'rock' },
      { ...mob(2, 'trunk', 970, 448, 4), skin: 'trunk' },
      mob(3, 'shield', 1390, 448, 6.5),
      { ...mob(4, 'trunk', 1250, 234, 4.5, true), skin: 'trunk' },
      mob(5, 'elite', 2340, 448, 24),
      { ...mob(6, 'bat', 2100, 422, 3.2), skin: 'bat', kind: 'bat', w: 30, h: 24, y: 398, originY: 398 },
      { ...mob(7,'trunk',2670,302,5.6,true),skin:'trunk',guardGroup:'relic' },
    ],
    pickups: [
      { id: 401, x: 1940, y: 316, w: 18, h: 18, kind: 'heart', value: 1, vy: 0, bob: 0, collected: false },
      ...[[340, 404], [700, 404], [850, 336], [1050, 268], [1180, 200], [1530, 268], [1700, 348], [1950, 318], [2630, 404]].map(([x, y], j) => ({ id: 500 + j, x, y, w: 13, h: 16, kind: 'coin', value: 1, vy: 0, bob: j, collected: false })),
    ],
    trial: { chest: { x: 1440, y: 204, w: 34, h: 30, opened: false }, reward: false, eliteDefeated: false, hint: '', version: 10,
      forge:{x:1880,y:448,used:false},relicCache:{x:2770,y:272,w:34,h:30,opened:false},currentNode:'entry',
      nodes:[
        {id:'entry',name:'练刃外廊',x0:0,x1:360,next:['combat']},
        {id:'combat',name:'苔甲庭院',x0:360,x1:820,next:['crossfire']},
        {id:'crossfire',name:'交火长廊',x0:820,x1:1660,next:['rest','treasure']},
        {id:'treasure',name:'藏珍高台',x0:1000,x1:1640,floor:340,optional:true,next:['rest']},
        {id:'rest',name:'锻火休整',x0:1660,x1:2000,next:['elite']},
        {id:'elite',name:'监守前庭',x0:2000,x1:2700,next:['exit','relic']},
        {id:'relic',name:'圣物残桥',x0:2460,x1:2840,floor:390,optional:true,next:['exit']},
        {id:'exit',name:'归途星门',x0:2700,x1:3081,next:[]},
      ],
      crates: [290, 740, 1530, 2710].map((x, i) => ({ id: i, x, y: 416, w: 38, h: 32, hp: 2, hitAge: 1, breakAge: 0, broken: false, heart: i === 1 || i === 3 })),
      checkpoints: [{ x: 150, y: 448, active: false, age: 0 }, { x: 1880, y: 448, active: false, age: 0 }], effects: [],
    },
  };
}
