// Original rectangle-based sight query for this project's continuous coordinates.
export function segmentHitsBox(a,b,box){
  let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[a.x,b.x-a.x,box.x,box.x+box.w],[a.y,b.y-a.y,box.y,box.y+box.h]]){
    if(Math.abs(delta)<1e-8){if(origin<=min||origin>=max)return false;continue;}
    const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>=hi)return false;
  }
  return hi>0&&lo<1;
}
export function hasClearSight(room,source,target){
  const a={x:source.x+source.w/2,y:source.y+source.h*.4},b={x:target.x+target.w/2,y:target.y+target.h*.5};
  return !room.platforms.some(tile=>!tile.oneWay&&segmentHitsBox(a,b,tile));
}
export function canScheduleAttack(enemy,state){
  const ranged=['trunk','ranged'].includes(enemy.role);
  if(ranged&&!hasClearSight(state.room,enemy,state.hero))return false;
  return !state.enemies.some(other=>other!==enemy&&!other.dead&&['windup','active'].includes(other.ai?.phase)&&Math.abs(other.x-enemy.x)<480&&ranged&&['trunk','ranged'].includes(other.role));
}
