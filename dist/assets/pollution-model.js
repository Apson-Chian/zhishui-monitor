/* Independent teaching model: a finite-width Gaussian pulse on an infinite 1D channel. */
(() => {
 'use strict';
 const defaults={source:10,mass:300,velocity:.4,dispersion:8,area:180,halfLife:6,threshold:1};
 const horizon=720,sigma0=60,R=6371008.8;
 const number=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
 function normalize(p={}){return {source:number(p.source,5,95,10),mass:number(p.mass,10,2000,300),velocity:number(p.velocity,.1,1.5,.4),dispersion:number(p.dispersion,1,80,8),area:number(p.area,50,2000,180),halfLife:number(p.halfLife,0,24,6),threshold:number(p.threshold,.1,10,1)}}
 function distance(a,b){const rad=Math.PI/180,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad;const h=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.sqrt(Math.min(1,h)))}
 function createReach(feature){
  const coords=feature?.geometry?.coordinates;
  if(feature?.geometry?.type!=='LineString'||!Array.isArray(coords)||coords.length<2||coords.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90))throw Error('河段坐标无效');
  const coordinates=coords.map(p=>p.slice(0,2)),chainage=[0];
  for(let i=1;i<coordinates.length;i++)chainage.push(chainage[i-1]+distance(coordinates[i-1],coordinates[i]));
  if(chainage.at(-1)<100)throw Error('河段长度不足');
  return {id:String(feature.properties?.id||''),name:String(feature.properties?.name||'选定河段'),direction:String(feature.properties?.direction||'教学设定'),coordinates,chainage,length:chainage.at(-1)};
 }
 function pointAt(reach,metres){const x=number(metres,0,reach.length,0);let i=1;while(i<reach.chainage.length-1&&reach.chainage[i]<x)i++;const a=reach.coordinates[i-1],b=reach.coordinates[i],span=reach.chainage[i]-reach.chainage[i-1],f=span?(x-reach.chainage[i-1])/span:0;return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]}
 function lineBetween(reach,start,end){const lo=Math.max(0,start),hi=Math.min(reach.length,end);if(hi<=lo)return null;return [pointAt(reach,lo),...reach.coordinates.filter((_,i)=>reach.chainage[i]>lo&&reach.chainage[i]<hi),pointAt(reach,hi)]}
 function project(reach,coordinate){
  let best={distance:Infinity,chainage:0};const k=Math.cos(coordinate[1]*Math.PI/180);
  for(let i=1;i<reach.coordinates.length;i++){const a=reach.coordinates[i-1],b=reach.coordinates[i],vx=(b[0]-a[0])*k,vy=b[1]-a[1],wx=(coordinate[0]-a[0])*k,wy=coordinate[1]-a[1],f=Math.max(0,Math.min(1,(wx*vx+wy*vy)/(vx*vx+vy*vy||1))),p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f],d=distance(coordinate,p);if(d<best.distance)best={distance:d,chainage:reach.chainage[i-1]+(reach.chainage[i]-reach.chainage[i-1])*f,coordinate:p}}
  return best;
 }
 function coefficients(p,minute){const t=number(minute,0,horizon,0)*60,variance=sigma0*sigma0+2*p.dispersion*t,remaining=p.mass*Math.exp(-(p.halfLife?Math.LN2/(p.halfLife*3600):0)*t);return {t,variance,sigma:Math.sqrt(variance),remaining}}
 function concentration(p,source,x,minute){const c=coefficients(p,minute),d=x-source-p.velocity*c.t;return c.remaining*1000/(p.area*Math.sqrt(2*Math.PI*c.variance))*Math.exp(-d*d/(2*c.variance))}
 function cdf(z){const x=Math.abs(z)/Math.SQRT2,t=1/(1+.3275911*x),erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return (1+(z<0?-erf:erf))/2}
 function checkpoint(p,source,x,index){
  const D=p.dispersion,k=p.halfLife?Math.LN2/(p.halfLife*3600):0,a=x-source+p.velocity*sigma0*sigma0/(2*D),A=(p.velocity/(2*D))**2+k/D;
  const S=2*a*a/(1+Math.sqrt(1+4*A*a*a)),peakMinute=Math.max(0,Math.min(horizon,(S-sigma0*sigma0)/(2*D*60))),peak=concentration(p,source,x,peakMinute);
  let entry=null,exit=null;
  if(peak>=p.threshold){
   let lo=0,hi=peakMinute;
   if(concentration(p,source,x,0)>=p.threshold)entry=0;
   else{for(let j=0;j<48;j++){const mid=(lo+hi)/2;if(concentration(p,source,x,mid)>=p.threshold)hi=mid;else lo=mid}entry=hi}
   if(concentration(p,source,x,horizon)<p.threshold){lo=peakMinute;hi=horizon;for(let j=0;j<48;j++){const mid=(lo+hi)/2;if(concentration(p,source,x,mid)>=p.threshold)lo=mid;else hi=mid}exit=hi}
  }
  return {index,name:['观察断面一','观察断面二','观察断面三'][index],chainage:x,fromSource:x-source,peakMinute,peak,entry,exit};
 }
 function analyze(reach,input={},minute=0){
  const p=normalize(input),time=number(minute,0,horizon,0),source=reach.length*p.source/100,c=coefficients(p,time),center=source+p.velocity*c.t,peak=concentration(p,source,Math.max(0,Math.min(reach.length,center)),time),unboundedPeak=c.remaining*1000/(p.area*Math.sqrt(2*Math.PI*c.variance));
  const radius=unboundedPeak>=p.threshold?c.sigma*Math.sqrt(2*Math.log(unboundedPeak/p.threshold)):0;
  const start=Math.max(0,center-radius),end=Math.min(reach.length,center+radius),affected=radius>0&&end>start?[start,end]:null;
  const fraction=Math.max(0,Math.min(1,cdf((reach.length-center)/c.sigma)-cdf(-center/c.sigma))),inside=c.remaining*fraction;
  return {params:p,minute:time,source,center,sigma:c.sigma,peak,affected,affectedLength:affected?end-start:0,mass:{inside,outside:c.remaining-inside,decayed:p.mass-c.remaining,total:p.mass},points:[.3,.55,.8].map((f,i)=>({...checkpoint(p,source,reach.length*f,i),concentration:concentration(p,source,reach.length*f,time),coordinate:pointAt(reach,reach.length*f)}))};
 }
 function exportSnapshot(reach,analysis,events=[]){
  const {params,minute,source,points,affected}=analysis;
  const features=[{type:'Feature',properties:{kind:'selected-reach',id:reach.id,name:reach.name,flowDirection:reach.direction},geometry:{type:'LineString',coordinates:reach.coordinates}},{type:'Feature',properties:{kind:'release',massKg:params.mass,chainageM:source},geometry:{type:'Point',coordinates:pointAt(reach,source)}},...points.map(p=>({type:'Feature',properties:{kind:'virtual-checkpoint',name:p.name,chainageM:p.chainage,concentrationMgL:p.concentration,peakMgL:p.peak,peakMinute:p.peakMinute,thresholdEntryMinute:p.entry,thresholdExitMinute:p.exit},geometry:{type:'Point',coordinates:p.coordinate}}))];
  if(affected)features.push({type:'Feature',properties:{kind:'above-teaching-threshold',thresholdMgL:params.threshold,lengthM:analysis.affectedLength},geometry:{type:'LineString',coordinates:lineBetween(reach,...affected)}});
  return {type:'FeatureCollection',title:'智水监测 · 污染扩散教学分析',exportedAt:new Date().toISOString(),boundary:'真实OSM折线上的一维教学模拟；流向、断面与全部输运参数均为假设。非现场污染、水质分级或应急预测。',source:{geometry:'OpenStreetMap / pollution-reaches.geojson',license:'ODbL-1.0',url:'https://www.openstreetmap.org/copyright'},model:{method:'finite-width Gaussian pulse, constant advection-dispersion and optional first-order decay',initialSigmaM:sigma0,horizonMinutes:horizon,minute,params,units:{source:"percent of reach",mass:"kg",velocity:"m/s",dispersion:"m²/s",area:"m²",halfLife:"h; 0 means no decay",threshold:"mg/L"},massKg:analysis.mass},events:events.filter(e=>e.reach===reach.id).slice(0,40),features};
 }
 function createLedger(storage){
  const key='zhishui-pollution-events-v1';let records=[],available=!!storage;
  const valid=e=>e&&typeof e.id==='string'&&e.id.length<160&&typeof e.reach==='string'&&typeof e.reachName==='string'&&['enter','exit'].includes(e.kind)&&Number.isFinite(e.minute)&&e.minute>=0&&e.minute<=horizon&&Number.isInteger(e.point)&&e.point>=0&&e.point<3&&Number.isFinite(e.threshold)&&typeof e.at==='string';
  try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.version===1&&Array.isArray(saved.records))records=saved.records.filter(valid).slice(0,40)}catch{available=false}
  const persist=()=>{try{if(storage)storage.setItem(key,JSON.stringify({version:1,records}));else available=false}catch{available=false}};
  return {list:()=>records.map(e=>({...e,params:{...e.params}})),available:()=>available,clear(){records=[];persist()},observe(run,reach,analysis,seen=new Set()){
   const pending=[];for(const p of analysis.points)for(const [kind,minute] of [['enter',p.entry],['exit',p.exit]])if(minute!==null&&minute<=analysis.minute&&!seen.has(`${run}:${p.index}:${kind}`)&&!records.some(e=>e.id===`${run}:${p.index}:${kind}`))pending.push({id:`${run}:${p.index}:${kind}`,run,reach:reach.id,reachName:reach.name,point:p.index,kind,minute,threshold:analysis.params.threshold,params:{...analysis.params},at:new Date().toISOString()});
   pending.sort((a,b)=>a.minute-b.minute);for(const e of pending)records.unshift(e);if(pending.length){records=records.slice(0,40);persist()}return pending;
  }};
 }
 window.HydroPollution={defaults,horizon,sigma0,normalize,distance,createReach,pointAt,lineBetween,project,concentration,analyze,exportSnapshot,createLedger};
})();
