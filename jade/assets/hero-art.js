import { selectHeroPose } from './hero-animation.js';
let jadeAtlas;
const jadeReady=new Promise(resolve=>{const img=new Image();img.onload=()=>{jadeAtlas=img;resolve(true);};img.onerror=()=>resolve(false);img.src=new URL('./art/jade-hero/hero-atlas.png',import.meta.url).href;});
const names=['run','guard','jump','blade','cast','dodge','hurt'],textures=new Map();
export const heroArtReady=Promise.all([jadeReady,...names.map(name=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{textures.set(name,image);resolve(true);};image.onerror=()=>resolve(false);image.src=new URL(`./art/ashen-hero/${name}.png`,import.meta.url).href;
}))]);
export function drawAshenHero(ctx,h,time,scale=1,awakened=false){
  const pose=h.dashTimer>0?{sheet:"run",frame:6}:selectHeroPose(h,time),image=textures.get(pose.sheet);if(!image)return false;
  const x=h.x+h.w/2,y=h.y+h.h;
  function drawPose(dx=0){
    if(!jadeAtlas){ctx.drawImage(image,pose.frame*128,0,128,112,-64+dx,-108,128,112);return;}
    const action=h.action,t=h.visualAge??time;
    let row=0,col=Math.floor(t*7)%8;
    if(h.hp<=0){row=7;col=7;}else if(h.hurtLock>0){row=7;col=5;}else if(h.dashTimer>0){row=6;col=Math.min(7,Math.floor((.18-h.dashTimer)/.18*8));}else if(action){row=action.weapon==='blade'?(action.spec.heavy?4:3):5;col=Math.min(7,Math.floor((h.attackAnimProgress||0)*8));}else if(h.blocking){row=7;col=Math.min(3,Math.floor(h.guardAge*16));}else if(!h.grounded){row=2;col=h.vy<0?Math.min(3,Math.floor((h.airAge||0)*12)):4+Math.min(3,Math.floor((h.airAge||0)*8));}else if(Math.abs(h.vx)>20){row=1;col=Math.floor((h.runCycle||0)*8)%8;}
    const fw=jadeAtlas.width/8,fh=jadeAtlas.height/8;
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(jadeAtlas,col*fw,row*fh,fw,fh,-59+dx,-112,118,118);
  }
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#03081266';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y+1),h.grounded?16*scale:11*scale,3*scale,0,0,Math.PI*2);ctx.fill();
  ctx.translate(Math.round(x),Math.round(y));ctx.scale((h.facing||1)*scale,scale);
  if(h.dashTimer>0){ctx.save();ctx.globalAlpha=.16;drawPose(-12);ctx.globalAlpha=.07;drawPose(-24);ctx.restore();}
  if(h.invincible>0&&h.dashTimer<=0)ctx.globalAlpha=Math.sin((h.visualAge??time)*42)>.2 ? .7 : 1;
  drawPose();
  if(awakened){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.2;drawPose();}
  ctx.restore();
  ctx.save();ctx.translate(x,y-32);ctx.globalCompositeOperation='lighter';
  const a=h.visualAge??time;
  for(const [id,color,radius] of [['storm','#9aeaff',31],['verdant','#a7edb5',37],['soulstep','#d6b2ff',43]])if(h.upgrades?.includes(id)){ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=.65;ctx.lineWidth=1.5;for(let j=0;j<3;j++){const angle=a*1.8+j*Math.PI*2/3;ctx.beginPath();ctx.arc(Math.cos(angle)*radius,Math.sin(angle)*radius*.7,2.5,0,Math.PI*2);ctx.fill();}if(id==='verdant'){ctx.beginPath();ctx.ellipse(0,10,24,30,0,0,Math.PI*2);ctx.stroke();}}
  if(h.dashTimer>0){ctx.strokeStyle=h.upgrades?.includes('soulstep')?'#d6b2ff':'#91f5ee';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=16;for(let j=0;j<5;j++){ctx.globalAlpha=(1-j/5)*.8;ctx.lineWidth=3-j*.4;ctx.beginPath();ctx.moveTo(-h.facing*(18+j*15),-17+j*8);ctx.lineTo(-h.facing*(65+j*18),-17+j*8);ctx.stroke();}}
  ctx.restore();return true;
}
