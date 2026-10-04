import assert from 'node:assert/strict';
import {createLayer,layerPlacements} from './dist/engine.js';
const l=createLayer(1,{shapes:[{},{}]});
const inset={paddingLeft:100,paddingRight:200,paddingTop:50,paddingBottom:150};
const scale=p=>Math.hypot(p.matrix[0],p.matrix[1]);
for(const preset of ['random','x','y','both','grid','kaleidoscope']){
 const layer={...l,preset,sectors:3,density:4,rows:3,columns:4};
 const legacy={...layer};for(const key of Object.keys(inset))delete legacy[key];
 assert.deepEqual(layerPlacements(layer,800,600),layerPlacements(legacy,800,600),'zero padding preserves previous composition');
 const padded=layerPlacements({...layer,...inset},800,600);
 const local=layerPlacements(layer,500,400);
 assert.ok(padded.length>0);
 assert.deepEqual(padded,local.map(p=>({...p,matrix:[...p.matrix.slice(0,4),p.matrix[4]+100,p.matrix[5]+50]})),'padding only translates inset-area placements, preserving every copy and scale');
 for(const p of padded){assert.ok(p.matrix[4]>=100-1e-8&&p.matrix[4]<=600+1e-8);assert.ok(p.matrix[5]>=50-1e-8&&p.matrix[5]<=450+1e-8)}
 assert.deepEqual(layerPlacements({...layer,paddingLeft:800},800,600),[]);
 assert.deepEqual(layerPlacements({...layer,paddingTop:500,paddingBottom:150},800,600),[]);
 if(preset==='both')for(let i=0;i<padded.length;i+=4){const[a,b,c,d]=padded.slice(i,i+4);assert.equal(a.matrix[4]+c.matrix[4],700);assert.equal(a.matrix[5]+b.matrix[5],500);for(const p of[b,c,d])assert.ok(Math.abs(scale(p)-scale(a))<1e-8)}
}
const grid=layerPlacements({...l,...inset,preset:'grid',columns:2,rows:2},800,600);
assert.deepEqual(grid.map(p=>p.matrix.slice(4)),[[225,150],[475,150],[225,350],[475,350]]);
assert.equal(layerPlacements({...l,...inset,preset:'random',density:2},800,600).length,40,'density uses the remaining area');
console.log('PASS: four independent edge paddings, all presets, zero compatibility, inset density, grid centers, mirror scales and exhausted area.');
