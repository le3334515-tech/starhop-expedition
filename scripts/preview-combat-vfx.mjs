import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Arranged visual demonstration, separate from the normal-input completion tests.
const heroMode=process.argv.includes('--hero');
const folder=heroMode?'output/hero-preview':'output/shield-vfx-preview';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1100,height:800}});
const errors=[];page.on('pageerror',error=>errors.push(error.stack));
await page.clock.install({time:new Date('2026-11-17T00:00:00Z')});
await page.goto('http://127.0.0.1:4173/?v=10');
await page.evaluate(async()=>Promise.all([(await import('/assets/combat-vfx-art.js')).combatVfxReady,(await import('/assets/ashen-art.js')).ashenSpritesReady,(await import('/assets/hero-art.js')).heroArtReady]));
await page.clock.pauseAt(new Date('2026-11-17T00:00:10Z'));
let frame=0;
const scenes=[
  ...(heroMode?[
    {name:'余烬行者 · 奔跑',weapon:'blade',role:'shield',length:30,type:'run'},
    {name:'起跳 · 二段跳 · 落地',weapon:'blade',role:'shield',length:36,type:'jump'},
  ]:[]),
  {name:'重盾守卫 · 举盾与挡刀',weapon:'blade',role:'shield',length:36,type:'blade'},
  {name:'精准格挡 · 抓住出招瞬间',weapon:'blade',role:'shield',length:39,type:'parry'},
  {name:'法杖蓄力 · 灼印引爆',weapon:'ember',role:'trunk',length:45,type:'ember'},
  {name:'飞轮 · 旋转与回收',weapon:'disc',role:'shield',length:36,type:'disc'},
  {name:'闪身 · 接强化追击',weapon:'blade',role:'shield',length:30,type:'dash'},
];
for(const scene of scenes){
  await page.evaluate(async scene=>{
    const g=(await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine;
    g.start({seed:42,weapon:scene.weapon,modifier:'standard'});
    const target=g.state.enemies.find(e=>e.role===scene.role&&!e.optional);
    target.x=1430;target.originX=1430;target.y=448-target.h;target.originY=target.y;
    g.state.enemies=[target];g.state.pickups=[];g.state.trial.crates=[];
    Object.assign(g.state.hero,{x:scene.type==='ember'?1260:1360,y:412,facing:1});
    if(scene.type==='run'||scene.type==='jump'){g.state.hero.x=scene.type==='run'?500:760;target.x=target.originX=2700;}
    g.state.cameraX=g.state.hero.x-340;g.state.transition=0;g.state.announcement=scene.name;g.state.announcementTimer=2;
  },scene);
  await page.clock.runFor(34);
  if(scene.type==='blade')await page.locator('.game-shell').screenshot({path:'preview-shield-idle.png'});
  for(let j=0;j<scene.length;j++){
    const input=await page.evaluate(async({type,j})=>{
      const g=(await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine,target=g.state.enemies[0];
      return {attack: type==='blade'&&j>=7&&j<26 || type==='ember'&&j<22 || type==='disc'&&j===0 || type==='dash'&&j>=5&&j<11,
        guard:type==='parry'&&(target.ai?.phase==='active'||target.ai?.phase==='windup'&&target.ai.age>target.ai.duration-.12),dash:type==='dash'&&j===0,
        right:type==='run'||type==='jump'&&j<28,jump:type==='jump'&&(j===0||j===9),jumpHeld:type==='jump'&&j<23};
    },{type:scene.type,j});
    if(input.attack)await page.keyboard.down('KeyJ');else await page.keyboard.up('KeyJ');
    if(input.guard)await page.keyboard.down('KeyF');else await page.keyboard.up('KeyF');
    if(input.dash)await page.keyboard.down('Shift');else await page.keyboard.up('Shift');
    if(input.right)await page.keyboard.down('KeyD');else await page.keyboard.up('KeyD');
    if(input.jump){await page.keyboard.up('Space');await page.keyboard.down('Space');}
    else if(!input.jumpHeld)await page.keyboard.up('Space');
    await page.clock.runFor(1000/30);
    await page.locator('#game').screenshot({path:`${folder}/frame-${String(frame++).padStart(4,'0')}.png`});
    if(scene.type==='parry'&&j===25)await page.locator('.game-shell').screenshot({path:'preview-parry-vfx.png'});
    if(scene.type==='ember'&&j===30)await page.locator('.game-shell').screenshot({path:'preview-ember-vfx.png'});
    if(heroMode&&scene.type==='run'&&j===15)await page.locator('.game-shell').screenshot({path:'preview-hero-run.png'});
    if(heroMode&&scene.type==='jump'&&j===14)await page.locator('.game-shell').screenshot({path:'preview-hero-jump.png'});
    if(heroMode&&scene.type==='dash'&&j===3)await page.locator('.game-shell').screenshot({path:'preview-hero-roll.png'});
  }
  await page.keyboard.up('KeyJ');await page.keyboard.up('KeyF');await page.keyboard.up('Shift');
  await page.keyboard.up('KeyD');await page.keyboard.up('Space');
  console.log(await page.evaluate(async name=>({scene:name,phase:(await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine.state.phase,time:(await import(document.querySelector('script[type="module"][src*="game.js"]').src)).gameEngine.state.time,ui:document.querySelector('.game-shell').dataset.phase}),scene.type));
}
console.log(JSON.stringify({frames:frame,folder,errors}));await browser.close();if(errors.length)process.exitCode=1;
