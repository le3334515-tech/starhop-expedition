import { vfxFrame } from './combat-vfx.js';

const names=['shield','slash','impact','parry','ember','disc','dash'];
const textures=new Map(),warmTextures=new Map();
export const combatVfxReady=Promise.all(names.map(name=>new Promise(resolve=>{
  const img=new Image();img.onload=()=>{
    textures.set(name,img);
    if(name==='slash'||name==='dash'){
      const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,img.width,img.height);
      for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data,l=Math.max(d[i],d[i+1],d[i+2]);d[i]=l;d[i+1]=l*.65;d[i+2]=l*.32;}
      ctx.putImageData(pixels,0,0);warmTextures.set(name,canvas);
    }
    resolve(true);
  };img.onerror=()=>resolve(false);img.src=new URL(`./art/ashen-vfx/${name}.png`,import.meta.url).href;
})));
export const combatFxAvailable=name=>textures.has(name);

function drawFrame(ctx,name,frame,x,y,width,height=width,{facing=1,flipY=false,angle=0,enemy=false,alpha=1,additive=true}={}){
  const image=(enemy?warmTextures.get(name):null)||textures.get(name);if(!image)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing<0?-1:1,flipY?-1:1);ctx.rotate(angle);
  ctx.globalAlpha*=alpha;if(additive)ctx.globalCompositeOperation='lighter';
  ctx.drawImage(image,frame*128,0,128,128,Math.round(-width/2),Math.round(-height/2),Math.round(width),Math.round(height));ctx.restore();return true;
}

export function drawShieldEnemy(ctx,e,time){
  const image=textures.get('shield');if(!image)return false;
  const phase=e.ai?.phase;let frame=Math.floor(time*6)%4;
  if(Math.abs(e.vx)>8)frame=4+Math.floor(time*10)%4;
  else if(phase==='approach')frame=[8,9,9,11][Math.floor(time*8)%4];
  if(phase==='windup')frame=12;else if(phase==='active')frame=13;else if(phase==='recovery')frame=14;
  if(e.guardFlash>0)frame=10;
  if(e.hurt>0||phase==='stagger')frame=15;
  const x=e.x+e.w/2,y=e.y+e.h;ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#04070b66';ctx.beginPath();ctx.ellipse(x,y,19,3,0,0,Math.PI*2);ctx.fill();
  ctx.translate(Math.round(x),Math.round(y));ctx.scale(e.facing>0?-1:1,1);
  ctx.drawImage(image,frame*128,0,128,112,-64,-108,128,112);ctx.restore();return true;
}

export function installCombatVfxArt(Renderer,engine){
  const p=Renderer.prototype,world=p.worldDecor,projectile=p.projectile,impact=p.impact;
  p.worldDecor=function(items,camera,layer){
    world.call(this,items,camera,layer);if(layer!=='front')return;
    const ctx=this.ctx;
    for(const fx of engine.state.combatVfx||[]){
      if(fx.x<camera-160||fx.x>camera+1120)continue;
      drawFrame(ctx,fx.kind,vfxFrame(fx),fx.x,fx.y,fx.size,fx.kind==='dash'?fx.size*.6:fx.size,{facing:fx.facing,flipY:fx.flipY,enemy:fx.enemy,alpha:fx.enemy ? .78 : .95,additive:!['slash','dash'].includes(fx.kind)});
      // A contact glint remains immediate even while the first animation frames
      // and game simulation are held by hitstop. It is purely visual.
      if(fx.age<.035&&['impact','parry'].includes(fx.kind)){
        ctx.save();ctx.globalAlpha=.8;ctx.fillStyle='#fff0ca';ctx.fillRect(Math.round(fx.x-4),Math.round(fx.y-1),8,2);ctx.fillRect(Math.round(fx.x-1),Math.round(fx.y-4),2,8);ctx.restore();
      }
    }
  };
  p.impact=function(effect){if(effect.generatedVfx&&combatFxAvailable(effect.generatedVfx))return;impact.call(this,effect);};
  p.projectile=function(shot,time){
    const x=shot.x+shot.w/2,y=shot.y+shot.h/2,age=shot.age||0;
    if(shot.owner==='hero'&&shot.kind==='disc'&&combatFxAvailable('disc')){
      const frame=Math.floor(age*48)%24;
      for(let j=3;j>0;j--)drawFrame(this.ctx,'disc',(frame-j+24)%24,x-Math.sign(shot.vx)*j*8,y-shot.vy*.008*j,shot.returning?38:34,shot.returning?38:34,{alpha:.12/j,additive:true});
      drawFrame(this.ctx,'disc',frame,x,y,shot.returning?42:36,shot.returning?42:36,{additive:false});return;
    }
    if(shot.owner==='hero'&&shot.kind==='ember'&&combatFxAvailable('ember')){
      const angle=Math.atan2(shot.vy,shot.vx),size=shot.charged?62:42;
      drawFrame(this.ctx,'dash',6+Math.floor(age*24)%8,x-Math.sign(shot.vx)*17,y,size*1.5,size*.5,{enemy:true,angle:shot.vx<0?0:angle,facing:Math.sign(shot.vx),alpha:.8});
      drawFrame(this.ctx,'ember',3+Math.floor(age*40)%8,x,y,size,size);return;
    }
    projectile.call(this,shot,time);
  };
}
