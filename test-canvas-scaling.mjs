import assert from 'node:assert/strict';
import {BASE_SIZE,canvasScale,compose,createLayer,layerPlacements,PRESETS} from './dist/engine.js';
import {rasterResolution} from './dist/render.js';
const asset={id:'resize',shapes:[{extent:180},{extent:60}]};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const preset of Object.keys(PRESETS)){
 const layer={...createLayer(1,asset),preset,padding:300,paddingLeft:300,paddingRight:300,paddingTop:300,paddingBottom:300,echo:true,sectors:6};
 const saved=JSON.stringify(layer),base=compose([layer],1200,1200)[0].placements;
 assert.deepEqual(base,layerPlacements(layer,1200,1200),'1200 presets retain exact original placements');
 assert.ok(base.length>0);
 for(const [w,h] of [[800,800],[2400,2400],[1600,900],[800,1200]]){
  const scaled=compose([layer],w,h)[0].placements;
  assert.equal(scaled.length,base.length,'density must retain the same number of placements');
  scaled.forEach((p,i)=>{
   const original=base[i];assert.equal(p.shape,original.shape);assert.equal(p.color,original.color);assert.equal(p.opacity,original.opacity);
   close(p.matrix[4]/w,original.matrix[4]/1200);close(p.matrix[5]/h,original.matrix[5]/1200);
   for(let j=0;j<4;j++)close(p.matrix[j]/canvasScale(w,h),original.matrix[j]);
  });
 }
 assert.equal(JSON.stringify(layer),saved,'resizing must never change preset parameters');
}
assert.equal(BASE_SIZE,1200);
assert.equal(canvasScale(800,800),2/3);
assert.equal(rasterResolution({extent:180},2,canvasScale(2400,2400)),768,'enlarged canvas requires a sharper source mask');
console.log('PASS: all distributions preserve count, seeded attributes, normalized positions, uniform shape scale, exact 1200 appearance and preset parameters.');
