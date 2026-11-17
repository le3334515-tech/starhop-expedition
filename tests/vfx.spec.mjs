import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { JA } from '../assets/game-core.js';
import { vfxFrame } from '../assets/combat-vfx.js';

function game(){const g=new JA();g.start({seed:42,weapon:'blade',modifier:'standard'});return g;}

test('generated atlases contain 16 shield poses and 144 distinct nonempty VFX frames',async()=>{
  const atlas=JSON.parse(await readFile(new URL('../assets/art/ashen-vfx/atlas.json',import.meta.url),'utf8'));
  for(const [name,meta] of Object.entries(atlas)){
    const expected=name==='shield'?16:24;expect(meta.frames).toBe(expected);expect(meta.uniqueFrames).toBe(expected);expect(meta.nonemptyFrames).toBe(expected);
    const data=await readFile(new URL(`../assets/art/ashen-vfx/${name}.png`,import.meta.url));
    expect(data.readUInt32BE(16)).toBe(meta.frameWidth*expected);expect(data.readUInt32BE(20)).toBe(meta.frameHeight);
  }
});

test('swing VFX starts once at release, not during startup or after cancellation',()=>{
  const g=game();g.attack();g.advanceAction(.02,{});expect(g.state.combatVfx).toHaveLength(0);
  g.cancelAction();g.advanceAction(.2,{});expect(g.state.combatVfx).toHaveLength(0);
  g.attack();g.advanceAction(g.state.hero.action.spec.startup+.005,{});expect(g.state.combatVfx.filter(fx=>fx.kind==='slash')).toHaveLength(1);
  for(let j=0;j<8;j++)g.advanceAction(.002,{});
  expect(g.state.combatVfx.filter(fx=>fx.kind==='slash')).toHaveLength(1);
});

test('VFX queue freezes on pause and hitstop, expires, and has a bounded simultaneous count',()=>{
  const g=game(),h=g.state.hero;
  const fx=g.spawnCombatVfx('parry',100,200);const hp=h.hp;
  g.state.hitstop=.1;g.updateEffects(.05);expect(fx.age).toBe(0);
  g.state.hitstop=0;g.state.phase='paused';g.updateEffects(.05);expect(fx.age).toBe(0);
  g.state.phase='playing';g.updateEffects(.24);expect(vfxFrame(fx)).toBe(12);
  g.updateEffects(.25);expect(g.state.combatVfx).toHaveLength(0);expect(h.hp).toBe(hp);
  for(let j=0;j<100;j++)g.spawnCombatVfx('impact',100,200);
  expect(g.state.combatVfx).toHaveLength(24);expect(new Set(g.state.combatVfx.map(fx=>fx.id)).size).toBe(24);
});

test('shield blocks, parries and explosions use different effects without changing damage rules',()=>{
  const g=game(),h=g.state.hero,target=g.state.enemies.find(e=>e.role==='shield');
  g.prepareMonster(target);Object.assign(h,{x:target.x-60,y:412,facing:1});
  const hp=target.hp;
  const result=g.applyPlayerAttack(target,{damage:1,poise:8,sourceX:h.x,dir:1,type:'blade'});
  expect(result.result).toBe('blocked');expect(target.hp).toBe(hp);expect(target.guardFlash).toBeGreaterThan(0);
  expect(g.state.combatVfx.at(-1).kind).toBe('parry');expect(g.state.combatVfx.at(-1).size).toBe(48);
  Object.assign(h,{blocking:true,guardAge:.05,invincible:0});g.receiveAttack({damage:1,source:target,sourceX:target.x,canBlock:true,canParry:true});
  expect(g.state.combatVfx.at(-1).kind).toBe('parry');expect(g.state.combatVfx.at(-1).size).toBe(92);
  g.explodeAt(500,300,1,null,10);expect(g.state.combatVfx.at(-1).kind).toBe('ember');
});

test('shield and new effects load on desktop and mobile and render without errors',async({page})=>{
  const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('ashen-vfx')&&!r.ok())missing.push(r.url());});
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  const loaded=await page.evaluate(async()=>(await import('/assets/combat-vfx-art.js')).combatVfxReady);
  expect(loaded).toHaveLength(7);expect(loaded.every(Boolean)).toBe(true);
  await page.getByRole('button',{name:/开启试炼/}).click();await page.getByRole('button',{name:/我明白了，开始试炼/}).click();
  await page.evaluate(async()=>{
    const g=(await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine;
    Object.assign(g.state.hero,{x:1315,y:412,invincible:0});g.state.cameraX=970;g.state.announcementTimer=0;
  });
  await page.keyboard.down('KeyJ');await page.waitForTimeout(170);await page.keyboard.up('KeyJ');
  await page.locator('.game-shell').screenshot({path:'preview-shield-vfx.png'});
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);
  await page.locator('.game-shell').screenshot({path:'preview-shield-vfx-mobile.png'});
  expect(errors).toEqual([]);expect(missing).toEqual([]);
});
