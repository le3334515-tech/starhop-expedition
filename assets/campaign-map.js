import { BIOMES, CHAPTERS, SECTION_NAMES, campaignLocation } from './campaign-data.js';
const ledge=(x,y,w,wood=false)=>({x,y,w,h:22,kind:wood?'wood':'stone',oneWay:true});
export function campaignMob(id,role,x,floor,hp,biome,optional=false){
  const h={melee:52,rock:60,trunk:66,shield:68,elite:78,bat:24}[role]||44;
  const themed=['melee','rock','trunk','melee','shield'][biome]===role;
  return {id,role,kind:role==='melee'?'slime':role==='bat'?'bat':'sentry',x,y:floor-h,w:role==='elite'?42:32,h,hp,maxHp:hp,vx:0,vy:0,facing:-1,timer:0,hurt:0,dead:false,originX:x,originY:floor-h,attackCooldown:.8,optional,elite:role==='elite',campaignSkin:themed?biome:undefined,skin:role==='rock'?'rock':role==='trunk'?'trunk':role==='bat'?'bat':undefined};
}
export function createCampaignMap(seed,index){
  if(!Number.isInteger(index)||index<0||index>=50)throw new RangeError('campaign floor 0..49');
  const loc=campaignLocation(index),chapter=CHAPTERS[loc.chapter],biome=BIOMES[loc.biome];
  let rng=(seed^Math.imul(index+1,2654435761))>>>0;const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};
  const variation=Math.floor(random()*4)*24;
  const width=loc.isBoss?1540:[2180,2460,2380,2280][loc.section]+variation;
  const gaps=loc.isBoss||loc.section===1||loc.section===3?[]:loc.section===2?[[930,1040],[1580,1690]]:[[1360,1470]];
  const platforms=[];let start=0;
  for(const [a,b] of [...gaps,[width,width]]){if(a>start)platforms.push({x:start,y:448,w:a-start,h:140,kind:'ground'});start=b;}
  // Bonus loop has the same reachable 68/78px stair rises as the trial, with
  // different placement and return paths on each layout. Main path needs no detour.
  const branchX=(loc.section===1?930:520)+(loc.chapter%2)*70+Math.floor(random()*3)*12;
  if(!loc.isBoss){platforms.push(ledge(branchX,370,130,true),ledge(branchX+170,302,140),ledge(branchX+330,234,300),ledge(branchX+620,302,140,true));
    if(loc.section===2)platforms.push(ledge(1370,370,110,true),ledge(1760,350,130));
    if(loc.section===3)platforms.push(ledge(1570,370,170),ledge(1830,302,190));}
  const scale=1+loc.chapter*.075,role=['melee','rock','trunk','melee','shield'][loc.biome];
  const enemies=[];let id=index*100+1;
  if(!loc.isBoss){
    const positions=loc.section===2?[390,1190,1920]:[400,loc.section===1?760:1240,width-440];
    positions.forEach((x,j)=>{const r=j===2&&loc.section===3?'elite':j===1?'shield':role;enemies.push(campaignMob(id++,r,x,448,(r==='elite'?18:r==='shield'?6:4.5)*scale,loc.biome));});
    if(loc.section===1||loc.section===3)enemies.push(campaignMob(id++,'bat',width-750,422,3.2*scale,loc.biome));
    enemies.push({...campaignMob(id++,role,branchX+405,234,5*scale,loc.biome,true),guardGroup:'treasure'});
  }
  const chest={x:branchX+535,y:204,w:34,h:30,opened:loc.isBoss};
  const forgeX=loc.section===1?1900:loc.section===3?1550:180;
  const nodes=loc.isBoss?[{id:'entry',name:'王座前厅',x0:0,x1:460,next:['boss']},{id:'boss',name:chapter.boss,x0:460,x1:width-200,next:['exit']},{id:'exit',name:'归途星门',x0:width-200,x1:width+1,next:[]}]:[
    {id:'entry',name:SECTION_NAMES[loc.section]+'入口',x0:0,x1:340,next:['combat']},
    {id:'combat',name:['残垣巡逻','交火环廊','断裂长桥','精英封锁'][loc.section],x0:340,x1:width-600,next:['rest','treasure']},
    {id:'treasure',name:'藏珍支路',x0:branchX+170,x1:branchX+760,floor:340,optional:true,next:['rest']},
    {id:'rest',name:'烛火休整',x0:width-600,x1:width-240,next:['exit']},
    {id:'exit',name:'归途星门',x0:width-240,x1:width+1,next:[]}];
  return {room:{index,name:`${chapter.name} · ${SECTION_NAMES[loc.section]}`,biomeName:`${chapter.name} ${loc.section+1}/5`,subtitle:biome.name,encounter:loc.isBoss?chapter.boss:'主路清敌 · 高台藏珍',width,height:640,theme:loc.biome,campaignBiome:loc.biome,layout:loc.section,platforms,hazards:gaps.map(([a,b])=>({x:a,y:520,w:b-a,h:50,kind:'lava'})),spawn:{x:100,y:410},checkpoint:{x:100,y:410},exit:{x:width-140,y:352,w:64,h:96},isBoss:loc.isBoss,decorations:[{kind:'trial-sign',x:220,y:448,title:biome.name,text:loc.isBoss?'王座封锁 · 击败关底 Boss':`第 ${index+1}/50 关 · 高台藏珍 ↑`},...(!loc.isBoss?[{kind:'trial-chest',x:chest.x,y:234},{kind:'lamp',x:width-640,y:448,scale:1},{kind:'tree',x:330,y:448,scale:1}]:[])]},enemies,pickups:loc.isBoss?[]:[{id:index*100+80,x:width-660,y:408,w:18,h:18,kind:'heart',value:1,vy:0,bob:0,collected:false}],trial:{version:11,chest,relicCache:{x:-10000,y:0,opened:true},forge:{x:forgeX,y:448,used:loc.isBoss||![1,3].includes(loc.section)},reward:false,eliteDefeated:false,hint:'',currentNode:'entry',nodes,crates:loc.isBoss?[]:[290,width-600].map((x,i)=>({id:index*10+i,x,y:416,w:38,h:32,hp:2,hitAge:1,breakAge:0,broken:false,heart:i===1||random()<.35})),checkpoints:[{x:150,y:448,active:true,age:0},...(!loc.isBoss?[{x:width-650,y:448,active:false,age:0}]:[])],effects:[]}};
}
