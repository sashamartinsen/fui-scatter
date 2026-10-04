import assert from 'node:assert/strict';
import {RASTER_DEFAULTS as defaults,rasterEffect} from './dist/raster-effects.js';
import {VECTOR_DEFAULTS,vectorAsset,deformShape} from './dist/vector-effects.js';
import {createLayer,layerPlacements} from './dist/engine.js';
const w=16,h=12,d=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=(y*w+x)*4;d[i]=(x*83+y*37)%256;d[i+1]=(x*17+y*61)%256;d[i+2]=(x*53+y*13)%256;d[i+3]=255}
const e={...defaults,glitchCoverage:1,glitchSize:3,glitchAmount:3},before=new Uint8ClampedArray(d);
for(const name of ['pixelStretch','pixelSort','displace','glitch','halftone','dither','cutoff','posterize','blur']){
 const out=rasterEffect(d,w,h,name,e);assert.equal(out.length,d.length);assert.deepEqual(out,rasterEffect(d,w,h,name,e));assert.notDeepEqual(out,d,name+' changes pixels');assert.deepEqual(d,before,'source remains immutable');for(let i=3;i<out.length;i+=4)assert.equal(out[i],255,name+' opaque output');
}
assert.deepEqual(rasterEffect(d,w,h,'displace',{...e,displaceAmount:0}),d);
assert.deepEqual(rasterEffect(d,w,h,'blur',{...e,blurLength:0}),d);
assert.deepEqual(rasterEffect(d,w,h,'glitch',{...e,glitchCoverage:0}),d);
assert.deepEqual(rasterEffect(d,w,h,'pixelStretch',{...e,pixelStretchLength:0}),d);
assert.notDeepEqual(rasterEffect(d,w,h,'displace',e),rasterEffect(d,w,h,'displace',{...e,displaceSeed:47}));
const gray=new Uint8ClampedArray([200,200,200,255,40,40,40,255,130,130,130,255,0,0,0,255]);
const sorted=rasterEffect(gray,4,1,'pixelSort',{...e,sortLow:.1,sortHigh:1});assert.deepEqual([...sorted.filter((_,i)=>i%4===0)],[40,130,200,0]);
const shape={width:100,height:20,extent:101.5,cx:50,cy:10,viewBox:'-0.75 -40.75 101.5 101.5',content:'<rect x="0" y="0" width="100" height="20"/>',definitions:''},asset={id:'test',shapes:[shape]},l=createLayer(1,asset);
assert.deepEqual(Object.fromEntries(Object.keys(VECTOR_DEFAULTS).map(k=>[k,l[k]])),VECTOR_DEFAULTS);assert.equal(vectorAsset(l),asset);
const active={...l,echo:true};const result=deformShape(shape,active);assert.equal(result.cx,0);assert.ok(result.extent>shape.extent);assert.ok(!result.definitions.includes('clipPath'));assert.ok(!result.content.includes('clip-path'));assert.ok(result.definitions.includes('translate(-50 -10)'));assert.deepEqual(result,deformShape(shape,active));assert.deepEqual(result,deformShape(shape,{...active,seed:47}));assert.notDeepEqual(result,deformShape(shape,{...active,echoDistance:.3}));assert.equal(vectorAsset({...l,stretch:true,sliceOffset:true}),asset);
const p=layerPlacements(active,1200,1200);for(let i=0;i<p.length;i+=4)for(let j=1;j<4;j++)assert.equal(Math.hypot(...p[i].matrix.slice(0,2)),Math.hypot(...p[i+j].matrix.slice(0,2)));
console.log('New effects: deterministic operators, thresholds, alpha, source units and mirror families verified.');
