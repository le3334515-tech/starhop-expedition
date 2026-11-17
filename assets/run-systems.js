// Original mechanics informed by the local static-code review, not transplanted code.
export const MUTATIONS=[
  {id:'pursuit',name:'猎步追斩',description:'闪身后首刀伤害 +25%、冲击 +12。',icon:'blade',rarity:'rare',color:'#9dd8d1',weapon:'blade'},
  {id:'cinder',name:'焦痕回响',description:'灼印持续更久，引爆范围扩大 18、伤害 +12%。',icon:'ember',rarity:'rare',color:'#dfa06e',weapon:'ember'},
  {id:'rebound',name:'回轮刻印',description:'飞轮回程伤害 +25%，更擅长击破架势。',icon:'disc',rarity:'rare',color:'#c0afe4',weapon:'disc'},
  {id:'resolve',name:'不屈守势',description:'普通格挡少消耗 6 精力；有效反击回收更多余烬生命。',icon:'shield',rarity:'rare',color:'#d3bd87'},
];
const CAPS={edge:3,tempo:3,vigor:3,stride:2,multishot:2,shield:2,blood:1,magnet:1,fortune:2,pursuit:1,cinder:1,rebound:1,resolve:1};
export function upgradeChoices(pool,hero,seed,modifier='standard'){
  let value=(seed^Math.imul(hero.level,73244475)^0x64a9f13)>>>0;
  const random=()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};
  const count=id=>hero.upgrades.filter(x=>x===id).length;
  const eligible=pool.filter(c=>!c.id.startsWith('campaign-')&&count(c.id)<(CAPS[c.id]||1)&&(!c.weapon||c.weapon===hero.weapon)&&!(modifier==='iron'&&c.id==='vigor')&&!(c.id==='multishot'&&hero.extraProjectiles>=3));
  const selected=[];
  const trait=eligible.find(c=>c.weapon===hero.weapon);
  if(trait)selected.push(trait);
  const defence=eligible.filter(c=>['vigor','resolve','shield'].includes(c.id));
  if(defence.length)selected.push(defence[Math.floor(random()*defence.length)]);
  const rest=eligible.filter(c=>!selected.includes(c));
  while(selected.length<3&&rest.length)selected.push(rest.splice(Math.floor(random()*rest.length),1)[0]);
  return selected;
}

export function installRunSystems(Engine,pool){
  for(const mutation of MUTATIONS)if(!pool.some(c=>c.id===mutation.id))pool.push(mutation);
  const p=Engine.prototype,base=Object.fromEntries(['start','updateHero','updateEffects','receiveAttack','applyPlayerAttack','hitEnemy','offerUpgrade','explodeAt','spendStamina','step'].map(k=>[k,p[k]]));
  p.start=function(options){
    base.start.call(this,options);
    Object.assign(this.state.hero,{rallyPool:0,rallyTimer:0,flowStacks:0,flowTimer:0,queuedJump:0,rallyCredits:{}});
    this.attackLedgerSerial=0;this.state.lastHit=null;
  };
  p.updateHero=function(dt,input){
    const h=this.state.hero;
    h.queuedJump=input.jumpPressed ? .18 : Math.max(0,(h.queuedJump||0)-dt);
    const blocked=!!h.action&&!this.canCancelAction('jump');
    const jump=h.queuedJump>0&&!blocked;
    if(blocked)h.jumpBuffer=0;
    if(jump&&h.action)this.cancelAction();
    if(jump)h.queuedJump=0;
    const speed=h.speed;
    h.speed*=1+(h.flowStacks||0)*.04;
    if(h.action?.phase==='recovery')h.speed/=h.action.spec.move;
    base.updateHero.call(this,dt,{...input,jumpPressed:jump});h.speed=speed;
  };
  p.updateEffects=function(dt){
    base.updateEffects.call(this,dt);const s=this.state,h=s.hero;if(s.phase!=='playing')return;
    const delta=Math.max(0,dt-Math.min(dt,s.hitstop));
    h.rallyTimer=Math.max(0,(h.rallyTimer||0)-delta);h.flowTimer=Math.max(0,(h.flowTimer||0)-delta);
    if(h.flowTimer<=0)h.flowStacks=0;
    if(h.rallyTimer<=0)h.rallyPool=Math.max(0,(h.rallyPool||0)-delta*.6);
    h.rallyPool=Math.min(h.rallyPool||0,Math.max(0,h.maxHp-h.hp));
  };
  p.receiveAttack=function(attack){
    const h=this.state.hero,before=h.hp,result=base.receiveAttack.call(this,attack);
    if(result.result==='hurt'){
      h.flowStacks=0;h.flowTimer=0;
      if(!attack.environmental&&!attack.forced&&h.hp>0){h.rallyPool=Math.min(h.maxHp-h.hp,(h.rallyPool||0)+(before-h.hp)*.6);h.rallyTimer=2.5;this.label(h.x+14,h.y-38,'反击可回收余烬','#d3a287');}
    }
    return result;
  };
  p.applyPlayerAttack=function(target,attack){
    if((attack.depth||0)>2)return {result:'ignored',damage:0};
    const h=this.state.hero,health=target.hp;
    const parent=this.activeAttackContext;
    const data={...attack,id:attack.id??parent?.id??`event-${++this.attackLedgerSerial}`,tags:[attack.type||'melee',...(attack.heavy?['heavy']:[]),...(attack.riposte?['riposte']:[])],depth:attack.depth??(parent?parent.depth+1:0)};
    if(data.depth>2)return {result:'ignored',damage:0};
    if(data.type==='blade'&&h.upgrades.includes('pursuit')&&h.action?.chase){data.damage*=1.25;data.poise=(data.poise||0)+12;data.tags.push('pursuit');}
    if(data.type==='disc'&&data.returning&&h.upgrades.includes('rebound')){data.damage*=1.25;data.poise=(data.poise||0)+8;data.tags.push('return-bonus');}
    let result;
    this.activeAttackContext=data;
    try{result=base.applyPlayerAttack.call(this,target,data);}finally{this.activeAttackContext=parent;}
    const damage=Math.max(0,health-target.hp);
    const ledger={id:data.id,target:target.id??'boss',type:data.type,tags:data.tags,result:result.result,damage,recovered:0};
    if(damage>0&&(h.rallyPool||0)>0&&h.hp>0){
      const key=String(data.id),already=h.rallyCredits[key]||0,cap=h.upgrades.includes('resolve') ? .32 : .24;
      const amount=Math.min(h.rallyPool,Math.max(0,h.maxHp-h.hp),Math.max(0,cap-already),damage*.12);
      if(amount>0){h.hp=Math.min(h.maxHp,Math.round((h.hp+amount)*1000)/1000);h.rallyPool=Math.max(0,h.rallyPool-amount);h.rallyCredits[key]=already+amount;ledger.recovered=amount;this.burst(h.x+14,h.y+14,'#d2b58c',3,45);}
      if(Object.keys(h.rallyCredits).length>80)h.rallyCredits=Object.fromEntries(Object.entries(h.rallyCredits).slice(-40));
    }
    this.state.lastHit=ledger;return {...result,...ledger};
  };
  p.hitEnemy=function(enemy,damage,heavy){const alive=!enemy.dead;base.hitEnemy.call(this,enemy,damage,heavy);if(alive&&enemy.dead){const h=this.state.hero;h.flowStacks=Math.min(3,(h.flowStacks||0)+1);h.flowTimer=8;}};
  p.offerUpgrade=function(){base.offerUpgrade.call(this);if(this.state.phase==='upgrade')this.state.upgradeChoices=upgradeChoices(pool,this.state.hero,this.state.seed,this.state.modifier);};
  p.explodeAt=function(x,y,damage,excluded,radius){const mutation=this.state.hero.upgrades.includes('cinder');return base.explodeAt.call(this,x,y,damage*(mutation?1.12:1),excluded,radius+(mutation?18:0));};
  p.spendStamina=function(amount){if(this.state.hero.blocking&&this.state.hero.upgrades.includes('resolve')&&amount>=28)amount=Math.max(0,amount-6);return base.spendStamina.call(this,amount);};
  p.step=function(dt,input){
    base.step.call(this,dt,input);const s=this.state,h=s.hero,t=s.trial;if(!t||s.phase!=='playing')return;
    const zone=t.nodes.find(n=>n.optional&&h.x>=n.x0&&h.x<n.x1&&h.y+h.h<n.floor)||t.nodes.find(n=>!n.optional&&h.x>=n.x0&&h.x<n.x1);
    if(zone){t.currentNode=zone.id;t.visitedNodes ||= [];if(!t.visitedNodes.includes(zone.id))t.visitedNodes.push(zone.id);s.room.name=`${s.room.biomeName||'灰烬回廊'} · ${zone.name}`;}
    const forge=t.forge,near=Math.abs(h.x+h.w/2-forge.x)<60&&Math.abs(h.y+h.h-forge.y)<12;
    const safe=!s.enemies.some(e=>!e.dead&&Math.hypot(e.x-forge.x,e.y+e.h-forge.y)<160);
    if(near&&!forge.used){
      t.hint=!safe?'清除附近敌人，再使用锻火台':s.coins<10?'锻火强化 · 需要 10 星币':'按互动键消耗 10 星币 · 选择一次铭刻强化';
      if(safe&&s.coins>=10&&input.interactPressed){forge.used=true;s.coins-=10;h.xp=Math.max(h.xp,h.xpNeeded);this.offerUpgrade();}
    }
    const cache=t.relicCache;
    if(!cache.opened&&Math.hypot(h.x+14-cache.x-17,h.y+18-cache.y-15)<70){
      const guarded=s.enemies.some(e=>e.guardGroup==='relic'&&!e.dead);
      t.hint=guarded?'击败圣物守卫，开启铭刻圣匣':'按互动键开启圣匣 · 获得一次铭刻选择';
      if(!guarded&&input.interactPressed){cache.opened=true;h.xp=Math.max(h.xp,h.xpNeeded);this.offerUpgrade();this.sound('upgrade');}
    }
  };
}
