import {symbols,shapeSVG,svgImage} from './svg-assets.js?v=2';
import {chromaticPixels,grainPixels} from './effects.js';
import {vectorAsset} from './vector-effects.js';
import {rasterEffect} from './raster-effects.js';
import {crtPixels} from './crt-effect.js';
const cssBlend={normal:'normal',additive:'plus-lighter',multiply:'multiply'};
const canvasBlend={normal:'source-over',additive:'lighter',multiply:'multiply'};
const imageCache=new Map();
export function vectorMarkup(composition,state){
 composition=composition.map(c=>({...c,layer:{...c.layer,asset:vectorAsset(c.layer)}}));
 const assets=[...new Map(composition.map(c=>[c.layer.asset.id,c.layer.asset])).values()];
 let parts=[`<defs>${assets.map(symbols).join('')}</defs>`,`<rect width="${state.width}" height="${state.height}" fill="${state.background}"/>`];
 for(const {layer,placements} of composition){parts.push(`<g style="isolation:isolate;mix-blend-mode:${cssBlend[state.blend]}">`);for(const p of placements)parts.push(`<use href="#${layer.asset.id}s${p.shape}" transform="matrix(${p.matrix.join(' ')})" color="${p.color}" opacity="${p.opacity}" style="mix-blend-mode:${cssBlend[layer.objectBlend]}"/>`);parts.push('</g>')}
 return parts.join('');
}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
async function mask(asset,index,resolution){const shape=asset.shapes[index],key=`${asset.id}/${index}/${resolution}/${shape.content}/${shape.definitions}`;if(!imageCache.has(key)){imageCache.set(key,svgImage(shapeSVG(shape,'#ffffff',resolution)));if(imageCache.size>80)imageCache.delete(imageCache.keys().next().value)}return imageCache.get(key)}
export function rasterResolution(shape,multiplier,scale){return Math.min(4096,Math.max(64,Math.ceil(shape.extent*multiplier*scale/64)*64))}
export async function rasterComposition(composition,state,scale=1,cache=null){
 const w=Math.round(state.width*scale),h=Math.round(state.height*scale);
 if(w*h>24_000_000||w>8192||h>8192)throw new Error('Choose a smaller export scale (maximum 8192 px and 24 megapixels).');
 const result=canvas(w,h),ctx=result.getContext('2d',{willReadFrequently:true});ctx.fillStyle=state.background;ctx.fillRect(0,0,w,h);
 for(const {layer:original,placements} of composition){
  const {asset:source,name,id,visible,...settings}=original;
  const key=JSON.stringify([w,h,scale,source.id,settings]);
  let lc=cache?.get(original.id,key);
  if(!lc){
  const layer={...original,asset:vectorAsset(original)};
  lc=canvas(w,h);const lctx=lc.getContext('2d');
  const resolutions=layer.asset.shapes.map(shape=>rasterResolution(shape,layer.sizeMax,scale));
  const masks=[];await Promise.all([...new Set(placements.map(p=>p.shape))].map(async i=>masks[i]=await mask(layer.asset,i,resolutions[i])));
  const tint=canvas(64,64),tctx=tint.getContext('2d');let lastKey='';
  lctx.globalCompositeOperation=canvasBlend[layer.objectBlend];lctx.imageSmoothingQuality='high';
  for(const p of placements){const res=resolutions[p.shape],extent=layer.asset.shapes[p.shape].extent,key=p.shape+p.color;if(key!==lastKey){if(tint.width!==res)tint.width=tint.height=res;tctx.globalCompositeOperation='source-over';tctx.clearRect(0,0,res,res);tctx.drawImage(masks[p.shape],0,0,res,res);tctx.globalCompositeOperation='source-in';tctx.fillStyle=p.color;tctx.fillRect(0,0,res,res);lastKey=key}lctx.setTransform(...p.matrix.map(v=>v*scale));lctx.globalAlpha=p.opacity;lctx.drawImage(tint,-extent/2,-extent/2,extent,extent)}
  cache?.put(original.id,key,lc);
  }
  ctx.globalCompositeOperation=canvasBlend[state.blend];ctx.globalAlpha=1;ctx.drawImage(lc,0,0);if(!cache)lc.width=lc.height=1;
 }
 ctx.globalCompositeOperation='source-over';return result;
}
// Cache completed transparent layers; export deliberately rebuilds at its own resolution.
export function createPreviewRenderer(budget=96*1024*1024){
 const entries=new Map();let bytes=0,hits=0,misses=0;
 const cache={
  get(id,key){const entry=entries.get(id);if(entry?.key===key){entries.delete(id);entries.set(id,entry);hits++;return entry.canvas}misses++;return null},
  put(id,key,c){const old=entries.get(id);if(old){bytes-=old.bytes;entries.delete(id)}const size=c.width*c.height*4;if(size>budget)return;entries.set(id,{key,canvas:c,bytes:size});bytes+=size;while(bytes>budget){const first=entries.keys().next().value;bytes-=entries.get(first).bytes;entries.delete(first)}}
 };
 return {render:(composition,state,scale)=>rasterComposition(composition,state,scale,cache),stats:()=>({hits,misses,bytes,layers:entries.size}),clear(){entries.clear();bytes=0}};
}
export function postprocess(source,effects,scale=1){
 const w=source.width,h=source.height,ctx=source.getContext('2d',{willReadFrequently:true});
 const apply=name=>{if(!effects[name])return;const raw=ctx.getImageData(0,0,w,h);raw.data.set(rasterEffect(raw.data,w,h,name,effects,scale));ctx.putImageData(raw,0,0)};
 for(const name of ['pixelStretch','pixelSort','displace','glitch','blur'])apply(name);
 if(effects.bloom){
  const raw=ctx.getImageData(0,0,w,h),d=raw.data;
  for(let i=0;i<d.length;i+=4){const light=Math.max(d[i],d[i+1],d[i+2])/255,weight=Math.max(0,Math.min(1,(light-effects.threshold)/Math.max(.04,1-effects.threshold)));d[i+3]=Math.round(d[i+3]*weight)}
  const bright=canvas(w,h);bright.getContext('2d').putImageData(raw,0,0);ctx.globalCompositeOperation='lighter';
  function addGlow(strength,radius){ctx.filter=`blur(${Math.max(.1,radius)}px)`;for(let remaining=strength;remaining>0;remaining-=1){ctx.globalAlpha=Math.min(1,remaining);ctx.drawImage(bright,0,0)}}
  addGlow(effects.strength,effects.radius*scale);addGlow(effects.strength*.4,effects.radius*scale*2.5);
  ctx.filter='none';ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';bright.width=bright.height=1;
 }
 if(effects.chromatic&&(effects.aberration>0||effects.radial>0)){const original=ctx.getImageData(0,0,w,h),out=ctx.createImageData(w,h);out.data.set(chromaticPixels(original.data,w,h,effects,scale));ctx.putImageData(out,0,0)}
 for(const name of ['invert','hueShift'])apply(name);
 for(const name of ['halftone','dither','cutoff','posterize'])apply(name);
 if(effects.crt){const raw=ctx.getImageData(0,0,w,h);raw.data.set(crtPixels(raw.data,w,h,effects,scale));ctx.putImageData(raw,0,0)}
 if(effects.grain&&effects.grainAmount>0){const original=ctx.getImageData(0,0,w,h);original.data.set(grainPixels(original.data,w,h,effects,scale));ctx.putImageData(original,0,0)}
 return source;
}
