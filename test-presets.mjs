import assert from 'node:assert/strict';
import {createLayer,compose} from './dist/engine.js';
import {DEFAULT_EFFECTS,capturePreset,restorePreset,validatePreset} from './dist/composition-presets.js';
const builtin={id:'source1',libraryId:'b1/0',name:'b1.DiagonalStripes.svg',shapes:[{extent:50}]};
const imported={id:'source2',libraryId:'imported/abc',name:'My custom.svg',sourceText:'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="20"/></svg>',shapes:[{extent:20}]};
const a=createLayer(1,builtin),b=createLayer(2,imported),c=createLayer(3,imported),empty=createLayer(4,null);
Object.assign(a,{name:'Stripe <layer>',preset:'kaleidoscope',sectors:6,density:1.2,padding:30,paddingLeft:30,paddingRight:30,paddingTop:30,paddingBottom:30,colorMode:'gradient',echo:true,echoCount:3});
b.offsets.size=78;b.paddingIndividual=true;b.paddingLeft=120;c.visible=false;
const state={width:800,height:600,background:'#102030',blend:'multiply',exportScale:2,layers:[a,b,c,empty],effects:{...DEFAULT_EFFECTS,grain:true,grainSeed:99,chromatic:true,radial:12,pixelSort:true}};
const preset=JSON.parse(JSON.stringify(capturePreset(state,{id:'local:test',name:'Test preset',shapeSet:'b1'})));
assert.equal(preset.assets.length,2,'deduplicate shared SVG sources');
assert.deepEqual(preset.assets[0],{libraryId:'b1/0',name:builtin.name});
assert.equal(preset.assets[1].svg,imported.sourceText,'custom source must travel with the file');
let parses=0;
const result=await restorePreset(preset,{libraryAsset:async id=>{assert.equal(id,'b1/0');return builtin},parseAsset:async (text,name)=>{parses++;assert.equal(text,imported.sourceText);assert.equal(name,imported.name);return imported}});
assert.equal(parses,1);
assert.deepEqual(result.layers,state.layers,'restore every layer setting, hidden and empty layers, names, offsets and original order');
assert.deepEqual(result.effects,state.effects);assert.equal(result.exportScale,2);assert.equal(result.blend,'multiply');
assert.deepEqual(compose(result.layers,800,600),compose(state.layers,800,600),'round trip must reproduce placements exactly');
for(const change of [p=>p.version=99,p=>p.canvas.width=9000,p=>p.layers[0].source=7,p=>p.effects.strength=999999,p=>p.effects.halftoneSize=0,p=>p.layers[0].settings.sectors=1,p=>p.assets[0].libraryId='../../secret']){
 const invalid=structuredClone(preset);change(invalid);assert.throws(()=>validatePreset(invalid));
}
console.log('PASS: complete preset round trip, exact seeded placements, source deduplication, portable custom SVGs, hidden/empty layers and invalid-file validation.');
