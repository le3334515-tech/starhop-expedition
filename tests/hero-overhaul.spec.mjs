import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { JA,qe } from '../assets/game-core.js';
import { selectHeroPose,weaponMuzzle } from '../assets/hero-animation.js';
import { upgradeChoices } from '../assets/run-systems.js';
import { hasClearSight,canScheduleAttack } from '../assets/encounter-rules.js';

function trial(weapon='blade'){const g=new JA();g.start({seed:42,weapon,modifier:'standard'});g.state.transition=0;return g;}
const tick=(g,input={},n=1)=>{for(let i=0;i<n;i++)g.update(1/120,input);};
const dummy=(id,x=300)=>({id,role:'melee',kind:'slime',x,y:412,w:32,h:36,hp:100,maxHp:100,vx:0,vy:0,facing:-1,timer:0,hurt:0,dead:false,originX:x,originY:412});

test('seven generated hero atlases contain 164 unique nonempty poses',async()=>{
  const atlas=JSON.parse(await readFile(new URL('../assets/art/ashen-hero/atlas.json',import.meta.url),'utf8'));
  expect(Object.values(atlas).reduce((sum,a)=>sum+a.frames,0)).toBe(164);
  for(const [name,a] of Object.entries(atlas)){
    expect(a.uniqueFrames).toBe(a.frames);expect(a.nonemptyFrames).toBe(a.frames);
    const png=await readFile(new URL(`../assets/art/ashen-hero/${name}.png`,import.meta.url));expect(png.readUInt32BE(16)).toBe(a.frameWidth*a.frames);expect(png.readUInt32BE(20)).toBe(a.frameHeight);
  }
});

test('animation uses action phases, actual roll state and independent weapon release mounts',()=>{
  const g=trial(),h=g.state.hero;h.grounded=true;
  expect(selectHeroPose(h).state).toBe('idle');g.attack();expect(selectHeroPose(h).frame).toBe(0);
  g.advanceAction(.06,{});expect(selectHeroPose(h).sheet).toBe('blade');expect(selectHeroPose(h).frame).toBeGreaterThanOrEqual(5);
  g.cancelAction();h.dashTimer=.09;expect(selectHeroPose(h).frame).toBe(8);
  h.dashTimer=0;h.blocking=true;h.guardAge=.2;expect(selectHeroPose(h).state).toBe('guard');
  expect(weaponMuzzle(h,'ember',1).x-weaponMuzzle(h,'ember',-1).x).toBe(72);
  expect(weaponMuzzle(h,'ember').y).toBe(h.y+h.h-41);
});

test('light and heavy strikes have separate guard, dodge and weapon cancel windows',()=>{
  const g=trial(),h=g.state.hero;g.attack();h.action.age=.125;
  expect(g.canCancelAction('guard')).toBe(true);expect(g.canCancelAction('dodge')).toBe(false);expect(g.canCancelAction('weapon')).toBe(false);
  g.equipWeapon('disc');expect(h.weapon).toBe('blade');expect(h.queuedWeapon).toBe('disc');
  g.cancelAction();h.queuedWeapon=null;h.attackStep=2;h.comboWindow=1;g.attack();h.action.age=.2;
  expect(g.canCancelAction('guard')).toBe(false);expect(g.canCancelAction('dodge')).toBe(false);
  h.action.age=.31;expect(g.canCancelAction('guard')).toBe(true);expect(g.canCancelAction('dodge')).toBe(false);
});

test('jump during committed light startup is buffered until its jump cancel window',()=>{
  const g=trial();g.state.enemies=[];g.state.pickups=[];g.state.roomCleared=true;
  Object.assign(g.state.hero,{x:300,y:412,grounded:true});g.attack();
  tick(g,{jumpPressed:true,jumpHeld:true});expect(g.state.hero.action).not.toBe(null);expect(g.state.hero.y).toBeCloseTo(412);
  tick(g,{jumpHeld:true},21);expect(g.state.hero.action).toBe(null);expect(g.state.hero.vy).toBeLessThan(-300);
});

test('rally restores only lost health from successful damage with a per-action cap',()=>{
  const g=trial(),h=g.state.hero,target=dummy(99);g.state.enemies=[target];
  g.receiveAttack({damage:1,sourceX:h.x+100,canBlock:true});expect(h.hp).toBe(4);expect(h.rallyPool).toBeCloseTo(.6);
  h.invincible=0;const blocked=dummy(98);blocked.role='shield';g.prepareMonster(blocked);g.state.enemies.push(blocked);
  g.applyPlayerAttack(blocked,{id:'a',damage:1,poise:1,sourceX:0,dir:1,type:'blade'});expect(h.hp).toBe(4);
  g.applyPlayerAttack(target,{id:'b',damage:2,poise:1,sourceX:0,dir:1,type:'blade'});expect(h.hp).toBeCloseTo(4.24);
  g.applyPlayerAttack(target,{id:'b',damage:2,poise:1,sourceX:0,dir:1,type:'blade'});expect(h.hp).toBeCloseTo(4.24);
  expect(g.state.lastHit.recovered).toBe(0);expect(g.state.lastHit.tags).toContain('blade');
  g.state.hitstop=0;for(let i=0;i<80;i++)g.updateEffects(.05);expect(h.rallyPool).toBe(0);
});

test('environmental damage cannot create rally health and fatal hits cannot resurrect',()=>{
  const g=trial(),h=g.state.hero;g.receiveAttack({damage:1,sourceX:0,forced:true,environmental:true});expect(h.rallyPool).toBe(0);
  h.hp=1;h.invincible=0;g.receiveAttack({damage:2,sourceX:0});expect(h.hp).toBeLessThanOrEqual(0);expect(h.rallyPool).toBe(0);
});

test('kill momentum caps at three stacks, expires and is lost on taking damage',()=>{
  const g=trial(),h=g.state.hero;
  for(let id=0;id<4;id++){const e=dummy(id);g.hitEnemy(e,200);g.hitEnemy(e,200);}
  expect(h.flowStacks).toBe(3);expect(h.flowTimer).toBe(8);
  h.invincible=0;g.receiveAttack({damage:1,sourceX:500});expect(h.flowStacks).toBe(0);
  const e=dummy(90);g.hitEnemy(e,200);g.state.hitstop=0;
  for(let i=0;i<170;i++)g.updateEffects(.05);expect(h.flowStacks).toBe(0);
});

test('weapon mutations change the intended action and chained explosions share a rally cap',()=>{
  const g=trial('ember'),h=g.state.hero,a=dummy(10,350),b=dummy(11,370);g.state.enemies=[a,b];
  h.upgrades.push('cinder');g.receiveAttack({damage:1,sourceX:400});
  g.applyPlayerAttack(a,{id:'burst',type:'ember',charged:true,damage:2,poise:0,sourceX:100,dir:1});
  expect(h.hp).toBeLessThanOrEqual(4.24);expect(b.hp).toBeLessThan(100);expect(a.markLife).toBe(5.5);
  const normal=trial('disc'),boosted=trial('disc');boosted.state.hero.upgrades.push('rebound');
  const n=dummy(12),m=dummy(13);normal.state.enemies=[n];boosted.state.enemies=[m];
  const attack={type:'disc',damage:2,returning:true,poise:1,sourceX:0,dir:1};
  normal.applyPlayerAttack(n,attack);boosted.applyPlayerAttack(m,attack);
  expect(100-m.hp).toBeCloseTo((100-n.hp)*1.25);
});

test('upgrades are deterministic, match the weapon and stop offering capped mutations',()=>{
  const g=trial('ember'),h=g.state.hero;const choices=upgradeChoices(qe,h,42);
  expect(choices).toEqual(upgradeChoices(qe,h,42));expect(choices.some(c=>c.id==='cinder')).toBe(true);expect(choices.some(c=>c.id==='pursuit'||c.id==='rebound')).toBe(false);
  h.upgrades.push('cinder');expect(upgradeChoices(qe,h,42).some(c=>c.id==='cinder')).toBe(false);
  h.extraProjectiles=3;for(let seed=0;seed<20;seed++)expect(upgradeChoices(qe,h,seed,'iron').some(c=>['vigor','multishot'].includes(c.id))).toBe(false);
  h.hp=2;g.gainXp(h.xpNeeded);expect(h.hp).toBe(3);expect(g.state.upgradeChoices).toHaveLength(3);
  g.chooseUpgrade(g.state.upgradeChoices.find(c=>c.id!=='vigor').id);expect(g.state.phase).toBe('playing');
});

test('forge charges once, requires safety and produces a real upgrade choice',()=>{
  const g=trial(),h=g.state.hero;g.state.enemies=[];g.state.roomCleared=true;
  Object.assign(h,{x:1870,y:412,grounded:true});g.state.coins=9;
  tick(g,{interactPressed:true});expect(g.state.trial.forge.used).toBe(false);
  g.state.coins=10;tick(g,{interactPressed:true});expect(g.state.trial.forge.used).toBe(true);expect(g.state.coins).toBe(0);expect(g.state.phase).toBe('upgrade');
  g.chooseUpgrade(g.state.upgradeChoices[0].id);g.state.coins=10;tick(g,{interactPressed:true});expect(g.state.coins).toBe(10);
});

test('new relic branch is reachable through real jumps and rewards exactly once',()=>{
  const g=trial();g.state.enemies=[];g.state.pickups=[];g.state.roomCleared=true;
  Object.assign(g.state.hero,{x:2410,y:412,grounded:true});
  for(const [x,floor] of [[2500,370],[2675,302]]){
    let landed=false;
    for(let n=0;n<600;n++){
      const h=g.state.hero;if(n>15&&h.grounded&&Math.abs(h.y+h.h-floor)<2&&Math.abs(h.x-x)<16){landed=true;break;}
      tick(g,{left:h.x>x+3,right:h.x<x-3,jumpPressed:n===0||n===28,jumpHeld:n<65});
    }
    expect(landed).toBe(true);
  }
  for(let n=0;n<300&&g.state.hero.x<2765;n++)tick(g,{right:true});
  tick(g,{interactPressed:true});expect(g.state.trial.relicCache.opened).toBe(true);expect(g.state.phase).toBe('upgrade');
  expect(g.state.trial.currentNode).toBe('relic');const level=g.state.hero.level;
  g.chooseUpgrade(g.state.upgradeChoices[0].id);tick(g,{interactPressed:true});expect(g.state.hero.level).toBe(level);
});

test('sight blockers and nearby ranged commitments prevent unfair simultaneous shots',()=>{
  const hero={x:400,y:100,w:28,h:36},a={...dummy(1,0),role:'trunk',y:100},b={...dummy(2,100),role:'trunk',y:100,ai:{phase:'windup'}};
  const room={platforms:[{x:200,y:50,w:30,h:200}]};expect(hasClearSight(room,a,hero)).toBe(false);
  room.platforms=[];expect(hasClearSight(room,a,hero)).toBe(true);expect(canScheduleAttack(a,{hero,room,enemies:[a,b]})).toBe(false);
  b.ai.phase='recovery';expect(canScheduleAttack(a,{hero,room,enemies:[a,b]})).toBe(true);
});

test('new hero and HUD load in the live game and the forge offers selectable mutations',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  const loaded=await page.evaluate(async()=>(await import('/assets/hero-art.js')).heroArtReady);expect(loaded.every(Boolean)).toBe(true);expect(loaded).toHaveLength(7);
  await page.getByRole('button',{name:/开启试炼/}).click();await page.getByRole('button',{name:/我明白了，开始试炼/}).click();
  await expect(page.locator('#health-value')).toHaveText('100 / 100');
  const shell=await page.locator('.game-shell').boundingBox(),tools=await page.locator('.hud > .run-hud').boundingBox();
  expect(tools.x).toBeGreaterThan(shell.x+shell.width*.6);expect(tools.y).toBeLessThan(shell.y+100);
  await page.evaluate(async()=>{const g=(await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine;Object.assign(g.state.hero,{x:1870,y:412});g.state.coins=10;g.state.cameraX=1530;});
  await page.keyboard.press('KeyE');await expect(page.locator('.upgrade-choices')).toBeVisible();
  await page.locator('.game-shell').screenshot({path:'preview-hero-upgrade.png'});
  await page.locator('.upgrade-card').first().click();await expect(page.locator('.game-shell')).toHaveAttribute('data-phase','playing');expect(errors).toEqual([]);
});
