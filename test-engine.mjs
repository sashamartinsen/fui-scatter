import assert from 'node:assert/strict';
import {createLayer,layerPlacements,randomizeLayerSeeds} from './dist/engine.js';
const l=createLayer(1,{shapes:[{}, {}, {}]});l.density=2;l.sizeMin=20;l.sizeMax=60;l.opacityMin=.2;l.opacityMax=.9;
const first=layerPlacements(l,800,600);
assert.deepEqual(first,layerPlacements(l,800,600),'same seed must reproduce placements');
assert.equal(first.length,96);
const size=p=>Math.hypot(p.matrix[0],p.matrix[1]);
for(let i=0;i<first.length;i+=4){const [a,b,c,d]=first.slice(i,i+4);assert.equal(a.matrix[4],b.matrix[4]);assert.equal(a.matrix[5]+b.matrix[5],600);assert.equal(a.matrix[4]+c.matrix[4],800);assert.equal(a.color,d.color);assert.equal(a.opacity,d.opacity);assert.equal(a.shape,d.shape);assert.ok(Math.abs(a.matrix[0]-b.matrix[0])<1e-8);assert.ok(Math.abs(a.matrix[1]+b.matrix[1])<1e-8);assert.ok(Math.abs(a.matrix[0]+c.matrix[0])<1e-8);for(const copy of [b,c,d])assert.ok(Math.abs(size(a)-size(copy))<1e-8,'mirrored copies must inherit the original scale')}
for(const p of first)assert.ok(size(p)>=20&&size(p)<=60);
for(const shape of [0,1,2])assert.ok(new Set(first.filter(p=>p.shape===shape).map(size)).size>1,'each SVG shape should occur at different sizes');
for(const p of layerPlacements({...l,sizeMin:33,sizeMax:33},800,600))assert.ok(Math.abs(size(p)-33)<1e-8);
const resized=layerPlacements({...l,offsets:{...l.offsets,size:19}},800,600);
assert.deepEqual(first.map(p=>[p.shape,p.color,p.opacity,p.matrix.slice(4)]),resized.map(p=>[p.shape,p.color,p.opacity,p.matrix.slice(4)]),'size offset must not affect other channels');
assert.notDeepEqual(first.map(size),resized.map(size));
const seeds=[createLayer(1,null),createLayer(2,l.asset),createLayer(3,l.asset)];seeds[2].visible=false;
const before=seeds.map(({seed,...rest})=>structuredClone(rest));randomizeLayerSeeds(seeds,()=>46/2147483647);
assert.equal(new Set(seeds.map(l=>l.seed)).size,3);assert.ok(seeds.every(l=>l.seed!==46));assert.deepEqual(seeds.map(({seed,...rest})=>rest),before,'randomize all must preserve all non-seed settings');
const opacity=layerPlacements({...l,offsets:{...l.offsets,opacity:9}},800,600);
assert.deepEqual(first.map(({opacity,...p})=>p),opacity.map(({opacity,...p})=>p),'opacity offset must not affect geometry or color');
assert.notDeepEqual(first.map(p=>p.opacity),opacity.map(p=>p.opacity));
const color=layerPlacements({...l,colorMode:'hue',offsets:{...l.offsets,color:17}},800,600);
assert.deepEqual(first.map(p=>p.matrix),color.map(p=>p.matrix));
assert.notDeepEqual(first,layerPlacements({...l,seed:100},800,600));
const grid=layerPlacements({...l,preset:'grid',rows:7,columns:11,fill:100},800,600);assert.equal(grid.length,77);assert.equal(grid[0].matrix[4],800/22);assert.equal(grid[0].matrix[5],600/14);
assert.equal(layerPlacements({...l,preset:'grid',fill:0},800,600).length,0);
const kaleido=layerPlacements({...l,preset:'kaleidoscope',sectors:7},800,600);assert.equal(kaleido.length%14,0);for(const p of kaleido)assert.ok(Math.hypot(p.matrix[4]-400,p.matrix[5]-300)<=300+1e-8);
assert.equal(layerPlacements({...l,visible:false},800,600).length,0);
assert.throws(()=>layerPlacements({...l,density:1000},4096,4096),/Too many/);
assert.equal(createLayer(3,null).name,'Layer 3');
for(const rays of [3,4,6]){
 const points=layerPlacements({...l,preset:'kaleidoscope',sectors:rays},800,600);
 assert.ok(points.length>0);assert.equal(points.length%(2*rays),0);
 const angle=2*Math.PI/rays,c=Math.cos(angle),s=Math.sin(angle);
 for(let i=0;i<points.length;i+=2*rays){const a=points[i].matrix,b=points[i+2].matrix;assert.ok(Math.abs(b[4]-(400+c*(a[4]-400)-s*(a[5]-300)))<1e-8);assert.ok(Math.abs(b[5]-(300+s*(a[4]-400)+c*(a[5]-300)))<1e-8);for(const p of points.slice(i,i+2*rays))assert.ok(Math.abs(size(p)-size(points[i]))<1e-8,'all kaleidoscope copies must share the source scale')}
}
console.log('PASS: determinism, mirrored transforms, independent offsets, seed variation, grid count/fill, kaleidoscope radius, visibility, workload guard.');
