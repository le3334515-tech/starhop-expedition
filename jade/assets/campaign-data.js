export const BIOMES=[
  {id:'cloister',name:'沉钟修院',accent:'#d1ad75',danger:'#df9473'},
  {id:'forge',name:'赤炉铸城',accent:'#e5a565',danger:'#e37852'},
  {id:'frost',name:'霜晶王庭',accent:'#9fd8e5',danger:'#d697d8'},
  {id:'blight',name:'瘟绿根窟',accent:'#b9cf83',danger:'#e6b568'},
  {id:'eclipse',name:'星蚀圣域',accent:'#c8afe6',danger:'#e29fca'},
];
export const CHAPTERS=[
  {name:'灰烬外城',boss:'钟狱典狱长',pattern:['thrust','sweep','charge'],phase2:['thrust','charge','sweep','wave'],skin:0},
  {name:'沉钟深殿',boss:'葬钟守望者',pattern:['slam','wave','sweep'],phase2:['slam','wave','leap','fan'],skin:1},
  {name:'炼渣熔道',boss:'炉心猎兽',pattern:['charge','fan','thrust'],phase2:['charge','fan','zones','charge'],skin:2},
  {name:'锁链铸堡',boss:'断链锻主',pattern:['sweep','thrust','slam'],phase2:['sweep','fan','leap','wave'],skin:3},
  {name:'冰封阶庭',boss:'霜冠女爵',pattern:['thrust','fan','zones'],phase2:['thrust','zones','fan','charge'],skin:4},
  {name:'极寒圣库',boss:'裂冰巨像',pattern:['slam','leap','wave'],phase2:['leap','zones','slam','fan'],skin:5},
  {name:'腐根回廊',boss:'孢衣主教',pattern:['fan','zones','thrust'],phase2:['summon','fan','zones','wave'],skin:6},
  {name:'虫巢王座',boss:'棘壳巢后',pattern:['charge','sweep','zones'],phase2:['charge','summon','sweep','zones'],skin:7},
  {name:'星坠断桥',boss:'断星审判官',pattern:['thrust','fan','teleport'],phase2:['teleport','sweep','zones','fan'],skin:8},
  {name:'终蚀王庭',boss:'终蚀君王',pattern:['sweep','charge','fan'],phase2:['teleport','wave','leap','zones','summon'],skin:9},
];
export const SECTION_NAMES=['门廊','回环','断桥','封锁','王座'];
export const TOTAL_FLOORS=50;
export function campaignLocation(index){return {index,chapter:Math.floor(index/5),section:index%5,biome:Math.floor(index/10),isBoss:index%5===4};}
