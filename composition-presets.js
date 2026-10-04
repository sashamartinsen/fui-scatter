import {createLayer,PRESETS,compose} from './engine.js';
import {RASTER_DEFAULTS} from './raster-effects.js';
export const DEFAULT_EFFECTS={...RASTER_DEFAULTS,bloom:true,threshold:.65,strength:.8,radius:12,chromatic:false,aberration:5,radial:0,angle:0,grain:false,grainAmount:.15,grainSize:1,grainSeed:46};
const FORMAT='scatter-studio-preset';
export function capturePreset(state,{id,name,shapeSet}){
 const assets=[],seen=new Map();
 const layers=state.layers.map(layer=>{
  const {asset,...settings}=layer;
  let source=null;
  if(asset){
   if(!seen.has(asset.id)){
    const entry=asset.libraryId&&!asset.libraryId.startsWith('imported/')?{libraryId:asset.libraryId,name:asset.name}:{name:asset.name,svg:asset.sourceText};
    if(!entry.libraryId&&typeof entry.svg!=='string')throw new Error('This SVG has no original source. Re-import it before saving.');
    seen.set(asset.id,assets.length);assets.push(entry);
   }
   source=seen.get(asset.id);
  }
  return {settings:structuredClone(settings),source};
 });
 return {format:FORMAT,version:1,id,name:name.trim(),shapeSet,updatedAt:new Date().toISOString(),canvas:{width:state.width,height:state.height,background:state.background,blend:state.blend,exportScale:state.exportScale},effects:{...state.effects},assets,layers};
}
function typedSettings(input,defaults){
 const result={...defaults};
 for(const [key,def] of Object.entries(defaults)){
  if(!(key in input))continue;
  const value=input[key];
  if(typeof def==='number'){if(!Number.isFinite(value)||Math.abs(value)>2147483647)throw new Error(`Invalid value: ${key}`)}
  else if(typeof def==='boolean'){if(typeof value!=='boolean')throw new Error(`Invalid value: ${key}`)}
  else if(typeof def==='string'){if(typeof value!=='string'||value.length>200)throw new Error(`Invalid value: ${key}`);if(def.startsWith('#')&&!/^#[0-9a-f]{6}$/i.test(value))throw new Error(`Invalid color: ${key}`)}
  else continue;
  result[key]=value;
 }
 return result;
}
export function validatePreset(p){
 if(!p||p.format!==FORMAT||p.version!==1)throw new Error('Unsupported preset file. Expected a Scatter Studio v1 preset.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.shapeSet!=='string'||p.shapeSet.length>40)throw new Error('Invalid preset name or shape set.');
 if(!Array.isArray(p.layers)||!Array.isArray(p.assets)||p.layers.length>500||p.assets.length>500)throw new Error('Invalid preset layers.');
 const c=p.canvas;
 if(!c||!Number.isInteger(c.width)||!Number.isInteger(c.height)||c.width<128||c.width>4096||c.height<128||c.height>4096||!/^#[0-9a-f]{6}$/i.test(c.background)||!['normal','additive','multiply'].includes(c.blend)||![1,2,4].includes(c.exportScale))throw new Error('Invalid canvas settings.');
 if(!p.effects||typeof p.effects!=='object')throw new Error('Invalid post effects.');
 const effects=typedSettings(p.effects,DEFAULT_EFFECTS);
 const effectBounds={hueShiftAngle:[-180,180],crtPixelSize:[1,32],crtScanlines:[0,1],crtMask:[0,1],crtSharpen:[0,3],crtVignette:[0,1],pixelStretchPosition:[0,1],pixelStretchWidth:[.001,.2],pixelStretchLength:[0,1],sortLow:[0,1],sortHigh:[0,1],displaceAmount:[0,100],displaceSize:[4,200],glitchSize:[1,120],glitchAmount:[0,200],glitchCoverage:[0,1],glitchRGB:[0,40],blurLength:[0,100],blurAngle:[0,360],blurSamples:[2,24],threshold:[0,1],strength:[0,2],radius:[1,80],aberration:[0,40],angle:[0,360],radial:[0,80],halftoneSize:[2,40],halftoneAngle:[0,90],halftoneContrast:[.1,3],ditherLevels:[2,8],ditherAmount:[0,1],cutoffLevel:[0,1],posterizeLevels:[2,16],grainAmount:[0,1],grainSize:[1,8]};
 for(const [key,[min,max]] of Object.entries(effectBounds))if(effects[key]<min||effects[key]>max)throw new Error(`Invalid effect value: ${key}`);
 for(const key of ['pixelStretchAxis','sortAxis'])if(!['horizontal','vertical'].includes(effects[key]))throw new Error('Invalid effect direction.');
 if(!['brightness','hue'].includes(effects.sortMetric)||effects.sortLow>effects.sortHigh)throw new Error('Invalid sorting settings.');
 const bounds={density:[0,30],columns:[1,150],rows:[1,150],fill:[0,100],sectors:[2,32],sizeMin:[.01,10],sizeMax:[.01,10],opacityMin:[0,1],opacityMax:[0,1],echoCount:[1,12],echoScale:[.5,1.2],echoDistance:[0,1],echoOpacity:[0,1],padding:[0,4096],paddingLeft:[0,4096],paddingRight:[0,4096],paddingTop:[0,4096],paddingBottom:[0,4096]};
 for(const {settings,source} of p.layers){
  if(!settings||typeof settings!=='object'||(source!==null&&(!Number.isInteger(source)||source<0||source>=p.assets.length)))throw new Error('Invalid layer source.');
  const d=typedSettings(settings,createLayer(1,null));
  if(!Object.hasOwn(PRESETS,d.preset)||!['none','quarter','free'].includes(d.rotation)||!['solid','hue','gradient'].includes(d.colorMode)||!['normal','additive','multiply'].includes(d.objectBlend))throw new Error('Invalid layer mode.');
  for(const [key,[min,max]] of Object.entries(bounds))if(d[key]<min||d[key]>max)throw new Error(`Invalid layer value: ${key}`);
  for(const key of ['columns','rows','sectors','echoCount','seed'])if(!Number.isInteger(d[key]))throw new Error(`Expected an integer: ${key}`);
  for(const [a,b] of [['sizeMin','sizeMax'],['opacityMin','opacityMax'],['hueMin','hueMax']])if(d[a]>d[b])throw new Error(`Invalid range: ${a}`);
  if(settings.offsets)typedSettings(settings.offsets,createLayer(1,null).offsets);
 }
 for(const a of p.assets)if(!a||typeof a.name!=='string'||a.name.length>200||!(typeof a.libraryId==='string'&&/^(b1|y2k|fui|uav)\/\d+$/.test(a.libraryId)||typeof a.svg==='string'&&a.svg.length<=8_000_000))throw new Error('Invalid SVG source.');
 return p;
}
export async function restorePreset(p,{libraryAsset,parseAsset}){
 validatePreset(p);
 const assets=[];for(const a of p.assets)assets.push(a.libraryId?await libraryAsset(a.libraryId):await parseAsset(a.svg,a.name));
 const layers=p.layers.map(({settings,source},i)=>{
  const layer=typedSettings(settings,createLayer(i+1,source===null?null:assets[source]));
  layer.id=i+1;layer.asset=source===null?null:assets[source];layer.offsets=typedSettings(settings.offsets||{},createLayer(i+1,null).offsets);
  return layer;
 });
 // Check the entire candidate before replacing the current composition.
 compose(layers,p.canvas.width,p.canvas.height);
 return {...p.canvas,effects:typedSettings(p.effects,DEFAULT_EFFECTS),layers,selected:layers[0]?.id,nextId:layers.length+1};
}
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('scatter-composition-presets',1);r.onupgradeneeded=()=>r.result.createObjectStore('presets',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function localPresets(){const d=await db();try{return await new Promise((resolve,reject)=>{const r=d.transaction('presets').objectStore('presets').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{d.close()}}
export async function storePreset(p){const d=await db();try{await new Promise((resolve,reject)=>{const t=d.transaction('presets','readwrite');t.objectStore('presets').put(p);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}finally{d.close()}}
export function downloadPreset(p){const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${p.shapeSet.toUpperCase()} — ${p.name.replace(/[<>:"/\\|?*]/g,'_')}.scatter.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
