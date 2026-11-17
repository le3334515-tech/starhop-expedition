import { installSouls, enrichRoom } from "./souls-combat.js";
const Ue = 8,
  Fe = {
    left: !1,
    right: !1,
    jumpPressed: !1,
    jumpHeld: !1,
    attackPressed: !1,
    attackHeld: !1,
    dashPressed: !1,
    interactPressed: !1,
    overdrivePressed: !1,
    guardPressed: false,
  },
  vt = {
    blade: {
      name: "星陨短刃",
      subtitle: "近战 · 穿插背击",
      description: "挥出弧形剑气，近身攻击更强。",
      color: "#7de7cf",
      icon: "blade",
    },
    ember: {
      name: "萤火法杖",
      subtitle: "灵术 · 灼印引爆",
      description: "短按叠加灼印，长按蓄力引爆。",
      color: "#ffb474",
      icon: "ember",
    },
    disc: {
      name: "回声飞轮",
      subtitle: "回旋 · 双程追猎",
      description: "调整站位命中去回程，再按攻击召回。",
      color: "#b7afff",
      icon: "disc",
    },
  },
  ce = {
    standard: {
      name: "经典远征",
      tag: "STANDARD",
      description: "标准规则，踏上你的第一场远征。",
      icon: "star",
    },
    moon: {
      name: "月球漫步",
      tag: "LOW GRAVITY",
      description: "重力降低，跳得更高，滞空更久。",
      icon: "moon",
    },
    haste: {
      name: "极速派对",
      tag: "HYPER SPEED",
      description: "你和敌人一起加速，反应决定胜负。",
      icon: "bolt",
    },
    iron: {
      name: "一命之约",
      tag: "ONE HEART",
      description: "仅有一颗心，护盾与闪避更珍贵。",
      icon: "heart",
    },
  };
function ge(a) {
  let e = a >>> 0;
  return () => {
    e += 1831565813;
    let s = Math.imul(e ^ (e >>> 15), 1 | e);
    return (
      (s ^= s + Math.imul(s ^ (s >>> 7), 61 | s)),
      ((s ^ (s >>> 14)) >>> 0) / 4294967296
    );
  };
}
const St = [
    ["雾竹山门", "MISTBAMBOO GATE"],
    ["朱灯旧街", "VERMILION STREET"],
    ["回风栈道", "WINDWARD WALKWAY"],
    ["沉钟地宫", "SUNKEN BELL CRYPT"],
    ["琉璃水庭", "GLAZED WATER COURT"],
    ["丹炉机坊", "CINNABAR FOUNDRY"],
    ["天仪中枢", "CELESTIAL ENGINE"],
    ["余烬神殿", "EMBER SANCTUM"],
  ],
  YA = [
    [
      {
        platforms: [
          [290, 348, 152],
          [560, 276, 156],
          [960, 348, 176],
          [1290, 308, 176],
          [1640, 344, 156],
          [1870, 268, 140],
        ],
        gaps: [],
        spikes: [],
        springs: [],
        heartX: 1570,
        enemies: [
          ["slime", 520, 420],
          ["slime", 1010, 420],
          ["bat", 1370, 310],
          ["sentry", 1800, 406],
        ],
      },
      {
        platforms: [
          [260, 360, 160],
          [480, 286, 144],
          [720, 240, 180],
          [1040, 304, 180],
          [1450, 352, 164],
          [1720, 280, 164],
          [1990, 340, 144],
        ],
        gaps: [],
        spikes: [],
        springs: [1290],
        heartX: 1620,
        enemies: [
          ["slime", 490, 420],
          ["bat", 980, 306],
          ["sentry", 1410, 406],
          ["slime", 1920, 420],
        ],
      },
      {
        platforms: [
          [330, 322, 220],
          [730, 366, 128],
          [1e3, 288, 220],
          [1400, 356, 176],
          [1680, 280, 200],
          [1990, 348, 130],
        ],
        gaps: [],
        spikes: [],
        springs: [620],
        heartX: 1350,
        enemies: [
          ["slime", 650, 420],
          ["sentry", 1030, 406],
          ["bat", 1540, 298],
          ["slime", 1920, 420],
        ],
      },
    ],
    [
      {
        platforms: [
          [290, 348, 152],
          [560, 276, 156],
          [960, 348, 240],
          [1290, 308, 176],
          [1640, 344, 156],
          [1870, 268, 140],
        ],
        gaps: [[1040, 1160]],
        spikes: [[1480, 56]],
        springs: [730],
        heartX: 1570,
        enemies: [
          ["slime", 470, 420],
          ["bat", 790, 298],
          ["slime", 1270, 420],
          ["sentry", 1660, 406],
          ["bat", 1990, 318],
        ],
      },
      {
        platforms: [
          [300, 352, 180],
          [540, 284, 150],
          [700, 340, 230],
          [1030, 260, 190],
          [1360, 336, 170],
          [1610, 340, 250],
          [2020, 284, 170],
        ],
        gaps: [
          [760, 872],
          [1680, 1790],
        ],
        spikes: [[1120, 70]],
        springs: [1430],
        heartX: 1920,
        enemies: [
          ["bat", 480, 306],
          ["slime", 1030, 420],
          ["sentry", 1350, 406],
          ["slime", 1950, 420],
          ["bat", 2140, 304],
        ],
      },
      {
        platforms: [
          [320, 340, 190],
          [670, 280, 180],
          [970, 352, 160],
          [1240, 340, 280],
          [1640, 264, 180],
          [1870, 344, 200],
        ],
        gaps: [[1340, 1460]],
        spikes: [
          [920, 56],
          [1930, 56],
        ],
        springs: [1130],
        heartX: 1580,
        enemies: [
          ["slime", 480, 420],
          ["sentry", 790, 406],
          ["bat", 1170, 298],
          ["slime", 1710, 420],
          ["bat", 2080, 314],
        ],
      },
    ],
    [
      {
        platforms: [
          [290, 348, 152],
          [560, 276, 156],
          [750, 344, 240],
          [1100, 280, 190],
          [1420, 348, 180],
          [1680, 336, 240],
          [2070, 276, 180],
        ],
        gaps: [
          [820, 932],
          [1760, 1860],
        ],
        spikes: [[1480, 84]],
        springs: [650],
        heartX: 1990,
        enemies: [
          ["sentry", 480, 406],
          ["slime", 690, 420],
          ["bat", 1100, 294],
          ["sentry", 1350, 406],
          ["slime", 1640, 420],
          ["bat", 2160, 310],
        ],
      },
      {
        platforms: [
          [300, 356, 180],
          [590, 284, 180],
          [950, 340, 280],
          [1320, 268, 180],
          [1620, 344, 160],
          [1920, 332, 280],
          [2240, 280, 150],
        ],
        gaps: [
          [1040, 1160],
          [2020, 2120],
        ],
        spikes: [
          [1360, 70],
          [1770, 56],
        ],
        springs: [740],
        heartX: 1880,
        enemies: [
          ["sentry", 450, 406],
          ["slime", 800, 420],
          ["bat", 1220, 302],
          ["sentry", 1510, 406],
          ["slime", 1850, 420],
          ["bat", 2270, 306],
        ],
      },
      {
        platforms: [
          [290, 340, 160],
          [580, 344, 240],
          [950, 268, 190],
          [1290, 348, 180],
          [1400, 332, 240],
          [1780, 268, 190],
          [2120, 348, 160],
        ],
        gaps: [
          [660, 772],
          [1450, 1562],
        ],
        spikes: [
          [1070, 56],
          [1910, 70],
        ],
        springs: [900, 1700],
        heartX: 1650,
        enemies: [
          ["sentry", 450, 406],
          ["slime", 950, 420],
          ["bat", 1250, 294],
          ["sentry", 1740, 406],
          ["slime", 2080, 420],
          ["bat", 2260, 310],
        ],
      },
    ],
    [
      {
        platforms: [
          [250, 360, 240],
          [620, 284, 210],
          [940, 352, 210],
          [1260, 276, 200],
          [1570, 352, 240],
          [1930, 284, 210],
        ],
        gaps: [[1030, 1140]],
        spikes: [[1490, 56]],
        springs: [510],
        heartX: 1850,
        enemies: [
          ["sentry", 420, 406],
          ["bat", 840, 282],
          ["slime", 1230, 420],
          ["sentry", 1680, 406],
          ["bat", 2070, 310],
        ],
      },
      {
        platforms: [
          [300, 344, 250],
          [650, 268, 170],
          [920, 340, 300],
          [1330, 264, 190],
          [1620, 344, 210],
          [1970, 292, 180],
        ],
        gaps: [],
        spikes: [
          [580, 56],
          [1550, 56],
        ],
        springs: [1240],
        heartX: 1870,
        enemies: [
          ["slime", 380, 420],
          ["sentry", 810, 406],
          ["bat", 1160, 282],
          ["sentry", 1770, 406],
          ["bat", 2110, 304],
        ],
      },
      {
        platforms: [
          [270, 356, 170],
          [510, 288, 230],
          [880, 350, 240],
          [1250, 276, 230],
          [1590, 352, 160],
          [1880, 284, 230],
        ],
        gaps: [[950, 1060]],
        spikes: [[1360, 70]],
        springs: [770],
        heartX: 1790,
        enemies: [
          ["sentry", 460, 406],
          ["bat", 850, 308],
          ["slime", 1160, 420],
          ["sentry", 1680, 406],
          ["bat", 2030, 296],
        ],
      },
    ],
    [
      {
        platforms: [
          [260, 360, 190],
          [570, 292, 200],
          [830, 344, 300],
          [1280, 280, 210],
          [1610, 348, 300],
          [2020, 284, 180],
        ],
        gaps: [
          [910, 1020],
          [1720, 1830],
        ],
        spikes: [],
        springs: [470, 1510],
        heartX: 1940,
        enemies: [
          ["slime", 430, 420],
          ["bat", 790, 296],
          ["sentry", 1330, 406],
          ["slime", 1990, 420],
        ],
      },
      {
        platforms: [
          [290, 344, 210],
          [600, 272, 190],
          [920, 348, 310],
          [1330, 276, 200],
          [1660, 348, 280],
          [2070, 284, 150],
        ],
        gaps: [
          [1030, 1150],
          [1780, 1890],
        ],
        spikes: [],
        springs: [1550],
        heartX: 1960,
        enemies: [
          ["bat", 450, 294],
          ["slime", 820, 420],
          ["sentry", 1360, 406],
          ["slime", 2030, 420],
        ],
      },
      {
        platforms: [
          [280, 356, 160],
          [540, 284, 240],
          [870, 344, 300],
          [1300, 272, 170],
          [1610, 344, 290],
          [2020, 280, 190],
        ],
        gaps: [
          [980, 1090],
          [1730, 1840],
        ],
        spikes: [],
        springs: [700, 1500],
        heartX: 1920,
        enemies: [
          ["slime", 470, 420],
          ["bat", 820, 304],
          ["sentry", 1380, 406],
          ["bat", 2010, 308],
        ],
      },
    ],
    [
      {
        platforms: [
          [260, 344, 240],
          [600, 264, 200],
          [900, 348, 240],
          [1240, 280, 240],
          [1590, 352, 220],
          [1930, 280, 180],
        ],
        gaps: [[1010, 1120]],
        spikes: [
          [1450, 70],
          [1840, 56],
        ],
        springs: [810],
        heartX: 2170,
        enemies: [
          ["sentry", 430, 406],
          ["slime", 690, 420],
          ["bat", 1180, 286],
          ["sentry", 1680, 406],
          ["slime", 2030, 420],
        ],
      },
      {
        platforms: [
          [310, 352, 180],
          [610, 276, 240],
          [940, 344, 260],
          [1320, 264, 210],
          [1660, 340, 220],
          [1980, 284, 220],
        ],
        gaps: [],
        spikes: [
          [540, 56],
          [1230, 70],
          [1890, 56],
        ],
        springs: [1570],
        heartX: 2120,
        enemies: [
          ["sentry", 420, 406],
          ["bat", 820, 294],
          ["slime", 1040, 420],
          ["sentry", 1710, 406],
          ["bat", 2130, 300],
        ],
      },
      {
        platforms: [
          [280, 352, 220],
          [640, 280, 180],
          [920, 344, 280],
          [1330, 272, 210],
          [1640, 352, 200],
          [1930, 284, 230],
        ],
        gaps: [[1010, 1120]],
        spikes: [
          [560, 70],
          [1520, 56],
        ],
        springs: [1240],
        heartX: 2180,
        enemies: [
          ["slime", 400, 420],
          ["sentry", 740, 406],
          ["bat", 1190, 302],
          ["sentry", 1730, 406],
          ["bat", 2120, 306],
        ],
      },
    ],
    [
      {
        platforms: [
          [260, 352, 180],
          [510, 280, 210],
          [790, 216, 190],
          [1050, 344, 290],
          [1450, 268, 210],
          [1770, 344, 260],
          [2130, 280, 140],
        ],
        gaps: [
          [1170, 1290],
          [1870, 1980],
        ],
        spikes: [[1490, 56]],
        springs: [980],
        heartX: 2080,
        enemies: [
          ["sentry", 450, 406],
          ["bat", 830, 256],
          ["slime", 1080, 420],
          ["sentry", 1680, 406],
          ["bat", 2130, 294],
        ],
      },
      {
        platforms: [
          [280, 344, 210],
          [590, 272, 180],
          [850, 208, 180],
          [1110, 344, 300],
          [1500, 272, 210],
          [1820, 344, 270],
          [2170, 280, 150],
        ],
        gaps: [[1220, 1330]],
        spikes: [[1740, 56]],
        springs: [1020],
        heartX: 2110,
        enemies: [
          ["bat", 470, 294],
          ["sentry", 780, 406],
          ["slime", 1120, 420],
          ["sentry", 1590, 406],
          ["bat", 2160, 290],
        ],
      },
      {
        platforms: [
          [270, 352, 180],
          [530, 280, 220],
          [820, 216, 180],
          [1100, 348, 280],
          [1480, 272, 210],
          [1810, 340, 280],
          [2180, 280, 140],
        ],
        gaps: [
          [1200, 1310],
          [1920, 2030],
        ],
        spikes: [[1530, 56]],
        springs: [1020],
        heartX: 2110,
        enemies: [
          ["sentry", 440, 406],
          ["bat", 790, 286],
          ["slime", 1110, 420],
          ["sentry", 1740, 406],
          ["bat", 2180, 298],
        ],
      },
    ],
  ],
  ZA = [
    [
      [430, 340, 156],
      [900, 340, 156],
      [1260, 340, 140],
    ],
    [
      [540, 348, 180],
      [860, 296, 156],
      [1190, 348, 180],
    ],
    [
      [450, 324, 180],
      [780, 356, 180],
      [1120, 304, 200],
    ],
  ];
function mA(a, e) {
  const s = ge((a ^ Math.imul(e + 1, 2654435761)) >>> 0);
  if (!Number.isInteger(e) || e < 0 || e >= Ue)
    throw new RangeError("Unknown expedition room");
  const t = e === Ue - 1,
    i = [2250, 2370, 2490, 2300, 2400, 2340, 2400, 1660][e],
    A = [],
    n = [],
    o = [],
    l = [],
    r = [],
    c = e,
    d = Math.floor(s() * 3),
    h = t ? null : YA[e][d],
    p = h?.gaps ?? [];
  let m = 0;
  for (const [v, y] of p)
    (A.push({ x: m, y: 448, w: v - m, h: 120, kind: "ground" }),
      n.push({ x: v, y: 520, w: y - v, h: 50, kind: "lava" }),
      (m = y));
  if ((A.push({ x: m, y: 448, w: i - m, h: 120, kind: "ground" }), t)) {
    for (const [v, y, U] of ZA[d])
      A.push({ x: v, y, w: U, h: 22, kind: "stone", oneWay: !0 });
    o.push(
      { x: 1260, y: 448, kind: "ruin", scale: 2 },
      { x: 780, y: 448, kind: "crystal", scale: 1.8 },
    );
  } else {
    h.platforms.forEach(([v, y, U], Se) =>
      A.push({
        x: v,
        y,
        w: U,
        h: 24,
        kind: Se % 3 === 0 ? "wood" : "stone",
        oneWay: !0,
      }),
    );
    for (const v of h.springs)
      A.push({ x: v, y: 424, w: 48, h: 24, kind: "spring" });
    for (const [v, y] of h.spikes)
      n.push({ x: v, y: 430, w: y, h: 18, kind: "spikes" });
    h.enemies.forEach(([v, y, U], Se) => {
      const DA = Math.round(s() * 24 - 12),
        xt = y + DA,
        Ht =
          v === "bat" ||
          A.some(
            (De) =>
              De.kind === "ground" &&
              xt >= De.x + 50 &&
              xt + 32 <= De.x + De.w - 50,
          )
            ? xt
            : y,
        Ft = v === "sentry" ? 3 : 2;
      l.push({
        id: e * 100 + Se + 1,
        kind: v,
        x: Ht,
        y: U,
        w: v === "bat" ? 30 : 32,
        h: v === "sentry" ? 42 : 28,
        vx: 0,
        vy: 0,
        hp: Ft,
        maxHp: Ft,
        facing: -1,
        timer: s() * 2,
        hurt: 0,
        dead: !1,
        originX: Ht,
        originY: U,
        attackCooldown: 1 + s(),
      });
    });
  }
  let k = e * 1e3;
  const b = (v, y) =>
    r.push({
      id: ++k,
      x: v,
      y,
      w: 13,
      h: 16,
      kind: "coin",
      value: 1,
      vy: 0,
      bob: s() * 6.28,
      collected: !1,
    });
  if (!t) {
    for (let v = 220; v < i - 180; v += 100)
      !p.some(([y, U]) => v > y - 12 && v < U + 12) &&
        !h.spikes.some(([y, U]) => v > y - 10 && v < y + U + 10) &&
        b(v, 404);
    for (const v of A.filter((y) => y.oneWay))
      for (let y = v.x + 24; y < v.x + v.w - 12; y += 36) b(y, v.y - 38);
    r.push({
      id: ++k,
      x: h.heartX,
      y: 395,
      w: 18,
      h: 18,
      kind: "heart",
      value: 1,
      vy: 0,
      bob: 1,
      collected: !1,
    });
  }
  for (let v = 100; v < i - 80; v += 130 + Math.floor(s() * 90)) {
    if (p.some(([U, Se]) => v > U - 20 && v < Se + 20)) continue;
    const y = [
      ["tree", "grass", "lamp"],
      ["ruin", "lamp", "lamp", "tree"],
      ["tree", "ruin", "grass"],
      ["ruin", "crystal", "lamp"],
      ["tree", "crystal", "grass"],
      ["ruin", "lamp", "crystal"],
      ["ruin", "crystal", "lamp"],
      ["ruin", "lamp", "crystal"],
    ][c];
    o.push({
      x: v,
      y: 448,
      kind: y[Math.floor(s() * y.length)],
      scale: 0.7 + s() * 0.6,
    });
  }
  const generated = {
    room: {
      index: e,
      name: St[e][0],
      subtitle: `${St[e][1]} · ROUTE ${"ABC"[d]}`,
      width: i,
      height: 640,
      theme: c,
      platforms: A,
      hazards: n,
      decorations: o,
      spawn: { x: 100, y: 410 },
      exit: { x: i - 116, y: 352, w: 64, h: 96 },
      checkpoint: { x: 100, y: 410 },
      isBoss: t,
    },
    enemies: l,
    pickups: r,
  };
  return enrichRoom(generated, a, e);
}
const Ye = 1500,
  GA = 960,
  Ot = 320,
  qe = [
    {
      id: "edge",
      name: "星刃淬火",
      description: "所有武器伤害 +35%。",
      icon: "blade",
      rarity: "common",
      color: "#7de7cf",
    },
    {
      id: "tempo",
      name: "疾风节拍",
      description: "攻击速度 +20%，更快再次出手。",
      icon: "bolt",
      rarity: "common",
      color: "#a8e3e2",
    },
    {
      id: "vigor",
      name: "不灭星心",
      description: "生命上限 +1，并恢复 2 颗心。",
      icon: "heart",
      rarity: "rare",
      color: "#ff9c9e",
    },
    {
      id: "stride",
      name: "追风旅靴",
      description: "移动速度 +12%，冲刺冷却缩短。",
      icon: "wind",
      rarity: "common",
      color: "#c2efb6",
    },
    {
      id: "multishot",
      name: "双星共鸣",
      description: "远程多一枚飞弹；近战附带星光弹。",
      icon: "star",
      rarity: "epic",
      color: "#ffcf83",
    },
    {
      id: "shield",
      name: "月光守护",
      description: "获得 2 层护盾，每层抵挡一次伤害。",
      icon: "shield",
      rarity: "rare",
      color: "#b7afff",
    },
    {
      id: "blood",
      name: "生命余烬",
      description: "击败敌人有 35% 概率恢复 1 颗心。",
      icon: "spark",
      rarity: "rare",
      color: "#ffb474",
    },
    {
      id: "magnet",
      name: "星尘引力",
      description: "拾取范围大幅增加，经验更快飞来。",
      icon: "orbit",
      rarity: "common",
      color: "#9fd9ff",
    },
    {
      id: "fortune",
      name: "闪耀口袋",
      description: "每次拾取星币额外获得 1 枚星币。",
      icon: "coin",
      rarity: "common",
      color: "#ffe18e",
    },
  ],
  st = [
    {
      id: "blazing",
      name: "烈星连斩",
      description: "淬火 × 节拍：伤害额外 +20%，攻击速度额外 +10%。",
      requires: ["edge", "tempo"],
      color: "#ffad78",
    },
    {
      id: "fireflies",
      name: "流萤星群",
      description: "共鸣 × 引力：所有武器多一枚星弹，拾取范围额外 +120。",
      requires: ["multishot", "magnet"],
      color: "#a4e8cb",
    },
    {
      id: "guardian",
      name: "不灭月华",
      description: "星心 × 余烬或守护：激活时及进入新房间，获得 1 层护盾。",
      requires: ["vigor", "blood|shield"],
      color: "#c3b5ff",
    },
  ],
  z = (a, e) =>
    a.x < e.x + e.w && a.x + a.w > e.x && a.y < e.y + e.h && a.y + a.h > e.y,
  ie = (a, e, s) => Math.max(e, Math.min(s, a)),
  Pe = (a, e, s) => (a < e ? Math.min(a + s, e) : Math.max(a - s, e));
function QA(a) {
  const e = a.modifier === "iron" ? 1 : 5;
  return {
    x: 100,
    y: 410,
    w: 28,
    h: 36,
    vx: 0,
    vy: 0,
    facing: 1,
    hp: e,
    maxHp: e,
    xp: 0,
    xpNeeded: 10,
    level: 1,
    grounded: !1,
    jumps: 0,
    coyote: 0,
    jumpBuffer: 0,
    invincible: 0,
    attackTimer: 0,
    attackCooldown: 0,
    dashTimer: 0,
    dashCooldown: 0,
    weapon: a.weapon,
    damage: 1,
    speed: 260,
    attackSpeed: 1,
    critChance: 0.08,
    extraProjectiles: 0,
    lifesteal: 0,
    magnet: 80,
    shield: 0,
    upgrades: [],
    animation: 0,
    attackStep: 0,
    comboWindow: 0,
    swapBoost: 0,
    swapCooldown: 0,
    counterTimer: 0,
    perfectDodgeCooldown: 0,
  };
}
function Dt(a) {
  const e = mA(a.seed, 0);
  return {
    phase: "menu",
    seed: a.seed >>> 0,
    modifier: a.modifier,
    roomIndex: 0,
    roomCount: Ue,
    ...e,
    hero: QA(a),
    boss: null,
    projectiles: [],
    particles: [],
    floatingTexts: [],
    cameraX: 0,
    time: 0,
    visualTime: 0,
    coins: 0,
    kills: 0,
    deaths: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    roomCleared: !1,
    roomsCleared: 0,
    upgradeChoices: [],
    shake: 0,
    flash: 0,
    transition: 0,
    announcement: "",
    announcementTimer: 0,
    result: null,
    resonance: 0,
    overdrive: 0,
    overdriveCount: 0,
    synergies: [],
    hitstop: 0,
    impacts: [],
  };
}
class JA {
  state;
  callbacks;
  random = ge(1);
  visualRandom = ge(17);
  projectileId = 1e4;
  pickupId = 5e4;
  meleeHits = new Set();
  awakenedDiscs = new Set();
  previousHeroBottom = 0;
  weaponAtStart = "blade";
  variableJump = !1;
  attackPower = 1;
  criticalHit = !1;
  bufferedEdges = {};
  constructor(e = {}) {
    ((this.callbacks = e),
      (this.state = Dt({
        seed: 20261116,
        modifier: "standard",
        weapon: "blade",
      })));
  }
  start(e) {
    const s = { ...e, seed: e.seed >>> 0 };
    ((this.random = ge(s.seed ^ 2870002551)),
      (this.visualRandom = ge(s.seed ^ 125938473)),
      (this.projectileId = 1e4),
      (this.pickupId = 5e4),
      (this.weaponAtStart = s.weapon),
      (this.attackPower = 1),
      (this.bufferedEdges = {}),
      (this.variableJump = !1),
      this.meleeHits.clear(),
      this.awakenedDiscs.clear(),
      (this.state = Dt(s)),
      (this.state.phase = "playing"),
      (this.state.announcement = this.state.room.name),
      (this.state.announcementTimer = 2.5),
      (this.state.transition = 1));
  }
  pause() {
    this.state.phase === "playing" &&
      ((this.state.phase = "paused"), (this.bufferedEdges = {}));
  }
  resume() {
    this.state.phase === "paused" && (this.state.phase = "playing");
  }
  equipWeapon(e) {
    if (!["blade", "ember", "disc"].includes(e)) return;
    const s = this.state.hero;
    (s.weapon !== e &&
      ((s.attackStep = 0),
      (s.comboWindow = 0),
      this.state.phase === "playing" &&
        s.swapCooldown <= 0 &&
        ((s.swapBoost = 1.2),
        (s.swapCooldown = 2),
        this.gainResonance(6),
        this.label(s.x + 14, s.y - 25, "换武 · 下一击强化", "#a9dfff"))),
      (s.weapon = e),
      this.state.phase === "playing" && this.sound("select"));
  }
  chooseUpgrade(e) {
    const s = this.state;
    if (s.phase !== "upgrade" || !s.upgradeChoices.some((i) => i.id === e))
      return;
    const t = s.hero;
    switch ((t.upgrades.push(e), e)) {
      case "edge":
        t.damage += 0.35;
        break;
      case "tempo":
        t.attackSpeed = Math.min(2.8, t.attackSpeed * 1.2);
        break;
      case "vigor":
        ((t.maxHp += 1), (t.hp = Math.min(t.maxHp, t.hp + 2)));
        break;
      case "stride":
        t.speed *= 1.12;
        break;
      case "multishot":
        t.extraProjectiles = Math.min(3, t.extraProjectiles + 1);
        break;
      case "shield":
        t.shield += 2;
        break;
      case "blood":
        t.lifesteal = Math.min(0.85, t.lifesteal + 0.35);
        break;
      case "magnet":
        t.magnet += 140;
        break;
    }
    (this.refreshSynergies(),
      (s.upgradeChoices = []),
      (s.phase = "playing"),
      (s.hitstop = 0),
      (this.bufferedEdges = {}),
      this.sound("upgrade"),
      this.burst(t.x + 14, t.y + 15, "#ffdd95", 24, 180),
      this.label(
        t.x + 14,
        t.y - 15,
        qe.find((i) => i.id === e).name,
        "#ffdd95",
      ),
      t.xp >= t.xpNeeded && this.offerUpgrade());
  }
  update(e, s = Fe) {
    if (!Number.isFinite(e) || e <= 0) return;
    s = { ...Fe, ...s };
    e = Math.min(e, 0.05);
    const t = this.state;
    if (((t.visualTime += e), this.updateEffects(e), t.phase !== "playing"))
      return;
    t.time += e;
    const i = [
      "jumpPressed",
      "attackPressed",
      "dashPressed",
      "interactPressed",
      "overdrivePressed",
      "guardPressed",
    ];
    for (const l of i) s[l] && (this.bufferedEdges[l] = !0);
    const A = Math.min(e, t.hitstop);
    if (((t.hitstop = Math.max(0, t.hitstop - e)), (e -= A), e <= 0)) return;
    s = { ...s };
    for (const l of i) s[l] ||= !!this.bufferedEdges[l];
    this.bufferedEdges = {};
    const n = Math.ceil(e / (1 / 120)),
      o = e / n;
    for (let l = 0; l < n && t.phase === "playing"; l++) {
      const r =
        l === 0
          ? s
          : {
              ...s,
              jumpPressed: !1,
              attackPressed: !1,
              dashPressed: !1,
              interactPressed: !1,
              overdrivePressed: !1,
              guardPressed: false,
            };
      if ((this.step(o, r), t.hitstop > 0)) break;
    }
  }
  step(e, s) {
    const t = this.state,
      i = t.hero;
    if (
      ((t.overdrive = Math.max(0, t.overdrive - e)),
      s.overdrivePressed &&
        t.resonance >= 100 &&
        t.overdrive <= 0 &&
        ((t.resonance = 0),
        (t.overdrive = 6),
        (t.overdriveCount += 1),
        (t.announcement = "星陨觉醒 · 全武器超载"),
        (t.announcementTimer = 2.2),
        (t.shake = 8),
        (t.flash = 0.35),
        (i.invincible = Math.max(i.invincible, 0.8)),
        (i.dashCooldown = 0),
        this.burst(i.x + 14, i.y + 18, "#ffe4a2", 55, 260),
        this.sound("awaken")),
      (t.comboTimer = Math.max(0, t.comboTimer - e)),
      t.comboTimer === 0 && (t.combo = 0),
      (t.announcementTimer = Math.max(0, t.announcementTimer - e)),
      (t.transition = Math.max(0, t.transition - e * 1.8)),
      this.updateHero(e, s),
      t.phase !== "playing" ||
        (this.updateEnemies(e),
        this.updateBoss(e),
        this.updateAttacks(e),
        t.phase !== "playing") ||
        (this.enemyContact(), t.phase !== "playing") ||
        (this.updatePickups(e), t.phase !== "playing"))
    )
      return;
    !t.room.isBoss &&
      !t.roomCleared &&
      t.enemies.filter((o) => !o.optional).every((o) => o.dead) &&
      ((t.roomCleared = !0),
      (t.roomsCleared = t.roomIndex + 1),
      (t.announcement = "房间净化 · 星门已开启"),
      (t.announcementTimer = 2.8),
      (i.hp = Math.min(i.maxHp, i.hp + 1)),
      this.sound("portal"),
      this.gainXp(5));
    const A = { ...t.room.exit, x: t.room.exit.x - 28, w: t.room.exit.w + 56 };
    t.phase === "playing" &&
      t.roomCleared &&
      !t.room.isBoss &&
      z(i, A) &&
      (s.interactPressed || i.x > t.room.exit.x - 12) &&
      this.nextRoom();
    const n = ie(i.x - 340, 0, t.room.width - GA);
    t.cameraX = Pe(
      t.cameraX,
      n,
      Math.max(200, Math.abs(n - t.cameraX) * 9) * e,
    );
  }
  updateHero(e, s) {
    const t = this.state,
      i = t.hero,
      A = (t.modifier === "haste" ? 1.16 : 1) * (t.overdrive > 0 ? 1.25 : 1),
      n = Ye * (t.modifier === "moon" ? 0.62 : 1);
    ((i.animation += e),
      (i.comboWindow = Math.max(0, i.comboWindow - e)),
      (i.swapBoost = Math.max(0, i.swapBoost - e)),
      (i.swapCooldown = Math.max(0, i.swapCooldown - e)),
      (i.counterTimer = Math.max(0, i.counterTimer - e)),
      (i.perfectDodgeCooldown = Math.max(0, i.perfectDodgeCooldown - e)),
      i.comboWindow === 0 && (i.attackStep = 0),
      (i.invincible = Math.max(0, i.invincible - e)),
      (i.attackTimer = Math.max(0, i.attackTimer - e)),
      (i.attackCooldown = Math.max(0, i.attackCooldown - e)),
      (i.dashCooldown = Math.max(0, i.dashCooldown - e)),
      (i.dashTimer = Math.max(0, i.dashTimer - e)),
      (i.coyote = i.grounded ? 0.15 : Math.max(0, i.coyote - e)),
      (i.jumpBuffer = s.jumpPressed ? 0.24 : Math.max(0, i.jumpBuffer - e)));
    const o = Number.isFinite(s.moveX) && Math.abs(s.moveX) > .01 ? s.moveX : Number(s.right) - Number(s.left);
    if (
      (o && i.dashTimer <= 0 && (!i.action || i.action.phase === "recovery") && (i.facing = Math.sign(o)),
      s.dashPressed &&
        i.dashCooldown <= 0 &&
        this.beginDodge(),
      i.jumpBuffer > 0 && i.dashTimer <= 0 && (i.grounded || i.coyote > 0 || i.jumps < 2))
    ) {
      !i.grounded && i.coyote <= 0 && i.jumps === 0 && (i.jumps = 1);
      const r = i.jumps >= 1 && !i.grounded && i.coyote <= 0;
      ((i.vy = r ? -470 : -540),
        (i.jumps = r ? 2 : 1),
        (i.grounded = !1),
        (i.coyote = 0),
        (i.jumpBuffer = 0),
        (this.variableJump = !0),
        this.sound(r ? "doubleJump" : "jump"),
        this.burst(
          i.x + 14,
          i.y + i.h,
          r ? "#a9dfff" : "#c9edda",
          r ? 12 : 6,
          75,
        ));
    }
    (!s.jumpHeld &&
      !s.jumpPressed &&
      i.vy < -310 &&
      this.variableJump &&
      ((i.vy = -310), (this.variableJump = !1)),
      (s.attackPressed || s.attackHeld) &&
        i.attackCooldown <= 0 &&
        this.attack(),
      (this.previousHeroBottom = i.y + i.h),
      i.dashTimer > 0
        ? ((i.vx = i.facing * 520),
          (i.vy = 0),
          Math.floor(t.visualTime * 70) % 2 === 0 &&
            this.burst(i.x + 14, i.y + 20, "#7cddcf", 1, 20))
        : ((i.vx = Pe(i.vx, o * i.speed * A, (i.grounded ? (o ? 3400 : 4200) : 2400) * e)),
          (i.vy = Math.min(850, i.vy + n * (i.vy < -25 && i.vy > -100 && s.jumpHeld ? .72 : i.vy > 0 ? 1.25 : 1) * e))),
      (i.x += i.vx * e),
      (i.x = ie(i.x, 0, t.room.width - i.w)));
    for (const r of t.room.platforms)
      r.oneWay ||
        r.kind === "spring" ||
        !z(i, r) ||
        (i.y + i.h > r.y + 5 &&
          i.y < r.y + r.h - 3 &&
          (i.vx > 0 ? (i.x = r.x - i.w) : i.vx < 0 && (i.x = r.x + r.w),
          (i.vx = 0)));
    const l = i.y;
    ((i.y += i.vy * e), (i.grounded = !1));
    for (const r of t.room.platforms)
      i.x + i.w <= r.x ||
        i.x >= r.x + r.w ||
        (i.vy >= 0 && l + i.h <= r.y + 4 && i.y + i.h >= r.y
          ? ((i.y = r.y - i.h),
            (i.vy = 0),
            (i.grounded = !0),
            (i.jumps = 0),
            (this.variableJump = !1),
            r.kind === "spring"
              ? ((i.vy = -720),
                (i.grounded = !1),
                (i.jumps = 1),
                this.sound("doubleJump"),
                this.burst(i.x + 14, i.y + i.h, "#b9edb0", 14, 120))
              : !t.trial && r.kind === "ground" &&
                i.x > t.room.checkpoint.x + 180 &&
                i.x > r.x + 32 &&
                i.x < r.x + r.w - 50 &&
                (t.room.hazards.some((c) => Math.abs(c.x - i.x) < 100) ||
                  (t.room.checkpoint = { x: i.x, y: r.y - i.h })))
          : !r.oneWay &&
            i.vy < 0 &&
            l >= r.y + r.h - 3 &&
            i.y <= r.y + r.h &&
            ((i.y = r.y + r.h), (i.vy = 0)));
    for (const r of t.room.hazards)
      if (z(i, r)) {
        if ((this.hurtHero(1, r.x + r.w / 2, false, true), t.phase !== "playing")) return;
        r.kind === "lava" && this.respawnFromFall();
      }
    i.y > 590 &&
      (this.hurtHero(1, i.x, !0),
      t.phase === "playing" && this.respawnFromFall());
  }
  respawnFromFall() {
    const e = this.state,
      s = e.hero;
    ((s.x = e.room.checkpoint.x),
      (s.y = e.room.checkpoint.y - 4),
      (s.vx = s.vy = 0),
      (s.jumps = 0),
      (s.dashTimer = 0),
      (s.invincible = 1.5),
      (this.variableJump = !1),
      (e.deaths += 1),
      this.label(s.x, s.y - 10, "小心脚下！", "#ffb59c"));
  }
  attack() {
    const e = this.state,
      s = e.hero;
    ((this.attackPower =
      (s.swapBoost > 0 ? 1.3 : 1) * (s.counterTimer > 0 ? 1.5 : 1)),
      (s.attackStep = s.comboWindow > 0 ? (s.attackStep % 3) + 1 : 1),
      (s.comboWindow = .95),
      (s.attackTimer = 0.2),
      this.meleeHits.clear());
    const t =
        s.attackSpeed *
        (e.overdrive > 0 ? 1.65 : 1) *
        (e.synergies.includes("blazing") ? 1.1 : 1),
      i =
        s.extraProjectiles +
        Number(e.synergies.includes("fireflies")) +
        (e.overdrive > 0 ? 2 : 0);
    if (s.weapon === "blade") {
      ((s.comboWindow = .95),
        (s.attackTimer = s.attackStep === 3 ? 0.28 : 0.18),
        (s.attackCooldown = (s.attackStep === 3 ? 0.36 : 0.23) / t),
        this.sound("attack"));
      for (let A = 0; A < i; A++)
        this.heroProjectile("ember", (A - (i - 1) / 2) * 70, 0.7);
    } else if (s.weapon === "ember") {
      s.attackCooldown = (s.attackStep === 3 ? .38 : .24) / t;
      for (let A = 0; A <= i; A++)
        this.heroProjectile("ember", (A - i / 2) * 82);
      this.sound("fire");
    } else {
      s.attackCooldown = (s.attackStep === 3 ? .44 : .34) / t;
      for (let A = 0; A <= i; A++)
        this.heroProjectile("disc", (A - i / 2) * 65);
      this.sound("attack");
    }
    ((s.swapBoost = 0), (s.counterTimer = 0));
  }
  heroProjectile(e, s, t = 1) {
    const i = this.state.hero,
      A = ++this.projectileId;
    (e === "disc" && this.state.overdrive > 0 && this.awakenedDiscs.add(A),
      this.state.projectiles.push({
        id: A,
        kind: e,
        x: i.x + i.w / 2 + i.facing * 16 - 7,
        y: i.y + 12,
        w: e === "disc" ? 20 : 14,
        h: e === "disc" ? 20 : 12,
        vx: i.facing * (e === "disc" ? 420 : 520),
        vy: s,
        life: e === "disc" ? 1.7 : 1.4,
        damage: this.effectiveDamage() * t,
        owner: "hero",
        hitIds: [],
        returning: !1,
        rotation: 0,
      }));
  }
  updateEnemies(e) {
    const s = this.state,
      t = s.hero,
      i = s.modifier === "haste" ? 1.28 : 1;
    for (const A of s.enemies) {
      if (A.dead) continue;
      ((A.timer += e),
        (A.hurt = Math.max(0, A.hurt - e)),
        (A.attackCooldown = Math.max(0, A.attackCooldown - e * i)));
      const n = t.x - A.x;
      if (A.kind === "bat") {
        const o = Math.abs(n) < 440,
          l = o
            ? t.x + Math.sin(A.timer * 1.6) * 80
            : A.originX + Math.sin(A.timer) * 65,
          r = o
            ? t.y + 4 + Math.sin(A.timer * 2.4) * 56
            : A.originY + Math.sin(A.timer * 2.5) * 24;
        ((A.vx = Pe(A.vx, ie((l - A.x) * 1.7, -135, 135) * i, 420 * e)),
          (A.vy = Pe(A.vy, ie((r - A.y) * 1.6, -100, 100) * i, 280 * e)),
          (A.x += A.vx * e),
          (A.y += A.vy * e),
          (A.facing = A.vx >= 0 ? 1 : -1));
      } else {
        if (A.kind === "slime") {
          Math.abs(n) < 400
            ? (A.facing = n >= 0 ? 1 : -1)
            : Math.abs(A.x - A.originX) > 92 &&
              (A.facing = A.x > A.originX ? -1 : 1);
          const l = A.x + A.facing * 23 + A.w / 2;
          (s.room.platforms.some(
            (c) => l >= c.x && l <= c.x + c.w && c.kind === "ground",
          ) || (A.facing *= -1),
            A.hurt <= 0 && (A.vx = A.facing * 58 * i),
            A.attackCooldown <= 0 &&
              Math.abs(n) < 350 &&
              A.y + A.h >= 447 &&
              ((A.vy = -205), (A.attackCooldown = 1.7)));
        } else if (
          ((A.vx = A.hurt > 0 ? A.vx : 0),
          (A.facing = n >= 0 ? 1 : -1),
          A.attackCooldown <= 0 && Math.abs(n) < 720)
        ) {
          const l = t.x + 14 - A.x - 16,
            r = t.y + 18 - A.y - 20,
            c = Math.hypot(l, r) || 1;
          (s.projectiles.push({
            id: ++this.projectileId,
            kind: "enemy",
            x: A.x + 10,
            y: A.y + 12,
            w: 12,
            h: 12,
            vx: (l / c) * 190 * i,
            vy: (r / c) * 190 * i,
            life: 4,
            damage: 1,
            owner: "enemy",
            hitIds: [],
          }),
            (A.attackCooldown = 2.45),
            this.burst(A.x + 16, A.y + 16, "#ff9a86", 5, 50));
        }
        A.x += A.vx * e;
        const o = A.y + A.h;
        ((A.vy = Math.min(650, A.vy + Ye * e)), (A.y += A.vy * e));
        for (const l of s.room.platforms)
          A.x + A.w > l.x &&
            A.x < l.x + l.w &&
            A.vy >= 0 &&
            o <= l.y + 4 &&
            A.y + A.h >= l.y &&
            ((A.y = l.y - A.h), (A.vy = 0));
        A.y > 600 && this.hitEnemy(A, 100);
      }
    }
  }
  updateBoss(e) {
    const s = this.state,
      t = s.boss,
      i = s.hero;
    if (
      !t ||
      t.mode === "dead" ||
      ((t.hurt = Math.max(0, t.hurt - e)),
      (t.exposed = Math.max(0, t.exposed - e)),
      !t.active &&
        i.x > 510 &&
        ((t.active = !0),
        (s.announcement = "余烬守卫 · 观察预警，抓住破绽"),
        (s.announcementTimer = 2.8),
        this.sound("boss"),
        (s.shake = 5)),
      !t.active)
    )
      return;
    const A = t.hp <= t.maxHp / 3 ? 3 : t.hp <= (t.maxHp * 2) / 3 ? 2 : 1;
    if (
      (A > t.phase &&
        ((t.phase = A),
        (t.mode = "transition"),
        (t.timer = 1.05),
        (t.vx = t.vy = 0),
        (t.y = 448 - t.h),
        (t.exposed = 0),
        (t.maxGuard = 24 + A * 6),
        (t.guard = t.maxGuard),
        (s.projectiles = s.projectiles.filter((n) => n.owner === "hero")),
        (i.invincible = Math.max(i.invincible, 0.65)),
        (s.announcement =
          A === 2 ? "第二阶段 · 连冲与烈焰弹幕" : "最终阶段 · 余烬暴君"),
        (s.announcementTimer = 2.6),
        (s.shake = 9),
        (s.flash = 0.3),
        this.impact(t.x + t.w / 2, t.y + t.h / 2, "break", "#ff9b6d"),
        this.burst(t.x + t.w / 2, t.y + t.h / 2, "#ff9466", 42, 230),
        this.sound("guardBreak")),
      (t.timer -= e),
      t.mode === "transition")
    ) {
      t.timer <= 0 && ((t.mode = "idle"), (t.timer = 0.3));
      return;
    }
    if (t.mode === "stagger") {
      ((t.vx = t.vy = 0),
        t.timer <= 0 &&
          ((t.mode = "idle"), (t.timer = 0.3), (t.guard = t.maxGuard)));
      return;
    }
    if (t.mode === "idle" || t.mode === "recover") {
      if (((t.vx = Pe(t.vx, 0, 1e3 * e)), t.timer <= 0)) {
        const n =
          t.phase === 1
            ? ["charge", "leap", "slam"]
            : t.phase === 2
              ? ["charge", "leap", "barrage", "slam"]
              : ["leap", "charge", "barrage", "slam"];
        ((t.intent = n[t.attackCount % n.length]),
          (t.attackCount += 1),
          (t.chain = t.intent === "charge" ? t.phase - 1 : 0),
          this.bossWindup(t, 0.82 - (t.phase - 1) * 0.17));
      }
    } else if (t.mode === "windup" && t.timer <= 0)
      t.intent === "charge"
        ? ((t.mode = "charge"),
          (t.timer = 0.55),
          (t.vx = t.facing * (420 + (t.phase - 1) * 60)))
        : t.intent === "leap"
          ? ((t.mode = "jump"),
            (t.vy = -540),
            (t.vx = ie((t.targetX - t.x) / (1080 / Ye), -450, 450)))
          : t.intent === "barrage"
            ? ((t.mode = "barrage"),
              (t.timer = 0.08),
              (t.chain = t.phase === 3 ? 3 : 2))
            : ((t.mode = "slam"), (t.timer = 0.12));
    else if (t.mode === "charge") {
      this.burst(t.x + t.w / 2, 446, "#eb945e", 1, 40);
      const n =
        (t.vx < 0 && t.x <= 420) ||
        (t.vx > 0 && t.x + t.w >= s.room.width - 90);
      (t.timer <= 0 || n) &&
        ((t.vx = 0),
        t.chain > 0
          ? ((t.chain -= 1), this.bossWindup(t, 0.44))
          : (this.bossShockwaves(t),
            this.bossRecover(t, 1.05 - (t.phase - 1) * 0.12)));
    } else
      t.mode === "slam" && t.timer <= 0
        ? (this.bossShockwaves(t),
          this.bossRecover(t, 1.15 - (t.phase - 1) * 0.12))
        : t.mode === "barrage" &&
          t.timer <= 0 &&
          (this.bossVolley(t, t.phase === 3 ? 5 : 3),
          (t.chain -= 1),
          t.chain > 0 ? (t.timer = 0.38) : this.bossRecover(t, 1.1));
    ((t.x = ie(t.x + t.vx * e, 410, s.room.width - t.w - 80)),
      t.mode === "jump" &&
        ((t.vy += Ye * e),
        (t.y += t.vy * e),
        t.y + t.h >= 448 &&
          t.vy > 0 &&
          ((t.y = 448 - t.h),
          (t.vy = t.vx = 0),
          this.bossShockwaves(t),
          this.bossRecover(t, 1.15 - (t.phase - 1) * 0.1))));
  }
  bossWindup(e, s) {
    ((e.mode = "windup"),
      (e.timer = s),
      (e.vx = 0),
      (e.targetX = ie(
        this.state.hero.x + 14 - e.w / 2,
        420,
        this.state.room.width - e.w - 90,
      )),
      e.intent === "leap" && (e.targetX = ie(e.targetX, e.x - 380, e.x + 380)),
      (e.facing = this.state.hero.x + 14 < e.x + e.w / 2 ? -1 : 1));
  }
  bossRecover(e, s) {
    ((e.mode = "recover"), (e.timer = s), (e.exposed = s), (e.vx = 0));
  }
  bossVolley(e, s) {
    const t = this.state,
      i = t.hero,
      A = Math.atan2(i.y + 18 - e.y - 30, i.x + 14 - e.x - e.w / 2);
    for (let n = 0; n < s; n++) {
      const o = (n - (s - 1) / 2) * 0.24;
      t.projectiles.push({
        id: ++this.projectileId,
        kind: "enemy",
        x: e.x + e.w / 2,
        y: e.y + 30,
        w: 14,
        h: 14,
        vx: Math.cos(A + o) * (210 + e.phase * 12),
        vy: Math.sin(A + o) * (210 + e.phase * 12),
        life: 4,
        damage: 1,
        owner: "enemy",
        hitIds: [],
      });
    }
    (this.burst(e.x + e.w / 2, e.y + 30, "#ff956a", 10, 100),
      this.sound("fire"));
  }
  bossShockwaves(e) {
    const s = this.state;
    ((s.shake = 7),
      this.sound("boss"),
      this.impact(e.x + e.w / 2, 442, "heavy", "#ffb474"),
      this.burst(e.x + e.w / 2, 445, "#ffb474", 28, 210));
    for (const t of [-1, 1])
      s.projectiles.push({
        id: ++this.projectileId,
        kind: "shockwave",
        x: e.x + e.w / 2,
        y: 424,
        w: 36,
        h: 24,
        vx: t * (230 + (e.phase - 1) * 45),
        vy: 0,
        life: 4,
        damage: 1,
        owner: "enemy",
        hitIds: [],
      });
    e.phase === 3 && e.intent === "slam" && this.bossVolley(e, 3);
  }
  updateAttacks(e) {
    const s = this.state,
      t = s.hero;
    if (t.attackTimer > 0 && t.weapon === "blade") {
      const i = s.overdrive > 0,
        A = t.attackStep === 3,
        n =
          i || A
            ? {
                x: t.facing === 1 ? t.x + 4 : t.x - 114,
                y: t.y - 28,
                w: 140,
                h: 96,
              }
            : {
                x: t.facing === 1 ? t.x + 12 : t.x - 70,
                y: t.y - 13,
                w: 88,
                h: 67,
              };
      for (const o of s.enemies)
        !o.dead &&
          !this.meleeHits.has(o.id) &&
          z(n, o) &&
          (this.meleeHits.add(o.id),
          this.hitEnemy(
            o,
            this.effectiveDamage() *
              (t.attackStep === 3 ? 2.8 : t.attackStep === 2 ? 1.55 : 1.35),
            t.attackStep === 3,
          ));
      s.boss &&
        s.boss.active &&
        !this.meleeHits.has(-1) &&
        z(n, s.boss) &&
        (this.meleeHits.add(-1),
        this.hitBoss(
          this.effectiveDamage() *
            (t.attackStep === 3 ? 2.8 : t.attackStep === 2 ? 1.55 : 1.35),
          t.attackStep === 3,
        ));
    }
    for (const i of s.projectiles)
      if (!(i.life <= 0)) {
        if (
          ((i.life -= e),
          (i.rotation = (i.rotation || 0) + e * 16),
          i.kind === "disc" &&
            (i.life < (i.returnAt || 1.1) &&
              !i.returning &&
              ((i.returning = !0),
              (i.hitIds = []),
              this.awakenedDiscs.has(i.id) &&
                ((i.damage *= 1.6),
                (i.w = i.h = 26),
                this.burst(i.x + 10, i.y + 10, "#c9baff", 6, 90))),
            i.returning))
        ) {
          const A = t.x + 14 - i.x,
            n = t.y + 18 - i.y,
            o = Math.hypot(A, n) || 1,
            l = this.awakenedDiscs.has(i.id) ? 620 : 480;
          ((i.vx = (A / o) * l), (i.vy = (n / o) * l), o < 22 && (i.life = 0, t.stamina = Math.min(100, (t.stamina || 0) + 7), t.attackCooldown = Math.min(t.attackCooldown, .1), this.burst(t.x+14,t.y+15,"#c7b9ff",6,70)));
        }
        if (
          ((i.x += i.vx * e),
          (i.y += i.vy * e),
          (i.x < -60 || i.x > s.room.width + 60 || i.y < -100 || i.y > 600) &&
            (i.life = 0),
          !(i.life <= 0))
        ) {
          if (i.owner === "hero") {
            for (const A of s.enemies)
              if (
                !A.dead &&
                !i.hitIds.includes(A.id) &&
                z(i, A) &&
                (i.hitIds.push(A.id),
                this.hitEnemy(A, i.damage, i.blastRadius > 60 || i.empowered),
                i.explosive && this.explodeProjectile(i),
                i.kind !== "disc")
              ) {
                i.life = 0;
                break;
              }
            i.life > 0 &&
              s.boss &&
              s.boss.active &&
              s.boss.mode !== "dead" &&
              !i.hitIds.includes(-1) &&
              z(i, s.boss) &&
              (i.hitIds.push(-1),
              this.hitBoss(i.damage, i.blastRadius > 60 || i.empowered),
              i.explosive && this.explodeProjectile(i),
              i.kind !== "disc" && (i.life = 0));
          } else
            z(i, t) &&
              (this.hurtHero(i.damage, i.x),
              i.kind !== "shockwave" && (i.life = 0));
          if (i.kind === "ember") {
            for (const A of s.room.platforms)
              if (!A.oneWay && z(i, A)) {
                i.explosive && this.explodeProjectile(i);
                i.life = 0;
                break;
              }
          }
        }
      }
    s.projectiles = s.projectiles.filter(
      (i) => (i.life <= 0 && this.awakenedDiscs.delete(i.id), i.life > 0),
    );
  }
  enemyContact() {
    const e = this.state,
      s = e.hero;
    for (const i of e.enemies)
      !i.dead &&
        z(s, i) &&
        (s.vy > 80 && this.previousHeroBottom <= i.y + 18
          ? (this.hitEnemy(i, this.effectiveDamage() * 2),
            (s.vy = -365),
            (s.jumps = 1),
            (this.variableJump = !1),
            this.sound("jump"),
            this.burst(i.x + i.w / 2, i.y, "#fff0b5", 12, 110))
          : this.hurtHero(1, i.x + i.w / 2));
    const t = e.boss;
    t &&
      t.active &&
      !["dead", "transition", "recover", "stagger"].includes(t.mode) &&
      z(s, t) &&
      (s.vy > 80 && this.previousHeroBottom <= t.y + 18
        ? (this.hitBoss(this.effectiveDamage() * 2),
          (s.vy = -430),
          (s.jumps = 1),
          (s.invincible = Math.max(s.invincible, 0.25)),
          (this.variableJump = !1),
          this.sound("jump"))
        : this.hurtHero(1, t.x + t.w / 2));
  }
  damageAmount(e) {
    const s = this.random() < this.state.hero.critChance;
    return ((this.criticalHit = s), e * (s ? 1.75 : 1));
  }
  effectiveDamage() {
    const e = this.state;
    return (
      e.hero.damage *
      (e.overdrive > 0 ? 1.55 : 1) *
      (e.synergies.includes("blazing") ? 1.2 : 1) *
      (e.hero.attackTimer > 0 ? this.attackPower : 1)
    );
  }
  gainResonance(e) {
    const s = this.state;
    if (s.overdrive > 0) return;
    const t = s.resonance;
    ((s.resonance = Math.min(100, s.resonance + e)),
      t < 100 &&
        s.resonance >= 100 &&
        ((s.announcement = "星能充盈 · 按 Q 觉醒"),
        (s.announcementTimer = 3),
        this.sound("upgrade"),
        this.burst(s.hero.x + 14, s.hero.y + 18, "#ffe29b", 22, 150)));
  }
  refreshSynergies() {
    const e = this.state,
      s = st
        .filter((t) =>
          t.requires.every((i) =>
            i.split("|").some((A) => e.hero.upgrades.includes(A)),
          ),
        )
        .map((t) => t.id);
    for (const t of s)
      if (!e.synergies.includes(t)) {
        const i = st.find((A) => A.id === t);
        (t === "guardian" && (e.hero.shield += 1),
          this.label(e.hero.x + 14, e.hero.y - 36, `羁绊 · ${i.name}`, i.color),
          this.burst(e.hero.x + 14, e.hero.y + 18, i.color, 36, 220),
          this.sound("synergy"),
          (e.announcement = `羁绊觉醒 · ${i.name}`),
          (e.announcementTimer = 3));
      }
    e.synergies = s;
  }
  hitEnemy(e, s, t = !1) {
    if (e.dead) return;
    const i = this.damageAmount(s),
      A = this.criticalHit;
    if (
      ((e.hp -= i),
      this.gainResonance(8 + (t ? 5 : 0)),
      (e.hurt = t ? 0.25 : 0.17),
      (e.vx = this.state.hero.facing * (t ? 310 : A ? 220 : 155)),
      t && e.kind !== "bat" && (e.vy = -150),
      (this.state.shake = Math.max(this.state.shake, t ? 5.5 : A ? 4.2 : 2.8)),
      (this.state.hitstop = Math.max(
        this.state.hitstop,
        t ? 0.07 : A ? 0.055 : 0.035,
      )),
      this.impact(
        e.x + e.w / 2,
        e.y + e.h / 2,
        t ? "heavy" : A ? "critical" : "hit",
        A ? "#ffd779" : "#c8fff0",
      ),
      this.burst(
        e.x + e.w / 2,
        e.y + e.h / 2,
        A ? "#ffd779" : "#dcfff1",
        t ? 17 : 10,
        t ? 210 : 140,
      ),
      this.label(
        e.x + e.w / 2,
        e.y - 2,
        `${A ? "暴击 " : t ? "终结 " : ""}${Math.round(i * 10) / 10}`,
        A ? "#ffd779" : t ? "#aaffea" : "#fff0ce",
      ),
      this.sound(t ? "heavy" : A ? "critical" : "hit"),
      e.hp > 0)
    )
      return;
    const n = this.state,
      o = n.hero;
    ((e.dead = !0),
      this.gainResonance(18),
      (n.kills += 1),
      (n.combo += 1),
      (n.maxCombo = Math.max(n.maxCombo, n.combo)),
      (n.comboTimer = 4),
      this.sound("kill"),
      this.burst(
        e.x + e.w / 2,
        e.y + e.h / 2,
        e.kind === "bat" ? "#b7afff" : "#8cdec0",
        18,
        150,
      ));
    const l = ge(n.seed ^ Math.imul(e.id + 1, 2246822507));
    this.drop("xp", e.x + 7, e.y, 5);
    for (let r = 0; r < 2 + +(l() > 0.5); r++)
      this.drop("coin", e.x - 4 + r * 13, e.y + 12, 1);
    (l() > 0.82 && o.hp < o.maxHp && this.drop("heart", e.x + 13, e.y - 12, 1),
      o.lifesteal > 0 &&
        l() < o.lifesteal &&
        ((o.hp = Math.min(o.maxHp, o.hp + 1)),
        this.label(o.x, o.y - 18, "+1 ♥", "#ffa5ac")));
  }
  hitBoss(e, s = !1) {
    const t = this.state,
      i = t.boss;
    if (!i || i.mode === "dead" || i.mode === "transition" || !i.active) return;
    const A = i.mode === "stagger" ? 1.6 : i.exposed > 0 ? 1.45 : 1,
      n = this.damageAmount(e) * A,
      o = this.criticalHit;
    ((i.hp = Math.max(0, i.hp - n)),
      this.gainResonance(5 + (s ? 3 : 0)),
      (i.hurt = 0.15),
      (t.shake = Math.max(t.shake, s ? 5 : o ? 4 : 3)),
      (t.hitstop = Math.max(t.hitstop, s ? 0.065 : o ? 0.045 : 0.025)),
      this.impact(
        i.x + i.w / 2,
        i.y + i.h / 2,
        s ? "heavy" : o ? "critical" : "hit",
        A > 1 ? "#b6fff0" : "#ffbe7d",
      ),
      this.burst(
        i.x + i.w / 2,
        i.y + i.h / 2,
        A > 1 ? "#b6fff0" : "#ffbe7d",
        s ? 18 : 10,
        170,
      ),
      this.label(
        i.x + i.w / 2,
        i.y,
        `${A > 1 ? "破绽 " : o ? "暴击 " : ""}${Math.round(n * 10) / 10}`,
        A > 1 ? "#b6fff0" : "#ffe1b0",
      ),
      this.sound(s ? "heavy" : o ? "critical" : "hit"),
      i.mode !== "stagger" &&
        ((i.guard = Math.max(0, i.guard - n * (s ? 1.8 : 0.8))),
        i.guard <= 0 &&
          i.hp > 0 &&
          ((i.mode = "stagger"),
          (i.timer = 1.6),
          (i.exposed = 1.6),
          (i.vx = i.vy = 0),
          (i.y = 448 - i.h),
          (t.hitstop = 0.09),
          (t.shake = 7),
          this.impact(i.x + i.w / 2, i.y + i.h / 2, "break", "#adfff0"),
          this.label(
            i.x + i.w / 2,
            i.y - 24,
            "护甲击破 · 全力输出！",
            "#adfff0",
          ),
          this.sound("guardBreak"))),
      i.hp <= 0 &&
        ((i.mode = "dead"),
        (i.vx = i.vy = 0),
        (t.kills += 1),
        (t.roomCleared = !0),
        (t.roomsCleared = t.roomCount),
        this.burst(i.x + i.w / 2, i.y + i.h / 2, "#ffca78", 90, 300),
        (t.shake = 12),
        (t.flash = 0.8),
        this.finish(!0)));
  }
  hurtHero(e, s, t = !1) {
    const i = this.state,
      A = i.hero;
    if (i.phase === "playing") {
      if (!t && A.invincible > 0) {
        A.dashTimer > 0.1 &&
          A.perfectDodgeCooldown <= 0 &&
          ((A.perfectDodgeCooldown = 1),
          (A.counterTimer = 1.4),
          this.gainResonance(20),
          this.impact(A.x + 14, A.y + 18, "break", "#9cefff"),
          this.label(A.x + 14, A.y - 30, "完美闪避 · 下一击反击", "#9cefff"),
          this.sound("perfectDodge"));
        return;
      }
      if (A.shield > 0) {
        ((A.shield -= 1),
          (A.invincible = 1),
          this.burst(A.x + 14, A.y + 18, "#b7afff", 18, 160),
          this.label(A.x, A.y - 12, "月光守护", "#c2bdff"),
          this.sound("hurt"));
        return;
      }
      ((A.hp = Math.max(0, A.hp - e)),
        (A.invincible = 1.3),
        (A.vx = (A.x + 14 >= s ? 1 : -1) * 230),
        (A.vy = -230),
        (A.dashTimer = 0),
        (this.variableJump = !1),
        (i.combo = 0),
        (i.comboTimer = 0),
        (i.shake = 7),
        (i.flash = 0.3),
        (i.hitstop = Math.max(i.hitstop, 0.055)),
        this.sound("hurt"),
        this.burst(A.x + 14, A.y + 20, "#ff9a93", 18, 160),
        A.hp <= 0 && this.finish(!1));
    }
  }
  drop(e, s, t, i) {
    this.state.pickups.push({
      id: ++this.pickupId,
      kind: e,
      x: s,
      y: t,
      w: e === "xp" ? 11 : 14,
      h: e === "xp" ? 11 : 16,
      value: i,
      vy: -130,
      bob: this.visualRandom() * Math.PI * 2,
      collected: !1,
    });
  }
  updatePickups(e) {
    const s = this.state,
      t = s.hero;
    for (const i of s.pickups) {
      if (i.collected) continue;
      if (((i.bob += e * 2.5), i.vy !== 0)) {
        ((i.vy += 430 * e), (i.y += i.vy * e));
        for (const c of s.room.platforms)
          i.x + i.w > c.x &&
            i.x < c.x + c.w &&
            i.y + i.h >= c.y &&
            i.y < c.y + 14 &&
            i.vy > 0 &&
            ((i.y = c.y - i.h - 5), (i.vy = 0));
        if (i.y > 550) {
          i.collected = !0;
          continue;
        }
      }
      const A = t.x + t.w / 2 - i.x - i.w / 2,
        n = t.y + t.h / 2 - i.y - i.h / 2,
        o = Math.hypot(A, n),
        l = Math.max(110, t.magnet || 0) + (s.synergies.includes("fireflies") ? 120 : 0),
        r = i.kind === "xp" ? Math.max(150, l) : l;
      if (o < r && (i.kind !== "heart" || t.hp < t.maxHp)) {
        const c = Math.min(o / Math.max(e, .001), i.kind === "xp" ? 480 : 400);
        ((i.x += (A / (o || 1)) * c * e),
          (i.y += (n / (o || 1)) * c * e),
          (i.vy = 0));
      }
      if (o < 22 || z(i, t)) {
        if (i.kind === "heart" && t.hp >= t.maxHp) continue;
        ((i.collected = !0),
          i.kind === "coin"
            ? ((s.coins +=
                i.value + t.upgrades.filter((c) => c === "fortune").length),
              this.sound("coin"),
              this.label(t.x, t.y - 28, `+${i.value + t.upgrades.filter(c => c === "fortune").length} 星币`, "#ffdb80"),
              this.burst(i.x + 6, i.y + 6, "#ffdb80", 4, 65))
            : i.kind === "xp"
              ? (this.gainResonance(4),
                this.gainXp(i.value),
                this.burst(i.x + 6, i.y + 6, "#80e5d1", 4, 65))
              : ((t.hp = Math.min(t.maxHp, t.hp + i.value)),
                this.sound("coin"),
                this.label(t.x, t.y - 15, "+1 ♥", "#ffb3bb")));
      }
    }
    s.pickups = s.pickups.filter((i) => !i.collected);
  }
  gainXp(e) {
    const s = this.state.hero;
    ((s.xp += e),
      s.xp >= s.xpNeeded &&
        this.state.phase === "playing" &&
        this.offerUpgrade());
  }
  offerUpgrade() {
    const e = this.state,
      s = e.hero;
    ((s.xp -= s.xpNeeded), (s.level += 1), (s.xpNeeded += 5));
    const t = qe.filter(
        (o) =>
          !(e.modifier === "iron" && o.id === "vigor") &&
          !(s.extraProjectiles >= 3 && o.id === "multishot"),
      ),
      i = ge(e.seed ^ Math.imul(s.level, 73244475)),
      A = [];
    for (; A.length < 3 && t.length;) {
      const o = Math.floor(i() * t.length);
      A.push(t.splice(o, 1)[0]);
    }
    const n = [];
    if (
      (s.upgrades.includes("edge") &&
        !s.upgrades.includes("tempo") &&
        n.push("tempo"),
      s.upgrades.includes("tempo") &&
        !s.upgrades.includes("edge") &&
        n.push("edge"),
      s.upgrades.includes("multishot") &&
        !s.upgrades.includes("magnet") &&
        n.push("magnet"),
      s.upgrades.includes("magnet") &&
        !s.upgrades.includes("multishot") &&
        n.push("multishot"),
      s.upgrades.includes("vigor") &&
        !s.upgrades.some((o) => o === "blood" || o === "shield") &&
        n.push("shield"),
      e.modifier !== "iron" &&
        s.upgrades.some((o) => o === "blood" || o === "shield") &&
        !s.upgrades.includes("vigor") &&
        n.push("vigor"),
      n.length && !A.some((o) => n.includes(o.id)))
    ) {
      const o = qe.find((l) => l.id === n[Math.floor(i() * n.length)]);
      o && (A[A.length - 1] = o);
    }
    ((e.upgradeChoices = A), (e.phase = "upgrade"), this.sound("upgrade"));
  }
  nextRoom() {
    const e = this.state,
      s = e.roomIndex + 1;
    if (s >= e.roomCount) return;
    const t = mA(e.seed, s);
    ((e.roomIndex = s),
      (e.room = t.room),
      (e.enemies = t.enemies),
      (e.pickups = t.pickups),
      (e.projectiles = []),
      (e.hitstop = 0),
      (e.impacts = []),
      this.awakenedDiscs.clear(),
      (e.particles = []),
      (e.floatingTexts = []),
      (e.hero.x = e.room.spawn.x),
      (e.hero.y = e.room.spawn.y),
      (e.hero.vx = 0),
      (e.hero.vy = 0),
      (e.hero.jumps = 0),
      (e.hero.grounded = !1),
      (e.hero.dashTimer = 0),
      (e.hero.invincible = 1.2),
      (this.variableJump = !1),
      e.synergies.includes("guardian") && (e.hero.shield += 1),
      (e.cameraX = 0),
      (e.roomCleared = !1),
      (e.announcement = e.room.name),
      (e.announcementTimer = 2.6),
      (e.transition = 1),
      (e.boss = e.room.isBoss
        ? {
            x: 1210,
            y: 330,
            w: 104,
            h: 118,
            hp: Ot,
            maxHp: Ot,
            phase: 1,
            mode: "idle",
            timer: 1.1,
            vx: 0,
            vy: 0,
            facing: -1,
            hurt: 0,
            attackCount: 0,
            active: !1,
            intent: "charge",
            targetX: 700,
            chain: 0,
            guard: 30,
            maxGuard: 30,
            exposed: 0,
          }
        : null),
      this.sound("portal"));
  }
  finish(e) {
    const s = this.state;
    if (s.result) return;
    s.phase = e ? "victory" : "gameover";
    const t = {
      seed: s.seed,
      modifier: s.modifier,
      weapon: this.weaponAtStart,
      won: e,
      time: Math.round(s.time * 100) / 100,
      score: Math.max(
        0,
        Math.round(
          s.roomsCleared * 1200 +
            s.kills * 200 +
            s.coins * 25 +
            (e ? 5e3 : 0) -
            s.time * 8 -
            s.deaths * 200,
        ),
      ),
      coins: s.coins,
      kills: s.kills,
      level: s.hero.level,
      deaths: s.deaths,
      roomsCleared: s.roomsCleared,
      maxCombo: s.maxCombo,
      upgrades: [...s.hero.upgrades],
      overdriveCount: s.overdriveCount,
      synergies: [...s.synergies],
    };
    ((s.result = t), this.sound(e ? "win" : "lose"));
  }
  updateEffects(e) {
    const s = this.state;
    ((s.shake = Math.max(0, s.shake - e * 20)),
      (s.flash = Math.max(0, s.flash - e * 2.5)));
    for (const t of s.impacts) t.life -= e;
    s.impacts = s.impacts.filter((t) => t.life > 0);
    for (const t of s.particles)
      ((t.life -= e),
        (t.x += t.vx * e),
        (t.y += t.vy * e),
        (t.vy += (t.gravity ?? 220) * e));
    s.particles = s.particles.filter((t) => t.life > 0);
    for (const t of s.floatingTexts) ((t.life -= e), (t.y -= e * 30));
    s.floatingTexts = s.floatingTexts.filter((t) => t.life > 0);
  }
  impact(e, s, t, i) {
    const A = t === "break" ? 0.42 : t === "heavy" ? 0.3 : 0.22;
    (this.state.impacts.push({
      x: e,
      y: s,
      kind: t,
      color: i,
      life: A,
      maxLife: A,
      size:
        t === "break" ? 84 : t === "heavy" ? 52 : t === "critical" ? 38 : 25,
      angle: this.state.hero.facing < 0 ? Math.PI : 0,
    }),
      this.state.impacts.length > 28 && this.state.impacts.shift());
  }
  burst(e, s, t, i, A) {
    const n = this.state.particles;
    for (let o = 0; o < i; o++) {
      const l = this.visualRandom() * Math.PI * 2,
        r = A * (0.25 + this.visualRandom() * 0.75),
        c = 0.25 + this.visualRandom() * 0.45;
      n.push({
        x: e,
        y: s,
        vx: Math.cos(l) * r,
        vy: Math.sin(l) * r,
        life: c,
        maxLife: c,
        size: 2 + Math.floor(this.visualRandom() * 3),
        color: t,
        gravity: 170,
      });
    }
    n.length > 350 && n.splice(0, n.length - 350);
  }
  label(e, s, t, i) {
    this.state.floatingTexts.push({
      x: e,
      y: s,
      text: t,
      color: i,
      life: 0.95,
      maxLife: 0.95,
    });
  }
  sound(e) {
    this.callbacks.sound?.(e);
  }
}

installSouls(JA,qe);
export { Ue, Fe, vt, ce, ge, St, YA, ZA, mA, Ye, GA, Ot, qe, st, z, ie, Pe, QA, Dt, JA };
