let panel,route,lastRoute='';
export function renderRunHud(state){
  if(!panel){
    panel=document.createElement('div');panel.className='ember-status-hud';panel.innerHTML='<strong data-rally></strong><div class="rally-track"><i></i></div><span data-flow></span>';
    route=document.createElement('div');route.className='route-hud';route.setAttribute('aria-label','回廊路线');
    document.querySelector('.game-shell').append(panel,route);
  }
  const h=state.hero,active=['playing','paused'].includes(state.phase),pool=h.rallyPool||0;
  panel.hidden=!active||pool<.005&&!(h.flowStacks>0);
  panel.querySelector('[data-rally]').textContent=pool>.005?`余烬可回收 ${Math.ceil(pool*20)} · ${h.rallyTimer>0?h.rallyTimer.toFixed(1)+'s':'正在流失'}`:'';
  panel.querySelector('.rally-track').hidden=pool<.005;
  panel.querySelector('i').style.width=`${Math.min(100,pool/h.maxHp*100)}%`;
  panel.querySelector('[data-flow]').textContent=h.flowStacks>0?`连杀疾行 +${h.flowStacks*4}% · ${h.flowTimer.toFixed(1)}s`:'';
  route.hidden=!active||!state.trial;
  const node=state.trial?.currentNode,key=`${state.campaign?state.roomIndex:'trial'}-${node}-${(state.trial?.visitedNodes||[]).join(',')}`;
  if(key!==lastRoute){
    lastRoute=key;
    const nodes=state.campaign?state.trial.nodes.filter(n=>!n.optional).map(n=>[n.id,n.name]):[['entry','入口'],['combat','苔庭'],['crossfire','长廊'],['rest','锻火'],['elite','精英'],['exit','星门']];
    const primary=node==='treasure'?(state.campaign?'combat':'crossfire'):node==='relic'?'elite':node;
    route.innerHTML=nodes.map(([id,name])=>`<span class="${primary===id?'current':state.trial?.visitedNodes?.includes(id)?'visited':''}"><i></i>${name}</span>`).join('');
  }
}
