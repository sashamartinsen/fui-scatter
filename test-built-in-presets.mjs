import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePreset} from './dist/composition-presets.js';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const manifest = await read('dist/presets/manifest.json');
const library = (await read('dist/shape-library/manifest.json')).flatMap(set => set.files);
assert.equal(manifest.length, 7);
assert.equal(new Set(manifest.map(p => p.id)).size, manifest.length);
for (const set of ['b1', 'y2k', 'fui', 'uav']) {
  assert.equal(manifest.filter(p => p.shapeSet === set && p.default).length, 1);
}
for (const entry of manifest) {
  const preset = validatePreset(await read('dist/' + entry.url));
  assert.equal(preset.name, entry.name);
  assert.equal(preset.shapeSet, entry.shapeSet);
  for (const asset of preset.assets) {
    const source = library.find(file => file.id === asset.libraryId);
    assert.ok(source, asset.libraryId);
    assert.equal(source.name, asset.name);
    await readFile('dist/' + source.url);
  }
  console.log(`PASS: ${entry.name}: ${preset.layers.length} layers, all SVG references valid.`);
}
