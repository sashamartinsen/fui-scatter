export const PRESETS={random:'Random',x:'Mirror X',y:'Mirror Y',both:'X + Y',kaleidoscope:'Kaleidoscope',grid:'Grid'};
export const DEFAULTS={preset:'both',seed:46,density:.36,columns:12,rows:12,fill:100,sectors:4,padding:0,paddingIndividual:false,paddingLeft:0,paddingRight:0,paddingTop:0,paddingBottom:0,sizeMin:.8,sizeMax:1.2,opacityMin:.7,opacityMax:1,rotation:'quarter',colorMode:'solid',color:'#a9ead4',color2:'#f77865',hueMin:-25,hueMax:25,objectBlend:'normal',visible:true,offsets:{position:0,shape:0,size:0,opacity:0,rotation:0,color:0}};
import {VECTOR_DEFAULTS} from './vector-effects.js';
export function createLayer(id,asset){return {...DEFAULTS,...VECTOR_DEFAULTS,id,name:`Layer ${id}`,asset,offsets:{...DEFAULTS.offsets}}}
export function randomizeLayerSeeds(layers,random=Math.random){
 const used=new Set(layers.map(l=>l.seed));
 for(const layer of layers){let seed=Math.floor(random()*2147483647);while(used.has(seed))seed=(seed+1)%2147483647;layer.seed=seed;used.add(seed)}
}
export function rng(seed,channel,offset=0){let h=2166136261;for(const c of `${seed}|${channel}|${offset}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const hex=a=>'#'+a.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
function hueShift(color,degrees){const [r,g,b]=rgb(color).map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=d===0?0:mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=((h*60+degrees)%360+360)%360;const l=(mx+mn)/2,s=d===0?0:d/(1-Math.abs(2*l-1)),c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h/60%2-1)),m=l-c/2;const p=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return hex(p.map(v=>(v+m)*255))}
export function layerPlacements(layer,canvasWidth,canvasHeight){
 if(!layer.visible||!layer.asset)return [];
 const inset=key=>Math.max(0,Number(layer[key])||0);
 const left=inset('paddingLeft'),top=inset('paddingTop');
 const w=canvasWidth-left-inset('paddingRight'),h=canvasHeight-top-inset('paddingBottom');
 if(w<=0||h<=0)return [];
 const rand=Object.fromEntries(['position','shape','size','opacity','rotation','color'].map(c=>[c,rng(layer.seed,c,layer.offsets[c])]));
 const bases=[];let count=0,area=w*h,repeat=1;
 if(layer.preset==='grid'){
  for(let row=0;row<layer.rows;row++)for(let col=0;col<layer.columns;col++)if(rand.position()*100<layer.fill)bases.push({x:(col+.5)*w/layer.columns,y:(row+.5)*h/layer.rows});
 }else{
  repeat=layer.preset==='both'?4:layer.preset==='x'||layer.preset==='y'?2:layer.preset==='kaleidoscope'?2*layer.sectors:1;
  if(layer.preset==='kaleidoscope')area=Math.PI*(Math.min(w,h)/2)**2;
  count=Math.round(area*layer.density/10000/repeat);
  if(count*repeat>24000)throw new Error('Too many objects in one layer. Reduce density or canvas size.');
  for(let i=0;i<count;i++){
   if(layer.preset==='kaleidoscope'){const r=Math.sqrt(rand.position())*Math.min(w,h)/2,a=rand.position()*Math.PI/layer.sectors;bases.push({x:Math.cos(a)*r,y:Math.sin(a)*r})}
   else bases.push({x:rand.position()*w/(layer.preset==='x'||layer.preset==='both'?2:1),y:rand.position()*h/(layer.preset==='y'||layer.preset==='both'?2:1)});
  }
 }
 const out=[];
 for(const p of bases){
  const shape=Math.floor(rand.shape()*layer.asset.shapes.length),size=lerp(layer.sizeMin,layer.sizeMax,rand.size()),opacity=lerp(layer.opacityMin,layer.opacityMax,rand.opacity());
  const rotation=layer.rotation==='none'?0:layer.rotation==='quarter'?Math.floor(rand.rotation()*4)*Math.PI/2:rand.rotation()*Math.PI*2;
  let color=layer.color;
  if(layer.colorMode==='hue')color=hueShift(color,lerp(layer.hueMin,layer.hueMax,rand.color()));
  if(layer.colorMode==='gradient'){const t=rand.color(),a=rgb(layer.color),b=rgb(layer.color2);color=hex(a.map((v,i)=>lerp(v,b[i],t)))}
  function push(x,y,angle,sx=1,sy=1){const c=Math.cos(angle),s=Math.sin(angle),cr=Math.cos(rotation),sr=Math.sin(rotation);out.push({shape,color,opacity,matrix:[size*(c*sx*cr-s*sy*sr),size*(s*sx*cr+c*sy*sr),size*(-c*sx*sr-s*sy*cr),size*(-s*sx*sr+c*sy*cr),x+left,y+top]})}
  if(layer.preset==='kaleidoscope'){
   for(let j=0;j<layer.sectors;j++){const a=j*2*Math.PI/layer.sectors,c=Math.cos(a),s=Math.sin(a);for(const sy of [1,-1])push(w/2+c*p.x-s*p.y*sy,h/2+s*p.x+c*p.y*sy,a,1,sy)}
  }else{
   for(const sx of layer.preset==='x'||layer.preset==='both'?[1,-1]:[1])for(const sy of layer.preset==='y'||layer.preset==='both'?[1,-1]:[1])push(sx===1?p.x:w-p.x,sy===1?p.y:h-p.y,0,sx,sy);
  }
 }
 return out;
}
// Preset dimensions always refer to the 1200 × 1200 composition space.
export const BASE_SIZE=1200;
export function canvasScale(w,h){return Math.min(w,h)/BASE_SIZE}
export function compose(layers,w,h){
 const sx=w/BASE_SIZE,sy=h/BASE_SIZE,size=canvasScale(w,h);
 return layers.filter(l=>l.visible&&l.asset).map(l=>({layer:l,placements:layerPlacements(l,BASE_SIZE,BASE_SIZE).map(p=>({...p,matrix:p.matrix.map((v,i)=>v*(i===4?sx:i===5?sy:size))}))}));
}
