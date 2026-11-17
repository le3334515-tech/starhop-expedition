import { BOSS_MOVES } from './campaign-boss.js';
import { BIOMES } from './campaign-data.js';
const images=new Map(),pending=new Map();
function load(key,path){if(images.has(key))return Promise.resolve(true);return new Promise(resolve=>{const img=new Image();img.onload=()=>{images.set(key,img);resolve(true);};img.onerror=()=>resolve(false);img.src=new URL(path,import.meta.url).href;});}
export function loadCampaignTheme(index){
  if(pending.has(index))return pending.get(index);
  const promise=Promise.all([
    ...['background','stone','foundation','timber','iron'].map(name=>load(`${index}/${name}`,index===0?`./art/ashen-cloister/${name}.png`:`./art/campaign/theme-${index}/${name}.png`)),
    load(`mob-${index}`,`./art/campaign/mob-${index}.png`),
    ...[index*2,index*2+1].map(n=>load(`boss-${n}`,`./art/campaign/boss-${n}.png`))
  ]).then(result=>{if(result.some(x=>!x)){pending.delete(index);throw Error('campaign art unavailable');}return true;});
  pending.set(index,promise);return promise;
}
function frame(ctx,key,n,x,foot,facing,scale=1){const img=images.get(key);if(!img)return false;const fw=img.width/16,fh=img.height;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(foot));ctx.scale(facing>0?-1:1,1);ctx.drawImage(img,Math.min(15,Math.max(0,n))*fw,0,fw,fh,-fw*scale/2,-(fh-8)*scale,fw*scale,fh*scale);ctx.restore();return true;}
export function installCampaignArt(Renderer,engine){
  const p=Renderer.prototype,base=Object.fromEntries(['background','platform','enemy','boss','portal','worldDecor'].map(k=>[k,p[k]]));
  p.background=function(camera,theme,time,boss){const s=engine.state,i=s.campaign?.biome,img=images.get(`${i}/background`);if(!s.campaign||s.phase==='menu'||!img)return base.background.call(this,camera,theme,time,boss);const ctx=this.ctx;ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#070a14';ctx.fillRect(0,0,960,540);const pan=Math.max(0,Math.min(1,camera/Math.max(1,s.room.width-960)));ctx.drawImage(img,Math.round(-pan*192),-100,1152,768);ctx.fillStyle='#05081335';ctx.fillRect(0,0,960,540);const shade=ctx.createLinearGradient(0,300,0,540);shade.addColorStop(0,'#05081000');shade.addColorStop(1,'#050810c0');ctx.fillStyle=shade;ctx.fillRect(0,300,960,240);ctx.restore();};
  p.platform=function(tile,theme){const i=engine.state.campaign?.biome,img=images.get(`${i}/${tile.kind==='wood'?'timber':tile.kind==='ground'?'foundation':'stone'}`);if(!engine.state.campaign||engine.state.phase==='menu'||!img)return base.platform.call(this,tile,theme);const ctx=this.ctx;ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();ctx.rect(tile.x,tile.y,tile.w,tile.h);ctx.clip();for(let x=Math.max(tile.x,tile.x+Math.floor((this.viewportX-tile.x-128)/128)*128);x<Math.min(tile.x+tile.w,this.viewportX+1088);x+=128)for(let y=tile.y;y<tile.y+tile.h;y+=128)ctx.drawImage(img,x,y,128,128);ctx.fillStyle='#05081265';ctx.fillRect(tile.x,tile.y+4,tile.w,tile.h-4);ctx.fillStyle=BIOMES[i].accent;ctx.globalAlpha=.65;ctx.fillRect(tile.x,tile.y,tile.w,2);ctx.restore();};
  p.enemy=function(e,time,...rest){if(!engine.state.campaign||e.campaignSkin===undefined)return base.enemy.call(this,e,time,...rest);if(e.dead)return;const phase=e.ai?.phase,age=e.ai?.age||0,duration=e.ai?.duration||1;let n=Math.floor(e.timer*8)%4;if(phase==='windup')n=4+Math.min(3,Math.floor(age/duration*4));if(phase==='active')n=8+Math.min(2,Math.floor(age/duration*3));if(phase==='recovery')n=11;if(e.hurt>0)n=12;if(phase==='stagger')n=13;if(!frame(this.ctx,`mob-${e.campaignSkin}`,n,e.x+e.w/2,e.y+e.h,e.facing))return base.enemy.call(this,e,time,...rest);
    const ctx=this.ctx;if(e.hp<e.maxHp||phase==='windup'){ctx.fillStyle='#090b15';ctx.fillRect(e.x-5,e.y-14,e.w+10,3);ctx.fillStyle=BIOMES[e.campaignSkin].accent;ctx.fillRect(e.x-5,e.y-14,(e.w+10)*Math.max(0,e.hp/e.maxHp),2);}if(phase==='windup'){ctx.fillStyle='#efc28d';ctx.fillRect(e.x+e.w/2,e.y-23,2,6);}
  };
  p.boss=function(b,h,time,width){if(!engine.state.campaign)return base.boss.call(this,b,h,time,width);let n=Math.floor(b.visualAge*5)%4;const move=BOSS_MOVES[b.intent];if(b.mode==='windup')n=4+Math.min(3,Math.floor(b.age/(move?.windup||1)*4));if(b.mode==='active')n=8+Math.min(3,Math.floor(b.age/(move?.active||1)*4));if(b.mode==='recover')n=11;if(b.mode==='stagger')n=13;if(b.hurt>0)n=12;if(b.dead)n=b.deathAge<.65?14:15;
    if(!frame(this.ctx,`boss-${b.chapter}`,n,b.x+40,b.y+b.h,b.facing,1.15))return base.boss.call(this,b,h,time,width);
    const ctx=this.ctx;if(b.active&&!b.dead){ctx.save();ctx.globalAlpha=.5;ctx.fillStyle=BIOMES[engine.state.campaign.biome].accent;for(let j=0;j<9;j++)ctx.fillRect(395+j%2*3,320+j*14,3,10);ctx.restore();}for(const z of b.zones||[]){ctx.save();const firing=z.age>=z.delay;ctx.globalAlpha=firing?.85:.35+.3*z.age/z.delay;ctx.fillStyle=firing?BIOMES[engine.state.campaign.biome].danger:BIOMES[engine.state.campaign.biome].accent;ctx.fillRect(z.x,445,z.w,3);if(firing){for(let x=z.x+4;x<z.x+z.w;x+=16){ctx.beginPath();ctx.moveTo(x,448);ctx.lineTo(x+5,416);ctx.lineTo(x+12,448);ctx.fill();}}else{ctx.strokeStyle=ctx.fillStyle;ctx.strokeRect(z.x,432,z.w,15);}ctx.restore();}
    if(b.mode==='windup'){ctx.save();ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f1d4a2';ctx.fillText(move.name,b.x+40,b.y-16);ctx.restore();}
  };
  p.portal=function(gate,open,time,boss){return base.portal.call(this,gate,engine.state.campaign?engine.state.roomCleared:open,time,boss);};
}
