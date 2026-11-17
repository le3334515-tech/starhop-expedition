// Rendering clocks advance with simulation, independently of display refresh rate.
export function installHeroAnimation(Engine){
  const p=Engine.prototype,base=Object.fromEntries(['start','updateHero','receiveAttack','updateEffects'].map(k=>[k,p[k]]));
  p.start=function(options){base.start.call(this,options);Object.assign(this.state.hero,{visualAge:0,runCycle:0,airAge:0,landingAge:1,hurtAnimAge:1,deathAnimAge:0,guardImpact:0});};
  p.updateHero=function(dt,input){
    const h=this.state.hero,grounded=h.grounded,jumps=h.jumps,x=h.x;
    base.updateHero.call(this,dt,input);
    h.visualAge=(h.visualAge||0)+dt;h.hurtAnimAge=(h.hurtAnimAge??1)+dt;h.guardImpact=Math.max(0,(h.guardImpact||0)-dt);
    if(h.grounded&&Math.abs(h.x-x)>.01)h.runCycle=((h.runCycle||0)+Math.abs(h.x-x)/175)%1;
    if(!h.grounded){h.airAge=!grounded&&h.jumps===jumps?(h.airAge||0)+dt:0;h.landingAge=1;}
    else h.landingAge=grounded?(h.landingAge??1)+dt:0;
  };
  p.receiveAttack=function(attack){const result=base.receiveAttack.call(this,attack),h=this.state.hero;if(result.result==='hurt')h.hurtAnimAge=0;if(['blocked','parried'].includes(result.result))h.guardImpact=.18;return result;};
  p.updateEffects=function(dt){base.updateEffects.call(this,dt);const h=this.state.hero;if(h.hp<=0)h.deathAnimAge=(h.deathAnimAge||0)+dt;};
}

export function selectHeroPose(h,time=0){
  const age=h.visualAge??time;
  if(h.hp<=0)return {sheet:'hurt',frame:8+Math.min(7,Math.floor((h.deathAnimAge||0)*12)),state:'death'};
  if(h.hurtLock>0)return {sheet:'hurt',frame:Math.min(7,Math.floor((h.hurtAnimAge||0)/.26*8)),state:'hurt'};
  const a=h.action;
  if(a){
    const offset=a.weapon==='blade'?Math.max(0,Math.min(2,(h.attackStep||1)-1))*12:a.weapon==='disc'?12:0;
    const startFrames=a.weapon==='blade'?5:6,activeFrames=a.weapon==='blade'?3:2;
    const frame=a.phase==='startup'?Math.min(startFrames-1,Math.floor(a.age/Math.max(.001,a.spec.startup)*startFrames)):a.phase==='active'?startFrames+Math.min(activeFrames-1,Math.floor((a.age-a.spec.startup)/a.spec.active*activeFrames)):8+Math.min(3,Math.floor((a.age-a.spec.startup-a.spec.active)/a.spec.recovery*4));
    return {sheet:a.weapon==='blade'?'blade':'cast',frame:offset+Math.max(0,frame),state:a.weapon};
  }
  if(h.dashTimer>0)return {sheet:'dodge',frame:Math.min(15,Math.floor((.18-h.dashTimer)/.18*16)),state:'dodge'};
  if(h.blocking){const frame=h.guardImpact>0?21+Math.min(2,Math.floor((.18-h.guardImpact)*18)):h.guardAge<.12?12+Math.min(5,Math.floor(h.guardAge/.12*6)):18+Math.floor(age*8)%3;return {sheet:'guard',frame,state:'guard'};}
  if(!h.grounded){
    const t=h.airAge||0;
    const frame=t<.08?2+Math.min(3,Math.floor(t/.08*4)):h.vy<-150?6+Math.floor(t*18)%6:Math.abs(h.vy)<=150?12+Math.floor(t*15)%5:17+Math.floor(t*12)%4;
    return {sheet:'jump',frame,state:'jump'};
  }
  if(h.landingAge<.12)return {sheet:'jump',frame:20+Math.min(3,Math.floor(h.landingAge/.12*4)),state:'land'};
  if(Math.abs(h.vx)>20)return {sheet:'run',frame:Math.floor((h.runCycle??(time*.9)%1)*24)%24,state:'run'};
  if(h.weapon==='ember')return {sheet:'cast',frame:0,state:'idle'};
  if(h.weapon==='disc')return {sheet:'cast',frame:12,state:'idle'};
  return {sheet:'guard',frame:Math.floor(age*10)%12,state:'idle'};
}

export function weaponMuzzle(hero,weapon,facing=hero.facing){
  return {x:hero.x+hero.w/2+facing*(weapon==='ember'?36:32),y:hero.y+hero.h-(weapon==='ember'?41:38)};
}
