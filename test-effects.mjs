import assert from 'node:assert/strict';
import {chromaticPixels} from './dist/effects.js';
const width=9,height=9,pixels=new Uint8ClampedArray(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;pixels.set([x*20,y*20,x*20,255],i)}
const index=(x,y)=>(y*width+x)*4;
assert.deepEqual(chromaticPixels(pixels,width,height,{aberration:0,radial:0}),pixels);
const directional=chromaticPixels(pixels,width,height,{aberration:1,radial:0,angle:0});
assert.equal(directional[index(4,4)],60);assert.equal(directional[index(4,4)+2],100);
const vertical=chromaticPixels(pixels,width,height,{aberration:1,radial:0,angle:90});
assert.equal(vertical[index(4,4)],80);
const radial=chromaticPixels(pixels,width,height,{aberration:0,radial:2});
assert.equal(radial[index(4,4)],80);assert.equal(radial[index(4,4)+2],80,'center must remain stationary');
assert.ok(radial[index(7,4)]<pixels[index(7,4)]);assert.ok(radial[index(7,4)+2]>pixels[index(7,4)+2]);
assert.ok(radial[index(1,4)]>pixels[index(1,4)]);assert.ok(radial[index(1,4)+2]<pixels[index(1,4)+2]);
for(let i=0;i<pixels.length;i+=4){assert.equal(radial[i+1],pixels[i+1]);assert.equal(radial[i+3],pixels[i+3])}
assert.deepEqual(chromaticPixels(pixels,width,height,{aberration:1,radial:1,angle:30},2),chromaticPixels(pixels,width,height,{aberration:2,radial:2,angle:30}));
assert.ok(chromaticPixels(pixels,9,9,{aberration:0,radial:.3})[index(7,4)]!==pixels[index(7,4)],'fractional offsets must be sampled');
console.log('PASS: directional/radial offsets, stationary center, opposite channels, export scaling, subpixel sampling, green/alpha preservation.');
