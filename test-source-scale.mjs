import assert from 'node:assert/strict';
import {createLayer,layerPlacements} from './dist/engine.js';
import {symbols} from './dist/svg-assets.js';
import {rasterResolution} from './dist/render.js';
const shapes=[20,100].map(width=>({width,height:10,extent:width*1.015,cx:width/2,cy:5,content:`<rect width="${width}" height="10"/>`,definitions:''}));
const asset={id:'scale_test_',shapes},layer={...createLayer(1,asset),preset:'grid',rows:10,columns:10,sizeMin:1,sizeMax:1,rotation:'none'};
const points=layerPlacements(layer,800,600);
assert.ok(points.some(p=>p.shape===0)&&points.some(p=>p.shape===1));
for(const p of points){assert.equal(p.matrix[0],1);assert.equal(p.matrix[3],1);assert.equal(shapes[p.shape].height*p.matrix[3],10,'equal source text heights must remain equal')}
const widths=shapes.map(s=>s.width);assert.equal(widths[1]/widths[0],5,'source width ratio must remain intact');
const markup=symbols(asset);assert.ok(markup.includes('translate(-10 -5)'));assert.ok(markup.includes('translate(-50 -5)'));assert.ok(!markup.includes('scale('),'vector symbols must never fit each source into a unit box');
const doubled=layerPlacements({...layer,sizeMin:2,sizeMax:2},800,600);for(const p of doubled){assert.equal(p.matrix[0],2);assert.equal(p.matrix[3],2)}
assert.equal(rasterResolution(shapes[0],2,1),64);assert.equal(rasterResolution(shapes[1],2,1),256);assert.equal(rasterResolution(shapes[1],2,2),448);
assert.equal(rasterResolution({extent:100000},10,4),4096,'mask resolution must remain bounded');
console.log('PASS: SVG source units, equal text height, original width ratio, 1×/2× scaling and export mask resolution.');
