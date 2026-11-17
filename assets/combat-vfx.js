// Simulation-time visual events. These never create hitboxes or apply damage.
export const VFX_CLIPS = {
  slash: { frames:24, duration:.4, size:112 },
  impact: { frames:24, duration:.4, size:64 },
  parry: { frames:24, duration:.48, size:92 },
  ember: { frames:24, duration:.6, size:144 },
  dash: { frames:24, duration:.4, size:130 },
};
export const vfxFrame = effect => Math.min(23,Math.max(0,Math.floor(effect.age/effect.duration*24)));

export function installCombatVfx(Engine){
  const p=Engine.prototype,base=Object.fromEntries(['start','updateEffects','impact','beginDodge','advanceAction','updateEnemies','damageCrate'].map(k=>[k,p[k]]));
  p.start=function(options){base.start.call(this,options);this.state.combatVfx=[];this.vfxSerial=0;};
  p.spawnCombatVfx=function(kind,x,y,options={}){
    const spec=VFX_CLIPS[kind];if(!spec)return;
    const list=this.state.combatVfx ||= [];
    const effect={id:++this.vfxSerial,kind,x,y,age:0,duration:spec.duration,size:spec.size,facing:this.state.hero.facing,...options};
    list.push(effect);if(list.length>24)list.shift();return effect;
  };
  p.updateEffects=function(dt){
    base.updateEffects.call(this,dt);
    if(this.state.phase!=='playing')return;
    const delta=Math.max(0,dt-Math.min(dt,this.state.hitstop));
    for(const fx of this.state.combatVfx||[])fx.age+=delta;
    this.state.combatVfx=(this.state.combatVfx||[]).filter(fx=>fx.age<fx.duration);
  };
  p.impact=function(x,y,kind,color){
    const legacy={parry:'break',guard:'hit',explosion:'heavy'}[kind]||kind;
    base.impact.call(this,x,y,legacy,color);
    const effect=kind==='explosion'?'ember':['break','parry','guard'].includes(kind)?'parry':'impact';
    const options=kind==='guard'?{size:48,duration:.28}:kind==='break'?{size:112}:kind==='heavy'?{size:86}:kind==='critical'?{size:78}:{};
    this.spawnCombatVfx(effect,x,y,options);
    const native=this.state.impacts.at(-1);if(native)native.generatedVfx=effect;
  };
  p.beginDodge=function(){
    const begun=base.beginDodge.call(this);if(begun){const h=this.state.hero;this.spawnCombatVfx('dash',h.x+h.w/2,h.y+h.h*.6,{facing:h.facing});}return begun;
  };
  p.advanceAction=function(dt,input){
    const action=this.state.hero.action,wasReleased=action?.released;
    base.advanceAction.call(this,dt,input);
    if(action?.released&&!wasReleased&&action.weapon==='blade'){
      const h=this.state.hero,heavy=!!action.spec.heavy;
      this.spawnCombatVfx('slash',h.x+h.w/2+action.facing*action.spec.reach*.47,h.y+h.h-34,{facing:action.facing,size:heavy?150:112,duration:heavy ? .48 : .4,flipY:h.attackStep===2,heavy});
    }
  };
  p.updateEnemies=function(dt){
    const before=new Map(this.state.enemies.map(e=>[e.id,e.ai?.phase]));
    base.updateEnemies.call(this,dt);
    for(const e of this.state.enemies){
      e.guardFlash=Math.max(0,(e.guardFlash||0)-dt);
      if(e.dead||e.ai?.phase!=='active'||before.get(e.id)==='active')continue;
      if(['shield','elite','melee'].includes(e.role))this.spawnCombatVfx('slash',e.x+e.w/2+e.ai.facing*(e.elite?50:38),e.y+e.h*.55,{facing:e.ai.facing,size:e.elite?138:104,enemy:true,flipY:e.ai.sequence===1});
      if(e.role==='rock'||e.role==='bat')this.spawnCombatVfx('dash',e.x+e.w/2,e.y+e.h*.6,{facing:e.ai.facing,size:105,enemy:true});
    }
  };
  p.damageCrate=function(crate,damage){
    if(crate.broken)return;
    base.damageCrate.call(this,crate,damage);
    this.impact(crate.x+crate.w/2,crate.y+crate.h/2,crate.broken?'heavy':'hit','#d6b77d');
  };
}
