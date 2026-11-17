import { test,expect } from '@playwright/test';
import { JA,qe } from '../assets/game-core.js';
import { CHAPTERS,BIOMES } from '../assets/campaign-data.js';
import { createCampaignMap } from '../assets/campaign-map.js';
import { BOSS_MOVES } from '../assets/campaign-boss.js';
import { validCampaignSave } from '../assets/campaign-runtime.js';
import { playCampaign } from '../scripts/playtest-campaign.mjs';
const run=(chapter=0)=>{const g=new JA();g.start({mode:'campaign',seed:42,weapon:'blade',modifier:'standard',chapterStart:chapter});return g;};
test('50 deterministic layouts have ten boss arenas and reachable bonus stairs across five biomes',()=>{
 for(const seed of [0,42,12345,0xffffffff])for(let i=0;i<50;i++){
  const map=createCampaignMap(seed,i),r=map.room;
  expect(map).toEqual(createCampaignMap(seed,i));expect(r.campaignBiome).toBe(Math.floor(i/10));expect(r.isBoss).toBe(i%5===4);
  expect(r.platforms.some(p=>!p.oneWay&&p.x<=100&&p.x+p.w>=128)).toBe(true);
  expect(r.platforms.some(p=>!p.oneWay&&p.x<=r.exit.x&&p.x+p.w>=r.exit.x+r.exit.w)).toBe(true);
  for(const e of map.enemies.filter(e=>e.role!=='bat'))expect(r.platforms.some(p=>Math.abs(p.y-e.y-e.h)<1&&e.x>=p.x&&e.x+e.w<=p.x+p.w)).toBe(true);
  for(const gap of r.hazards)expect(gap.w).toBeLessThanOrEqual(120);
  if(!r.isBoss){const stairs=r.platforms.filter(p=>p.oneWay).slice(0,3);expect(stairs.map(p=>p.y)).toEqual([370,302,234]);expect(map.enemies.some(e=>e.optional)).toBe(true);}
 }
 expect(CHAPTERS).toHaveLength(10);expect(BIOMES).toHaveLength(5);expect(new Set(CHAPTERS.map(c=>c.boss)).size).toBe(10);
});
for(const weapon of ['blade','ember','disc'])test(`${weapon} completes all fifty floors with normal inputs`,()=>{const r=playCampaign(weapon,42);expect(r.phase,JSON.stringify(r)).toBe('victory');expect(r.floors.map(f=>f.index)).toEqual(Array.from({length:50},(_,i)=>i));});
test('boss defeat unlocks progression without ending run; final exit completes expedition',()=>{
 const g=run();g.enterCampaignFloor(4);const b=g.state.boss;b.active=true;g.hitBoss(999);expect(g.state.phase).not.toBe('victory');if(g.state.phase==='upgrade')g.chooseUpgrade(g.state.upgradeChoices[0].id);expect(g.state.roomCleared).toBe(true);g.nextRoom();expect(g.state.roomIndex).toBe(5);expect(g.state.hero.hp).toBe(g.state.hero.maxHp);
 g.enterCampaignFloor(49);g.state.boss.active=true;g.hitBoss(999);expect(g.state.phase).not.toBe('victory');g.nextRoom();expect(g.state.phase).toBe('victory');expect(g.state.result.mode).toBe('campaign');
});
test('boss attacks use delayed ground damage and all melee attacks can be precisely parried',()=>{
 for(const chapter of [0,3,4,8,9]){const g=run(chapter);g.enterCampaignFloor(chapter*5+4);const s=g.state,b=s.boss,h=s.hero;b.active=true;b.x=800;h.x=760;h.y=412;h.invincible=0;h.facing=1;h.blocking=true;h.guardAge=.05;const hp=h.hp;
  b.mode='active';b.intent='thrust';b.timer=.1;b.age=0;b.facing=-1;g.updateBoss(.01);expect(h.hp).toBe(hp);expect(h.parryRiposte).toBeGreaterThan(0);expect(['recover','stagger']).toContain(b.mode);
 }
 const g=run(4),s=g.state,h=s.hero;g.enterCampaignFloor(24);const b=s.boss;b.active=true;b.mode='recover';b.timer=10;h.invincible=0;h.x=700;h.y=412;h.blocking=true;h.guardAge=1;const hp=h.hp;b.zones=[{x:690,w:100,age:0,delay:.5,hit:false}];g.updateBoss(.49);expect(h.hp).toBe(hp);g.updateBoss(.02);expect(h.hp).toBeLessThan(hp);
});
test('all ten boss scripts reach phase two and use bounded summons and telegraphed moves',()=>{
 for(let c=0;c<10;c++){const g=run(c);g.enterCampaignFloor(c*5+4);const s=g.state,b=s.boss;s.hero.x=740;b.active=true;b.hp=b.maxHp*.49;g.updateBoss(.01);expect(b.phase).toBe(2);
  const seen=new Set();for(let i=0;i<18000&&!b.dead;i++){g.updateBoss(1/120);if(b.mode==='windup')seen.add(b.intent);s.hero.invincible=100;}
  for(const name of CHAPTERS[c].phase2){expect(seen.has(name),`${c}:${name}`).toBe(true);expect(BOSS_MOVES[name].windup).toBeGreaterThan(.6);}
  expect(s.enemies.filter(e=>!e.dead).length).toBeLessThanOrEqual(2);
 }
});
test('entrance save resumes loadout; preview never overwrites continuous progress',()=>{
 let saved;const g=new JA({saveCampaign:s=>{saved=s;}});g.start({mode:'campaign',seed:12,weapon:'disc',modifier:'standard'});g.state.hero.damage=2.8;g.state.hero.upgrades=['edge'];g.state.coins=22;g.state.roomCleared=true;g.nextRoom();expect(validCampaignSave(saved)).toBe(true);expect(saved.index).toBe(1);
 const resumed=new JA();resumed.start({mode:'campaign',seed:saved.seed,weapon:saved.hero.weapon,modifier:'standard',resume:saved});expect(resumed.state.hero.damage).toBe(2.8);expect(resumed.state.coins).toBe(22);expect(resumed.state.roomIndex).toBe(1);expect(resumed.state.hero.action).toBeNull();
 const previous=saved;g.start({mode:'campaign',seed:42,weapon:'blade',modifier:'standard',chapterStart:7,preview:true});expect(saved).toBe(previous);expect(g.state.campaign.preview).toBe(true);expect(validCampaignSave({...previous,index:50})).toBe(false);
});
test('late-run upgrades always remain selectable without exceeding capped movement stats',()=>{
 const g=run(),h=g.state.hero;for(let i=0;i<80;i++){h.xp=h.xpNeeded;g.offerUpgrade();expect(g.state.upgradeChoices.length).toBeGreaterThan(0);g.chooseUpgrade(g.state.upgradeChoices[0].id);expect(g.state.phase).toBe('playing');expect(Number.isFinite(h.damage)).toBe(true);}expect(h.speed).toBeLessThan(500);expect(h.attackSpeed).toBeLessThanOrEqual(2.8);
});
