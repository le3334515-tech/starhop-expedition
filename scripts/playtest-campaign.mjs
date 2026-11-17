import { JA } from '../assets/game-core.js';
export function playCampaign(weapon='blade',seed=42,chapterStart=0){
 const g=new JA();g.start({weapon,seed,modifier:'standard',mode:'campaign',chapterStart});const floors=[];let last=-1;
 let parries=0,hits=0;const receive=g.receiveAttack;g.receiveAttack=function(a){const r=receive.call(this,a);if(r.result==='parried')parries++;if(r.result==='hurt')hits++;return r;};
 for(let frame=0;frame<120*2400;frame++){
  const s=g.state,h=s.hero;if(['victory','gameover'].includes(s.phase))break;
  if(s.phase==='upgrade'){const choices=s.upgradeChoices;g.chooseUpgrade((choices.find(c=>c.id==='edge')||choices.find(c=>c.id==='vigor')||choices.find(c=>c.id==='tempo')||choices.find(c=>c.id==='campaign-edge')||choices[0]).id);}
  if(last!==s.roomIndex){last=s.roomIndex;floors.push({index:last,health:h.hp,damage:h.damage,time:+s.time.toFixed(2)});}
  const b=s.boss,targets=s.enemies.filter(e=>!e.dead&&!e.optional),target=targets.sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x))[0]||(!b?.dead?b:null),input={};let desired=s.room.exit.x;
  if(target){const isBoss=target===b,dx=target.x+target.w/2-h.x-h.w/2,distance=Math.abs(dx),direction=Math.sign(dx)||h.facing;
   const spacing=weapon==='blade'?49:weapon==='ember'?200:160;desired=target.x-direction*spacing;
   const unsafe=s.room.hazards.find(gap=>desired+h.w>gap.x-14&&desired<gap.x+gap.w+14);if(unsafe)desired=target.x>unsafe.x?unsafe.x+unsafe.w+24:unsafe.x-h.w-24;
   input.moveX=Math.abs(desired-h.x)>9?Math.sign(desired-h.x):h.facing!==direction?direction*.08:0;
   if(weapon==='blade'&&h.grounded&&target.y+target.h-h.y-h.h>65){const tile=s.room.platforms.find(p=>p.oneWay&&Math.abs(p.y-h.y-h.h)<4&&h.x+h.w>p.x&&h.x<p.x+p.w);if(tile){desired=tile.x+tile.w+24;input.moveX=1;}}
   const ai=target.ai,phase=isBoss?b.mode:ai?.phase,age=isBoss?b.age:ai?.age;
   const incoming=s.projectiles.find(p=>p.owner!=='hero'&&Math.abs(p.x-h.x)<85&&Math.abs(p.y-h.y-18)<30&&(h.x-p.x)*p.vx>0);
   if(incoming&&incoming.kind!=='shockwave'){input.moveX=Math.sign(incoming.x-h.x)*.08;input.guardHeld=true;}
   else if(isBoss){
    if(['windup','active'].includes(phase)){
     const ground=['wave','slam','leap','zones'].includes(b.intent);
     if(ground){const time=phase==='windup'?b.timer:0;if(time<.25){input.jumpPressed=h.grounded||h.jumps===1&&h.vy>30;input.jumpHeld=true;}input.attackHeld=weapon!=='blade'&&distance<390;}
     else if(['thrust','sweep','charge','teleport'].includes(b.intent)&&distance<240){input.moveX=h.facing!==direction?direction*.08:0;input.guardHeld=phase==='active'||b.timer<.105;}
     else input.attackHeld=distance<(weapon==='blade'?100:390);
    }else input.attackHeld=distance<(weapon==='blade'?100:390);
   }else if(['windup','active'].includes(phase)&&distance<(target.role==='elite'?115:95)){input.moveX=h.facing!==direction?direction*.08:0;input.guardHeld=phase==='active'||age>=ai.duration-.105;}
   else input.attackHeld=distance<(weapon==='blade'?65:390)&&Math.abs(target.y+target.h-h.y-h.h)<70;
  }else input.moveX=desired>h.x?1:-1;
  const gap=s.room.hazards.find(t=>h.x+h.w>t.x-80&&h.x<t.x+t.w+30);if(gap){input.jumpPressed=h.grounded||h.jumps===1&&h.vy>20;input.jumpHeld=true;}
  if(s.projectiles.some(p=>p.kind==='shockwave'&&Math.abs(p.x-h.x)<125)){input.jumpPressed=h.grounded||h.jumps===1&&h.vy>20;input.jumpHeld=true;}
  if(h.hp<h.maxHp-1)input.interactPressed=frame%30===0;
  g.update(1/120,input);
 }
 return {weapon,seed,phase:g.state.phase,index:g.state.roomIndex,time:+g.state.time.toFixed(1),health:g.state.hero.hp,parries,hits,floors,remaining:g.state.enemies.filter(e=>!e.dead&&!e.optional).map(e=>({role:e.role,x:e.x,hp:e.hp})),boss:g.state.boss&&{hp:g.state.boss.hp,mode:g.state.boss.mode,x:g.state.boss.x},x:g.state.hero.x};
}
if(process.argv[1]?.endsWith('playtest-campaign.mjs')){const result=['blade','ember','disc'].map(w=>playCampaign(w,42));console.log(JSON.stringify(result,null,2));if(result.some(r=>r.phase!=='victory'))process.exitCode=1;}
