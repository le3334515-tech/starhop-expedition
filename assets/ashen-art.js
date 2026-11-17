// Original generated artwork; prompt records and masters live in output/imagegen/ashen-cloister/.
import { drawShieldEnemy, installCombatVfxArt } from './combat-vfx-art.js';
const names=['root','rock','bat','warden','crate','crate-broken','shrine-off','shrine-on','vial','seed','chest','chest-open','stone','foundation','timber','iron','background'];
const textures=new Map();
export const ashenSpritesReady=Promise.all(names.map(name=>new Promise(resolve=>{
  const img=new Image();img.onload=()=>{textures.set(name,img);resolve(true);};img.onerror=()=>resolve(false);
  img.src=new URL(`./art/ashen-cloister/${name}.png`,import.meta.url).href;
})));
function prop(ctx,name,x,bottom,scale=1,alpha=1){
  const img=textures.get(name);if(!img)return false;
  ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,Math.round(x-img.width*scale/2),Math.round(bottom-img.height*scale),Math.round(img.width*scale),Math.round(img.height*scale));ctx.restore();return true;
}
function pose(ctx,name,frame,x,y,facing,scale=1){
  const img=textures.get(name);if(!img)return false;
  const width=176,height=name==='bat'?128:112,anchorY=name==='bat'?64:108;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing>0?-1:1,1);
  ctx.drawImage(img,frame*width,0,width,height,Math.round(-88*scale),Math.round(-anchorY*scale),Math.round(width*scale),Math.round(height*scale));ctx.restore();return true;
}
export function drawAshenEnemy(ctx,e,time){
  if(e.role==='shield'&&drawShieldEnemy(ctx,e,time))return true;
  const name=e.skin==='trunk'?'root':e.skin||(['shield','elite'].includes(e.role)?'warden':null);
  if(!name||!textures.has(name))return false;
  const ai=e.ai,phase=ai?.phase,x=e.x+e.w/2,y=name==='bat'?e.y+e.h/2:e.y+e.h;
  let frame=Math.abs(e.vx)>8?[2,0,3,1][Math.floor(time*9)%4]:Math.floor(time*3)%2;
  if(phase==='windup')frame=4;else if(phase==='active')frame=5;else if(phase==='recovery')frame=6;
  if(e.hurt>0||phase==='stagger')frame=7;
  if(name==='bat'&&!['windup','active','recovery','stagger'].includes(phase)&&!(e.hurt>0))frame=[0,1,2,3,2,1][Math.floor(time*12)%6];
  const recoil=phase==='windup'?Math.sin(ai.age*45)*.7:0;
  ctx.save();ctx.fillStyle='#04070b66';ctx.beginPath();ctx.ellipse(x,name==='bat'?447:y,e.elite?24:18,3,0,0,Math.PI*2);ctx.fill();
  pose(ctx,name,frame,x+recoil,y,e.facing,e.elite?1.15:1);
  if(e.elite){ctx.fillStyle='#f2c27a';ctx.globalAlpha=.65+.25*Math.sin(time*4);ctx.fillRect(Math.round(x-1),Math.round(y-89),2,5);ctx.fillRect(Math.round(x-3),Math.round(y-87),6,1);}
  ctx.restore();return true;
}
export function installAshenArt(Renderer,engine){
  const p=Renderer.prototype,base=Object.fromEntries(['background','platform','decoration','worldDecor','pickup','projectile','ambient','lava','portal','menuScene'].map(k=>[k,p[k]]));
  const active=()=>!!engine.state.trial||engine.state.phase==='menu';
  p.background=function(camera,theme,time,boss){
    const image=textures.get('background');if(!active()||!image)return base.background.call(this,camera,theme,time,boss);
    const ctx=this.ctx;ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#080e1b';ctx.fillRect(0,0,960,540);
    // Slow pan across one plate, avoiding visible repeating seams.
    const progress=Math.max(0,Math.min(1,camera/2120));ctx.drawImage(image,Math.round(-progress*192),-100,1152,768);
    ctx.fillStyle='#07101d48';ctx.fillRect(0,0,960,540);
    const shade=ctx.createLinearGradient(0,320,0,540);shade.addColorStop(0,'#070b1500');shade.addColorStop(1,'#070b15b0');ctx.fillStyle=shade;ctx.fillRect(0,320,960,220);ctx.restore();
  };
  p.menuScene=function(state,time){
    if(!textures.has('background'))return base.menuScene.call(this,state,time);
    this.background(0,0,time,false);
    this.platform({x:0,y:482,w:960,h:58,kind:'ground'},0);
    this.platform({x:480,y:420,w:150,h:22,kind:'stone'},0);
    this.platform({x:760,y:354,w:180,h:22,kind:'stone'},0);
    prop(this.ctx,'shrine-on',562,482,1.1);this.glow(562,433,90,'#d7a468',.13);
    this.hero({...state.hero,x:650,y:446,w:28,h:36,hp:5,grounded:true,vx:0,vy:0,visualAge:time,landingAge:1,action:null,blocking:false,dashTimer:0,invincible:0},time,1.6,false);
    this.ambient(0,time,0);
  };
  p.platform=function(tile,theme){
    if(!active()||!textures.has('stone'))return base.platform.call(this,tile,theme);
    const ctx=this.ctx,isGround=tile.kind==='ground',image=textures.get(tile.kind==='wood'?'timber':isGround?'foundation':'stone');
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();ctx.rect(tile.x,tile.y,tile.w,tile.h);ctx.clip();
    const start=tile.x+Math.max(0,Math.floor((this.viewportX-tile.x-128)/128)*128);
    for(let x=start;x<Math.min(tile.x+tile.w,this.viewportX+1088);x+=128)for(let y=tile.y;y<tile.y+tile.h;y+=128)ctx.drawImage(image,Math.round(x),y,128,128);
    ctx.fillStyle='#0a101f66';ctx.fillRect(tile.x,tile.y+5,tile.w,tile.h-5);ctx.fillStyle=tile.kind==='wood'?'#9a7e55':'#8d9b9f';ctx.fillRect(tile.x,tile.y,tile.w,2);
    ctx.fillStyle='#c0af7d';for(let x=Math.ceil(tile.x/48)*48;x<tile.x+tile.w;x+=48)ctx.fillRect(x,tile.y,10,1);
    ctx.fillStyle='#0a0d18';ctx.fillRect(tile.x,tile.y+tile.h-3,tile.w,3);ctx.restore();
    if(!isGround){ctx.fillStyle='#060b1655';ctx.fillRect(tile.x+3,tile.y+tile.h,tile.w-6,4);}
  };
  p.lava=function(x,y,w,h,time){
    if(!active())return base.lava.call(this,x,y,w,h,time);
    const ctx=this.ctx;ctx.save();ctx.fillStyle='#170e19';ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#512226';ctx.fillRect(x,y+6,w,h-6);
    for(let j=0;j<Math.ceil(w/9);j++){const rise=(Math.sin(time*3+j*2)+1)*3;ctx.fillStyle=j%3?'#9c4030':'#e5a25c';ctx.fillRect(Math.round(x+j*9),Math.round(y+8+rise),4,2);ctx.fillStyle='#261822';ctx.fillRect(Math.round(x+j*9+2),y,6,7);}
    ctx.restore();
  };
  p.portal=function(gate,open,time,boss){
    const stone=textures.get('foundation');if(!active()||!stone)return base.portal.call(this,gate,open,time,boss);
    const ctx=this.ctx,x=gate.x,y=gate.y,w=gate.w,h=gate.h;ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#040814';ctx.fillRect(x,y,w,h);
    ctx.drawImage(stone,0,0,32,128,x-8,y,14,h);ctx.drawImage(stone,96,0,32,128,x+w-6,y,14,h);ctx.drawImage(stone,0,0,128,32,x-8,y-12,w+16,16);
    ctx.fillStyle='#9b825b';ctx.fillRect(x-8,y-12,w+16,2);
    if(open){this.glow(x+w/2,y+h*.6,80,'#d7ac6d',.2);ctx.fillStyle='#bda46e';ctx.globalAlpha=.25;ctx.fillRect(x+8,y+5,w-16,h-5);ctx.globalAlpha=1;
      for(let j=0;j<9;j++){ctx.fillStyle=j%2?'#d8bc81':'#7cabb3';ctx.fillRect(Math.round(x+10+(j*17)%(w-20)),Math.round(y+h-(time*18+j*19)%h),2,3);}
    }else{ctx.fillStyle='#293241';for(let j=0;j<5;j++)ctx.fillRect(x+8+j*11,y+4,3,h-4);ctx.fillStyle='#846e4c';ctx.fillRect(x+7,y+h*.5,w-14,3);}
    ctx.restore();
  };
  p.decoration=function(item){
    if(!active())return base.decoration.call(this,item);const ctx=this.ctx;
    if(item.kind==='trial-chest'){
      const open=item.rewardId==='relic'?engine.state.trial?.relicCache.opened:engine.state.trial?.chest.opened;
      if(prop(ctx,open?'chest-open':'chest',item.x+17,item.y,1)){if(!open)this.glow(item.x+17,item.y-17,35,'#e6b36c',.10);return;}
    }
    if(item.kind==='trial-sign'){
      ctx.save();ctx.font='10px "Microsoft YaHei",sans-serif';ctx.fillStyle='#0b101cd9';ctx.fillRect(item.x-7,item.y-88,177,31);
      ctx.fillStyle='#a38458';ctx.fillRect(item.x-7,item.y-88,2,31);ctx.fillStyle='#cfbd91';ctx.fillText(item.title,item.x,item.y-75);
      ctx.font='8px "Microsoft YaHei",sans-serif';ctx.fillStyle='#8b9ba9';ctx.fillText(item.text,item.x,item.y-62);ctx.restore();return;
    }
    if(['tree','lamp','crystal','ash-brazier'].includes(item.kind)){
      const x=item.x,y=item.y,t=this.time;ctx.save();ctx.fillStyle='#151b28';ctx.fillRect(x-3,y-44,6,44);ctx.fillRect(x-10,y-46,20,4);ctx.fillStyle='#72614b';ctx.fillRect(x-11,y-49,22,2);
      this.glow(x,y-54,70,'#e6a657',.15);
      for(let j=0;j<5;j++){ctx.fillStyle=j%2?'#f3c47b':'#bf5736';const h=5+Math.floor((Math.sin(t*11+j*3)+1)*4);ctx.fillRect(x-7+j*3,y-49-h,3,h);}ctx.restore();return;
    }
    base.decoration.call(this,item);
  };
  p.worldDecor=function(items,camera,layer){
    base.worldDecor.call(this,items,camera,layer);const trial=engine.state.trial;if(!trial||layer!=='front')return;const ctx=this.ctx;
    for(const box of trial.crates){
      if(box.x<camera-70||box.x>camera+1030||box.broken&&box.breakAge>=.2)continue;
      const shake=!box.broken&&box.hitAge<.15?Math.sin(box.hitAge*100)*2:0;
      prop(ctx,box.broken?'crate-broken':'crate',box.x+19+shake,box.y+box.h+(box.broken?box.breakAge*22:0),1,box.broken?1-box.breakAge/.2:1);
      if(!box.broken&&Math.abs(engine.state.hero.x-box.x)<95){ctx.save();ctx.font='8px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle='#cbb88c';ctx.fillText('攻击击碎',box.x+19,box.y-8);ctx.restore();}
    }
    for(const shrine of trial.checkpoints){
      if(shrine.x<camera-80||shrine.x>camera+1040)continue;prop(ctx,'shrine-off',shrine.x,shrine.y);
      if(shrine.active){
        prop(ctx,'shrine-on',shrine.x,shrine.y,1,Math.min(1,shrine.age*2));this.glow(shrine.x,shrine.y-43,65,'#edae61',.10+Math.sin(this.time*4)*.025);
        ctx.save();ctx.fillStyle='#e5bc7a';for(let j=0;j<5;j++){const rise=(shrine.age*19+j*13)%58;ctx.globalAlpha=(1-rise/58)*.65;ctx.fillRect(Math.round(shrine.x+Math.sin(j*4+this.time)*10),Math.round(shrine.y-24-rise),1,2);}ctx.restore();
      }
      ctx.save();ctx.font='8px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle=shrine.active?'#d4bb86':'#8d9cab';ctx.fillText(shrine.active?'烛火已燃 · 归返之地':'靠近点燃烛火',shrine.x,shrine.y-80);ctx.restore();
      if(shrine.x===trial.forge.x){ctx.save();ctx.font='8px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle=trial.forge.used?'#88989f':'#d5b879';ctx.fillText(trial.forge.used?'本局铭刻已完成':'锻火台 · 10 星币',shrine.x,shrine.y-92);ctx.restore();}
    }
    for(const fx of trial.effects){
      const q=fx.age/.3;ctx.save();ctx.fillStyle=fx.tint==='heart'?'#dc8c79':fx.tint==='coin'?'#e8c181':'#83c6ce';ctx.globalAlpha=1-q;
      for(let j=0;j<6;j++){const a=j*Math.PI/3;ctx.fillRect(Math.round(fx.x+Math.cos(a)*(4+q*16)),Math.round(fx.y+Math.sin(a)*(4+q*16)-q*14),2,2);}ctx.restore();
    }
  };
  p.pickup=function(item,time){
    if(active()&&item.kind==='heart'&&prop(this.ctx,'vial',item.x+item.w/2,item.y+item.h+4+Math.sin(time*3+item.bob)*2))return;
    base.pickup.call(this,item,time);
  };
  p.projectile=function(shot,time){
    if(shot.skin==='seed'&&prop(this.ctx,'seed',shot.x+shot.w/2,shot.y+shot.h+2,.65))return;base.projectile.call(this,shot,time);
  };
  p.ambient=function(camera,time,theme){
    if(!active())return base.ambient.call(this,camera,time,theme);const ctx=this.ctx;ctx.save();
    for(let j=0;j<22;j++){ctx.globalAlpha=.12+(j%3)*.06;ctx.fillStyle=j%4?'#9cb5bf':'#edb571';const x=((j*149-camera*.13+Math.sin(time*.3+j)*14)%1000+1000)%1000,y=(j*71-time*(3+j%5))%500;ctx.fillRect(Math.round(x),Math.round((y+500)%500),1,1);}
    const v=ctx.createLinearGradient(0,0,960,0);v.addColorStop(0,'#03071277');v.addColorStop(.2,'#03071200');v.addColorStop(.8,'#03071200');v.addColorStop(1,'#03071277');ctx.globalAlpha=1;ctx.fillStyle=v;ctx.fillRect(0,0,960,540);ctx.restore();
  };
  installCombatVfxArt(Renderer,engine);
}
