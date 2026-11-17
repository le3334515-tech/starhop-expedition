import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('all generated campaign atlases are present and contain 240 distinct nonempty poses',async()=>{
 const atlas=JSON.parse(await readFile(new URL('../assets/art/campaign/atlas.json',import.meta.url),'utf8'));
 expect(Object.keys(atlas)).toHaveLength(23);
 let poses=0;for(const [name,data] of Object.entries(atlas)){if(!data.frames)continue;poses+=data.frames;expect(data.uniqueFrames).toBe(16);expect(Math.min(...data.occupiedPixels)).toBeGreaterThan(100);const png=await readFile(new URL(`../assets/art/campaign/${name}.png`,import.meta.url));expect(png.readUInt32BE(16)).toBe(data.frameWidth*16);expect(png.readUInt32BE(20)).toBe(data.frameHeight);}expect(poses).toBe(240);
});
test('real UI starts campaign, saves entrance and reloads continue button',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('[data-action="start"]')).toBeEnabled();
 await page.locator('[data-action="campaign-start"]').click();await page.getByRole('button',{name:'我明白了，开始远征'}).click();await expect(page.locator('.game-shell')).toHaveAttribute('data-phase','playing');await expect(page.locator('#room-count')).toHaveText('01 / 50');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('starhop-campaign-v11')));expect(saved.index).toBe(0);
 await page.keyboard.down('KeyD');await page.waitForTimeout(100);await page.keyboard.up('KeyD');await page.reload();await expect(page.locator('[data-action="campaign-continue"]')).toBeVisible();await expect(page.locator('[data-action="start"]')).toBeEnabled();await page.locator('[data-action="campaign-continue"]').click();await expect(page.locator('.game-shell')).toHaveAttribute('data-phase','playing');expect(errors).toEqual([]);
});
for(const viewport of [{width:1440,height:1000},{width:844,height:390}])test(`all five biomes and ten boss atlases load and render at ${viewport.width}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/art/campaign/')&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});await page.setViewportSize(viewport);await page.goto('/');await expect(page.locator('[data-action="start"]')).toBeEnabled();
 await page.locator('[data-action="campaign-chapters"]').click();await expect(page.locator('.campaign-chapter')).toHaveCount(10);await page.locator('[data-action="chapter-preview"][data-chapter="4"]').click();await expect(page.locator('.game-shell')).toHaveAttribute('data-phase','playing');await expect(page.locator('#room-count')).toHaveText('21 / 50');
 for(let c=0;c<10;c++){
  await page.evaluate(async chapter=>{const {gameEngine:g}=await import(document.querySelector('script[type="module"][src*="game.js"]').src);g.start({mode:'campaign',seed:42,weapon:'blade',modifier:'standard',chapterStart:chapter,preview:true});g.enterCampaignFloor(chapter*5+4);await import('/assets/campaign-art.js').then(m=>m.loadCampaignTheme(Math.floor(chapter/2)));},c);
  await expect(page.locator('.game-shell')).toHaveAttribute('data-phase','playing');
  await page.evaluate(async()=>{const {gameEngine:g}=await import(document.querySelector('script[type="module"][src*="game.js"]').src);g.state.hero.x=720;g.state.cameraX=410;g.state.boss.active=true;});
  await page.waitForTimeout(80);if(viewport.width===1440)await page.locator('.game-shell').screenshot({path:`output/campaign-boss-${c}.png`});
 }
 expect(errors).toEqual([]);
});
