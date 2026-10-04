import assert from 'node:assert/strict';
import {grainPixels} from './dist/effects.js';
const pixels=new Uint8ClampedArray(16*16*4);for(let i=0;i<pixels.length;i+=4)pixels.set([110,130,150,180],i);
const effects={grainAmount:.5,grainSize:2,grainSeed:46},out=grainPixels(pixels,16,16,effects);
assert.deepEqual(out,grainPixels(pixels,16,16,effects),'redraws must keep the same grain');
assert.notDeepEqual(out,grainPixels(pixels,16,16,{...effects,grainSeed:47}));
assert.deepEqual(grainPixels(pixels,16,16,{...effects,grainAmount:0}),pixels);
for(let y=0;y<16;y++)for(let x=0;x<16;x++){
 const i=(y*16+x)*4,cell=((y-y%2)*16+x-x%2)*4;
 assert.equal(out[i],out[cell]);assert.equal(out[i+3],pixels[i+3]);
 assert.equal(out[i]-pixels[i],out[i+1]-pixels[i+1]);assert.equal(out[i]-pixels[i],out[i+2]-pixels[i+2]);
}
const large=new Uint8ClampedArray(32*32*4);for(let i=0;i<large.length;i+=4)large.set([110,130,150,180],i);
const scaled=grainPixels(large,32,32,effects,2);
for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(out[(y*16+x)*4],scaled[(y*2*32+x*2)*4],'export scaling must preserve the pattern');
assert.deepEqual(grainPixels(pixels,16,16,{...effects,grainSize:1},2),out);
assert.equal(pixels[0],110,'source pixels must remain unchanged');
console.log('PASS: stable seeded grain, seed changes, zero amount, monochrome cells, alpha preservation, export scaling.');
