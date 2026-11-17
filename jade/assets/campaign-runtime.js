import { BIOMES, CHAPTERS, campaignLocation } from './campaign-data.js';
import { createCampaignMap } from './campaign-map.js';
import { createCampaignBoss, updateCampaignBoss } from './campaign-boss.js';
const HERO_SAVE=['weapon','hp','maxHp','damage','attackSpeed','speed','jumpPower','extraProjectiles','shield','lifesteal','magnet','critChance','level','xp','xpNeeded','upgrades'];
export const CAMPAIGN_SAVE_KEY='starhop-campaign-v11';
const ENDLESS=[{id:'campaign-edge',name:'淬火',description:'武器基础伤害 +0.18，可重复铭刻。',icon:'blade',color:'#dcb48a',rarity:'common'},{id:'campaign-supply',name:'行军补给',description:'恢复全部生命，获得 12 星币。',icon:'heart',color:'#d69c9f',rarity:'common'}];
export function validCampaignSave(save){return !!save&&save.version===11&&Number.isInteger(save.index)&&save.index>=0&&save.index<50&&Number.isFinite(save.seed)&&['blade','ember','disc'].includes(save.hero?.weapon)&&HERO_SAVE.every(k=>save.hero[k]===undefined||k==='weapon'||k==='upgrades'||Number.isFinite(save.hero[k]))&&Array.isArray(save.cleared)&&save.cleared.every(i=>Number.isInteger(i)&&i>=0&&i<save.index)&&['hp','maxHp','damage','speed','attackSpeed','level','xp','xpNeeded'].every(k=>Number.isFinite(save.hero[k]))&&save.hero.hp>0&&save.hero.hp<=save.hero.maxHp&&save.hero.maxHp<=20&&save.hero.damage>0&&save.hero.damage<=100&&Array.isArray(save.hero.upgrades)&&save.hero.upgrades.every(x=>typeof x==='string');}
export function installCampaignRuntime(Engine,pool){
  ENDLESS.forEach(c=>{if(!pool.some(x=>x.id===c.id))pool.push(c);});
  const p=Engine.prototype,base=Object.fromEntries(['start','nextRoom','step','updateBoss','hitBoss','offerUpgrade','chooseUpgrade','finish','updateHero'].map(k=>[k,p[k]]));
  p.start=function(options){base.start.call(this,options);if(options.mode!=='campaign')return;
    const saved=validCampaignSave(options.resume)?options.resume:null;
    const index=saved?saved.index:Math.max(0,Math.min(9,Math.floor(options.chapterStart||0)))*5;
    this.state.campaign={...campaignLocation(index),cleared:saved?.cleared?[...saved.cleared]:[],preview:!!options.preview||!!index&&!saved,version:11};
    if(saved){for(const key of HERO_SAVE)if(saved.hero[key]!==undefined)this.state.hero[key]=Array.isArray(saved.hero[key])?[...saved.hero[key]]:saved.hero[key];for(const key of ['coins','kills','time','deaths','roomsCleared'])if(Number.isFinite(saved[key]))this.state[key]=saved[key];this.refreshSynergies();}
    else if(index){const h=this.state.hero;h.damage+=Math.floor(index/5)*.28;h.maxHp+=Math.min(3,Math.floor(index/10));h.hp=h.maxHp;this.state.coins=20;}
    this.enterCampaignFloor(index);
  };
  p.campaignSnapshot=function(){const s=this.state;if(!s.campaign)return null;return {version:11,index:s.roomIndex,seed:s.seed,modifier:s.modifier,hero:Object.fromEntries(HERO_SAVE.filter(k=>s.hero[k]!==undefined).map(k=>[k,Array.isArray(s.hero[k])?[...s.hero[k]]:s.hero[k]])),cleared:[...s.campaign.cleared],...Object.fromEntries(['coins','kills','time','deaths','roomsCleared'].map(k=>[k,s[k]]))};};
  p.enterCampaignFloor=function(index){
    const s=this.state,h=s.hero;Object.assign(s.campaign,campaignLocation(index));Object.assign(s,createCampaignMap(s.seed,index),{roomIndex:index,roomCount:50,roomCleared:false,boss:index%5===4?createCampaignBoss(Math.floor(index/5)):null,projectiles:[],particles:[],floatingTexts:[],impacts:[],combatVfx:[],hitstop:0,cameraX:0,transition:1});
    this.initSoulsHero();this.bufferedEdges={};this.awakenedDiscs.clear();this.variableJump=false;
    Object.assign(h,{x:100,y:410,vx:0,vy:0,jumps:0,grounded:false,invincible:1.2,attackStep:0,comboWindow:0,dashTimer:0,stamina:100,rallyPool:0,rallyCredits:{},queuedJump:0});
    s.announcement=`第 ${s.campaign.chapter+1} 大关 · ${CHAPTERS[s.campaign.chapter].name} · ${s.campaign.section+1}/5`;s.announcementTimer=3;
    if(!s.campaign.preview)this.callbacks.saveCampaign?.(this.campaignSnapshot());
    if(this.callbacks.loadCampaignTheme){s.phase='loading';const state=s;Promise.resolve(this.callbacks.loadCampaignTheme(s.campaign.biome)).then(()=>{if(this.state===state&&state.roomIndex===index&&state.phase==='loading')state.phase='playing';}).catch(()=>{if(this.state===state&&state.roomIndex===index){state.phase='playing';state.announcement='部分素材载入失败 · 使用备用画面';}});}else s.phase='playing';
  };
  p.nextRoom=function(){const s=this.state;if(!s.campaign)return base.nextRoom.call(this);if(!s.roomCleared)return;if(!s.campaign.cleared.includes(s.roomIndex))s.campaign.cleared.push(s.roomIndex);s.roomsCleared=s.campaign.cleared.length;
    if(s.roomIndex===49){if(!s.campaign.preview)this.callbacks.saveCampaign?.(null);this.finish(true);return;}
    if(s.room.isBoss){s.hero.hp=s.hero.maxHp;s.hero.stamina=100;}
    this.enterCampaignFloor(s.roomIndex+1);this.sound('portal');
  };
  p.updateHero=function(dt,input){base.updateHero.call(this,dt,input);const s=this.state;if(s.campaign&&s.boss?.active&&!s.boss.dead&&s.hero.x<400){s.hero.x=400;s.hero.vx=Math.max(0,s.hero.vx);}};
  p.updateBoss=function(dt){return this.state.campaign?updateCampaignBoss(this,dt):base.updateBoss.call(this,dt);};
  p.hitBoss=function(damage,heavy=false){const s=this.state,b=s.boss;if(!s.campaign)return base.hitBoss.call(this,damage,heavy);if(!b||!b.active||b.dead)return;
    const amount=this.damageAmount(damage)*(b.mode==='stagger'?1.6:b.exposed>0?1.25:1);b.hp=Math.max(0,b.hp-amount);b.hurt=.15;s.hitstop=Math.max(s.hitstop,heavy?.06:.025);s.shake=Math.max(s.shake,heavy?5:3);this.impact(b.x+40,b.y+50,heavy?'heavy':'hit',BIOMES[s.campaign.biome].accent);this.label(b.x+40,b.y-5,String(Math.round(amount*10)/10),'#efcda2');this.sound(heavy?'heavy':'hit');this.gainResonance(heavy?8:5);
    if(b.mode!=='stagger'){b.guard=Math.max(0,b.guard-amount*(heavy?1.8:.8));if(b.guard<=0&&b.hp>0)this.staggerTarget(b,1.2);}
    if(b.hp<=0){b.dead=true;b.active=false;b.mode='defeated';b.deathAge=0;b.zones=[];b.vx=b.vy=0;b.y=336;s.projectiles=s.projectiles.filter(p=>p.owner==='hero');s.enemies.forEach(e=>{e.dead=true;});s.roomCleared=true;s.kills++;s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+2);s.coins+=15;s.announcement=b.name+' 已击败 · 前往星门';s.announcementTimer=4;this.impact(b.x+40,400,'break','#e5c494');this.gainXp(12);}
  };
  p.step=function(dt,input){const before=this.state.roomIndex;base.step.call(this,dt,input);const s=this.state;if(!s.campaign||s.phase!=='playing'||before!==s.roomIndex)return;
    const h=s.hero,t=s.trial,c=t.chest;const near=!c.opened&&Math.hypot(h.x+14-c.x-17,h.y+18-c.y-15)<70;
    if(near){const guard=s.enemies.some(e=>e.optional&&!e.dead);t.hint=guard?'击败支路守卫':'按互动键领取藏珍 · 星币 +6、恢复 +1 ♥';if(!guard&&input.interactPressed){c.opened=true;s.coins+=6;h.hp=Math.min(h.maxHp,h.hp+1);this.label(c.x,c.y-20,'藏珍补给 +6 星币 · +1 ♥','#dec495');this.sound('upgrade');}}
    if(s.room.isBoss&&s.roomCleared&&h.x>s.room.exit.x-28&&h.y+h.h>352)this.nextRoom();
  };
  p.offerUpgrade=function(){base.offerUpgrade.call(this);if(this.state.campaign&&this.state.phase==='upgrade'&&this.state.upgradeChoices.length<3){for(const c of ENDLESS)if(!this.state.upgradeChoices.includes(c))this.state.upgradeChoices.push(c);this.state.upgradeChoices=this.state.upgradeChoices.slice(0,3);}};
  p.chooseUpgrade=function(id){const s=this.state;if(s.campaign&&s.phase==='upgrade'&&s.upgradeChoices.some(c=>c.id===id)){if(id==='campaign-edge')s.hero.damage+=.18;if(id==='campaign-supply'){s.hero.hp=s.hero.maxHp;s.coins+=12;}}base.chooseUpgrade.call(this,id);};
  p.finish=function(won){const s=this.state;if(s.campaign)s.roomsCleared=s.campaign.cleared.length;base.finish.call(this,won);if(s.campaign&&s.result){s.result.mode='campaign';s.result.preview=s.campaign.preview;s.result.totalFloors=50;}};
}
