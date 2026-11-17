import { CHAPTERS } from './campaign-data.js';
import { campaignMob } from './campaign-map.js';
import { intersects } from './combat-actions.js';
export const BOSS_MOVES={
  thrust:{name:'穿刺',windup:.72,active:.18,recover:.85,reach:145},
  sweep:{name:'横扫',windup:.85,active:.25,recover:1,reach:180},
  charge:{name:'突进',windup:.9,active:.65,recover:1.1,reach:80},
  slam:{name:'震地 · 跳跃躲避',windup:1.1,active:.22,recover:1.25,reach:120},
  wave:{name:'地波 · 跳跃躲避',windup:.95,active:.2,recover:1.05},
  fan:{name:'散射 · 可弹反',windup:.9,active:.18,recover:1.05},
  leap:{name:'跃击 · 离开落点',windup:1.15,active:.5,recover:1.3},
  zones:{name:'地刺 · 离开光纹',windup:1.1,active:.2,recover:1.2},
  summon:{name:'召唤 · 优先清理随从',windup:1.2,active:.15,recover:1.4},
  teleport:{name:'瞬移斩 · 留意背后',windup:1.05,active:.2,recover:1.2,reach:145},
};
export function createCampaignBoss(chapter){const hp=48+chapter*13;return {id:10000+chapter,chapter,name:CHAPTERS[chapter].boss,x:1040,y:336,w:80,h:112,hp,maxHp:hp,phase:1,mode:'idle',timer:1.4,age:0,visualAge:0,vx:0,vy:0,facing:-1,hurt:0,attackCount:0,active:false,dead:false,intent:'thrust',targetX:700,guard:30,maxGuard:30,exposed:0,zones:[],released:false,hit:false};}
export function updateCampaignBoss(engine,dt){
  const s=engine.state,b=s.boss,h=s.hero;if(!b)return;
  b.markLife=Math.max(0,(b.markLife||0)-dt);if(b.markLife<=0)b.burnMarks=0;
  b.visualAge+=dt;b.hurt=Math.max(0,b.hurt-dt);b.exposed=Math.max(0,b.exposed-dt);
  if(b.dead){b.deathAge=(b.deathAge||0)+dt;return;}
  if(!b.active){if(h.x>380){b.active=true;s.announcement=b.name+' · 王座封锁';s.announcementTimer=2.5;engine.sound('heavy');}return;}
  const phase=b.hp<=b.maxHp*.5?2:1;
  if(phase>b.phase){b.phase=phase;b.mode='recover';b.timer=1.6;b.exposed=1.6;b.zones=[];s.projectiles=s.projectiles.filter(p=>p.owner==='hero');s.announcement=b.name+' · 二阶段';s.announcementTimer=2;engine.impact(b.x+40,b.y+50,'break','#d4acf1');}
  for(const zone of b.zones){zone.age+=dt;if(zone.age>=zone.delay&&!zone.hit&&intersects(h,{x:zone.x,y:432,w:zone.w,h:16})){zone.hit=true;engine.receiveAttack({source:b,sourceX:zone.x+zone.w/2,damage:1,canBlock:false,canParry:false,type:'ground-spike'});}}
  b.zones=b.zones.filter(z=>z.age<z.delay+.4);
  b.timer-=dt;b.age+=dt;
  if(b.mode==='stagger'||b.mode==='recover'){
    b.vx=0;if(b.timer<=0){b.mode='idle';b.timer=.65;b.age=0;if(b.guard<=0)b.guard=b.maxGuard;}return;
  }
  const dx=h.x+h.w/2-b.x-b.w/2;
  if(b.mode==='idle'){
    b.facing=dx>=0?1:-1;b.vx=Math.abs(dx)>140?b.facing*85:0;b.x=Math.max(420,Math.min(s.room.width-230,b.x+b.vx*dt));
    if(b.timer>0)return;
    const c=CHAPTERS[b.chapter],pattern=b.phase===2?c.phase2:c.pattern;b.intent=pattern[b.attackCount++%pattern.length];
    b.targetX=Math.max(440,Math.min(s.room.width-250,h.x));b.facing=dx>=0?1:-1;b.lockFacing=b.facing;
    b.mode='windup';b.age=0;b.timer=BOSS_MOVES[b.intent].windup;b.vx=0;b.released=false;b.hit=false;
    if(['zones','leap'].includes(b.intent)){
      const xs=b.intent==='leap'?[b.targetX-55]:[b.targetX-40,b.targetX-205,b.targetX+125];
      xs.forEach((x,i)=>b.zones.push({x:Math.max(400,Math.min(s.room.width-190,x)),w:b.intent==='leap'?150:90,age:0,delay:BOSS_MOVES[b.intent].windup+(b.intent==='leap'?.4:i*.16),hit:false}));
    }
    engine.label(b.x+40,b.y-20,BOSS_MOVES[b.intent].name,['slam','wave','zones','leap'].includes(b.intent)?'#efaaa0':'#e6cc91');return;
  }
  if(b.mode==='windup'){
    if(b.timer>0)return;b.mode='active';b.age=0;b.timer=BOSS_MOVES[b.intent].active;
    if(b.intent==='teleport'){b.x=Math.max(420,Math.min(s.room.width-220,b.targetX+100));b.facing=-1;b.lockFacing=-1;}
    if(['sweep','thrust','charge','teleport'].includes(b.intent))engine.spawnCombatVfx('slash',b.x+40+b.facing*65,398,{facing:b.facing,size:190,enemy:true,heavy:b.intent==='sweep'});else engine.impact(b.x+40+b.facing*40,420,b.intent==='fan'?'cast':'heavy','#dba36f');
  }
  if(b.mode!=='active')return;
  const move=BOSS_MOVES[b.intent];
  if(!b.released){b.released=true;
    const shot=(kind,x,y,vx,vy,w=14,height=14)=>s.projectiles.push({id:++engine.projectileId,kind,x,y,w,h:height,vx,vy,life:3.5,owner:'enemy',damage:1,source:b,hitIds:[]});
    if(['fan','wave','slam'].includes(b.intent)){
      if(b.intent==='fan'){const angle=Math.atan2(h.y+18-(b.y+45),h.x+14-(b.x+40));for(const offset of[-.3,0,.3])shot('enemy',b.x+40,b.y+45,Math.cos(angle+offset)*260,Math.sin(angle+offset)*260);}
      else{shot('shockwave',b.x+20,429,-270,0,30,18);shot('shockwave',b.x+60,429,270,0,30,18);}
    }
    if(b.intent==='summon'&&s.enemies.filter(e=>!e.dead).length<2){const count=2-s.enemies.filter(e=>!e.dead).length;for(let i=0;i<count;i++){const e=campaignMob(++engine.projectileId,'melee',Math.max(430,Math.min(s.room.width-270,b.x+(i?160:-160))),448,3+b.chapter*.35,s.campaign.biome,true);engine.prepareMonster(e);Object.assign(e.ai,{phase:'recovery',age:0,duration:1.1});s.enemies.push(e);}}
  }
  if(b.intent==='leap'){const t=Math.min(1,b.age/.5);b.x+=(b.targetX-b.x)*Math.min(1,dt*8);b.y=336-Math.sin(t*Math.PI)*125;}
  if(b.intent==='charge'){b.vx=b.lockFacing*430;b.x=Math.max(420,Math.min(s.room.width-200,b.x+b.vx*dt));}
  if(move.reach&&!b.hit){const box={x:b.facing>0?b.x+b.w-10:b.x-move.reach+10,y:365,w:move.reach,h:82};if(intersects(box,h)){b.hit=true;engine.receiveAttack({source:b,sourceX:b.x+40,damage:1,canBlock:b.intent!=='slam',canParry:b.intent!=='slam',type:b.intent});}}
  if(b.timer<=0&&b.mode==='active'){b.mode='recover';b.age=0;b.timer=move.recover*(b.phase===2?.85:1);b.exposed=.55;b.vx=0;b.y=336;}
}
