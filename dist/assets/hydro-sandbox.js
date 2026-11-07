/* Deterministic teaching model; no sensor feed, hydraulic forecast or real gate control. */
(() => {
 'use strict';
 const stages=[{key:'calm',name:'平稳',symbol:'○',color:'#3d899e'},{key:'watch',name:'临近阈值',symbol:'△',color:'#987411'},{key:'high',name:'模拟超阈',symbol:'!',color:'#c46527'},{key:'critical',name:'模拟高位',symbol:'!!',color:'#bc3548'}];
 const stage=(level,limit)=>level>=limit+.6?3:level>=limit?2:level>=limit-.4?1:0;
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
 const network={qinhuai:{order:[2,1,0],lag:{2:0,1:25,0:40},gate:2,downstream:[1,0]},yangtze:{order:[3,4,5],lag:{3:0,4:25,5:45},gate:3,downstream:[4,5]},lake:{order:[6,7],lag:{6:0,7:0},gate:null,downstream:[]}};
 const profiles=[
  {kind:'河口教学点',description:'在外秦淮河与长江交汇处，观察河口水位变化。',fact:'河口水位可能同时受到河流来水与受纳水体的影响。',article:'flood',photo:'qinhuai'},
  {kind:'入江河口教学点',description:'以秦淮新河入江口为背景，展示流量与水位的关系。',fact:'流量表示单位时间通过断面的水量，与水位不是同一个量。',article:'flood',photo:'qinhuai'},
  {kind:'城市河道教学点',description:'以内秦淮河为背景，观察城市河道对降雨的演示响应。',fact:'地面覆盖、排水能力与降雨过程都会影响雨水去向。',article:'digital',photo:'qinhuai'},
  {kind:'干流河段教学点',description:'以江心洲附近长江河段为背景，观察干流水情。',fact:'同一河流不同位置的水位，也需要结合基准和地形理解。',article:'flood',photo:'yangtze'},
  {kind:'桥梁观景教学点',description:'以南京长江大桥观景位置为背景，联系实景与地图。',fact:'桥下可见的水面高度不能直接代替有基准的水位测量。',article:'digital',photo:'yangtze'},
  {kind:'干流河段教学点',description:'以栖霞段长江为背景，展示教学时滞中的后续响应。',fact:'来水传递不是瞬时变化，真实过程需要专业观测与模型。',article:'flood',photo:'yangtze'},
  {kind:'湖泊教学点',description:'在石臼湖教学位置观察湖泊变化，独立参与降雨演示。',fact:'湖泊的蓄水与水位关系取决于地形，不能直接套用河道规则。',article:'reservoir',photo:null},
  {kind:'城市湖泊教学点',description:'以玄武湖为背景，联系湖面、岸线与城市水生态。',fact:'清澈不等于水质安全，pH也不能单独说明水质类别。',article:'quality',photo:'xuanwu'}
 ];
 // Controls are time-stamped. Editing at a replay cursor replaces only that control's future.
 function changes(events,minute,value,duration){
  const t=clamp(minute,0,120),next=(events||[]).filter(e=>Number.isFinite(e.at)&&e.at<t).map(e=>({...e}));
  next.push({at:t,value});if(duration&&value)next.push({at:Math.min(120,t+duration),value:0});return next;
 }
 function valueAt(events,t,fallback,max){
  if(t<0)return 0;
  if(!Array.isArray(events)||!events.length)return clamp(fallback,0,max);
  let value=0,latest=-1;for(const e of events)if(Number.isFinite(e.at)&&e.at<=t&&e.at>=latest){latest=e.at;value=clamp(e.value,0,max)}return value;
 }
 function rainfall(c,t){return valueAt(c.rainEvents,t,t<40?c.rain:0,120)}
 function gateOpening(c,t){return valueAt(c.gateEvents,t,t>=clamp(c.gateAt,0,120)?c.gate:0,100)}
 function createModel(seeds){
  const baseline=seeds.map(s=>({...s}));
  function sample(c={}){
   const {scope='qinhuai'}=c,minute=clamp(c.minute,0,120),group=network[scope]||network.qinhuai;
   return baseline.map(s=>{
    let pulse=0,gateResponse=0;const active=s.group===scope,lag=group.lag[s.index]??0,lake=s.group==='lake';
    const downstream=group.downstream.indexOf(s.index),isGate=s.index===group.gate;
    if(active)for(let t=0;t<minute;t++){
     const dt=Math.min(1,minute-t),target=rainfall(c,t-lag)/60*(lake?1.1:1.5)*(1-lag/300);
     const tau=target>pulse?(lake?28:12):(lake?65:32);
     pulse+=(target-pulse)*(1-Math.exp(-dt/tau));
     if(group.gate!==null&&(isGate||downstream>=0)){
      const gateTime=t-(isGate?0:15*(downstream+1));
      const requested=valueAt(c.gateEvents,gateTime,gateTime>=clamp(c.gateAt,0,120)?c.gate:0,100)/100;
      gateResponse+=(requested-gateResponse)*(1-Math.exp(-dt/8));
     }
    }
    const adjustment=isGate?-.7*gateResponse:downstream>=0?.35*gateResponse:0;
    const gateFlow=isGate?.5*gateResponse:downstream>=0?.3*gateResponse:0;
    const level=+(s.base+pulse+adjustment).toFixed(2);
    return {...s,level,flow:Math.round(s.flowBase*(1+pulse*.12+gateFlow)),stage:stage(level,s.limit),delta:+(level-s.base).toFixed(2)};
   });
  }
  return {sample,baseline:()=>baseline.map(s=>({...s}))};
 }
 function createLedger(storage){
  const key='zhishui-inspection-ledger-v1';let records=[],available=true,serial=0;
  function valid(r){return r&&typeof r.id==='string'&&r.id.length<100&&['water','inspection','scenario'].includes(r.type)&&(r.type==='inspection'&&r.station===null||Number.isInteger(r.station)&&r.station>=0&&r.station<8)&&['pending','handled','ended','noted'].includes(r.status)&&typeof r.title==='string'&&r.title.length<=150&&typeof r.at==='string'&&Number.isFinite(Date.parse(r.at))&&(r.identity===undefined||typeof r.identity==='string'&&r.identity.length<150)}
  function reload(){records=[];try{const data=JSON.parse(storage?.getItem(key)||'null');if(data?.version===1&&Array.isArray(data.records))records=data.records.filter(valid).slice(0,50).map(r=>({...r,summary:String(r.summary||'').slice(0,600),observations:Array.isArray(r.observations)?r.observations.slice(0,5).filter(o=>o&&typeof o.name==='string'&&typeof o.explanation==='string').map(o=>({name:o.name.slice(0,50),explanation:o.explanation.slice(0,400),box:Array.isArray(o.box)&&o.box.length===4&&o.box.every(v=>Number.isFinite(v)&&v>=0&&v<=100)?o.box:null})):[],severity:clamp(r.severity,0,3)}))}catch{available=false}}
  reload();
  const persist=()=>{try{available=!!storage&&storage.setItem(key,JSON.stringify({version:1,records}))!==false}catch{available=false}};
  const add=r=>{const stamp=Date.now();let id;do{id=window.crypto?.randomUUID?.()||`r-${stamp}-${++serial}`}while(records.some(item=>item.id===id));const record={...r,id,at:new Date().toISOString(),severity:clamp(r.severity,0,3)};if(!valid(record))throw Error('Invalid record');records.unshift(record);records=records.slice(0,50);persist();return record};
  const pending=r=>r.status==='pending'&&(r.type!=='water'||r.active!==false);
  return {
   reload,
   pendingCount:()=>records.filter(pending).length,
   handlePending(){let count=0;for(const r of records)if(pending(r)){r.status='handled';count++}if(count)persist();return count},
   list:()=>records.map(r=>({...r,observations:r.observations?.map(o=>({...o}))})),available:()=>available,
   add,
   handle(id){const r=records.find(r=>r.id===id);if(!r)return false;r.status=r.status==='handled'?(r.type==='inspection'&&!r.needsReview?'noted':r.active===false?'ended':'pending'):'handled';persist();return true},
   water(s,run){const rank=stage(s.level,s.limit),identity=`${run}:${s.index}`;let r=records.find(r=>r.type==='water'&&r.identity===identity);
    if(rank<2){if(r&&r.active!==false){r.active=false;if(r.status==='pending')r.status='ended';persist()}return}
    if(!r)return add({type:'water',station:s.index,status:'pending',severity:rank,title:`${s.name} · ${stages[rank].name}`,identity,active:true,level:s.level});
    if(rank>r.severity||r.active===false){r.severity=rank;r.title=`${s.name} · ${stages[rank].name}`;r.active=true;r.status='pending';r.at=new Date().toISOString();r.level=s.level;persist()}
   },
   endRun(run){let changed=false;for(const r of records)if(r.type==='water'&&r.identity?.startsWith(run+':')&&r.active!==false){r.active=false;if(r.status==='pending')r.status='ended';changed=true}if(changed)persist()}
  };
 }
 window.HydroSandbox={stages,stage,network,profiles,changes,rainfall,gateOpening,createModel,createLedger};
})();
