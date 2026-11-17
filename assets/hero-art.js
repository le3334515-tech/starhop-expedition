import { selectHeroPose } from './hero-animation.js';
const names=['run','guard','jump','blade','cast','dodge','hurt'],textures=new Map();
export const heroArtReady=Promise.all(names.map(name=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{textures.set(name,image);resolve(true);};image.onerror=()=>resolve(false);image.src=new URL(`./art/ashen-hero/${name}.png`,import.meta.url).href;
})));
export function drawAshenHero(ctx,h,time,scale=1,awakened=false){
  const pose=selectHeroPose(h,time),image=textures.get(pose.sheet);if(!image)return false;
  const x=h.x+h.w/2,y=h.y+h.h;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#03081266';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y+1),h.grounded?16*scale:11*scale,3*scale,0,0,Math.PI*2);ctx.fill();
  ctx.translate(Math.round(x),Math.round(y));ctx.scale((h.facing||1)*scale,scale);
  if(h.dashTimer>0){ctx.save();ctx.globalAlpha=.16;ctx.drawImage(image,pose.frame*128,0,128,112,-76,-108,128,112);ctx.globalAlpha=.07;ctx.drawImage(image,pose.frame*128,0,128,112,-88,-108,128,112);ctx.restore();}
  if(h.invincible>0&&h.dashTimer<=0)ctx.globalAlpha=Math.sin((h.visualAge??time)*42)>.2 ? .7 : 1;
  ctx.drawImage(image,pose.frame*128,0,128,112,-64,-108,128,112);
  if(awakened){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.2;ctx.drawImage(image,pose.frame*128,0,128,112,-64,-108,128,112);}
  ctx.restore();return true;
}
