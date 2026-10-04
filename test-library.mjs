import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {library,libraryOptions} from './dist/shape-library.js';
const sets=JSON.parse(readFileSync('dist/shape-library/manifest.json','utf8'));
assert.deepEqual(sets.map(s=>[s.name,s.files.length]),[['B1',9],['Y2K',10],['FUI',3],['UAV',6]]);
const files=sets.flatMap(s=>s.files.map(f=>({...f,group:s.name})));assert.equal(new Set(files.map(f=>f.id)).size,28);
for(const file of files){assert.ok(file.url.startsWith('shape-library/'));assert.ok(readFileSync('dist/'+file.url,'utf8').includes('<svg'));assert.ok(file.name.endsWith('.svg'))}
library.files=files;assert.ok(libraryOptions('y2k/3').includes('value="y2k/3" selected>y2k.Japan.svg'));assert.ok(libraryOptions().includes('label="UAV"'));assert.equal((libraryOptions().match(/<option /g)||[]).length,29);
console.log('PASS: four complete shape sets, 28 unique SVG entries, served paths, original filenames and grouped library selection.');
