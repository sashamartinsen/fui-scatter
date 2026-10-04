import {PRESETS,DEFAULTS,createLayer,compose,randomizeLayerSeeds} from './engine.js';
import {parseAsset,escape} from './svg-assets.js';
import {rasterComposition,postprocess,createPreviewRenderer} from './render.js';
import {DEFAULT_EFFECTS,capturePreset,validatePreset,restorePreset,localPresets,storePreset,downloadPreset} from './composition-presets.js';
import {vectorControls,rasterControls} from './fx-panels.js';
import {library,initializeLibrary,libraryAsset,importLibraryFile,libraryOptions} from './shape-library.js?v=2';
const $=s=>document.querySelector(s);
const state={width:1200,height:1200,background:'#0d1619',blend:'normal',selected:1,nextId:4,tab:'vector',zoom:1,exportScale:1,layers:[],effects:{...DEFAULT_EFFECTS}};
let composition=[],revision=0,timer,toastTimer,fileLayerId,previewScene,previewKey,libraryBusy=false,compositionKey;
const previewRenderer=createPreviewRenderer();
let savedPresets=[],builtInPresets=[],selectedPreset='';
let presetDefaults={};try{presetDefaults=JSON.parse(localStorage.getItem('scatter-preset-defaults')||'{}')}catch{}
const current=()=>state.layers.find(l=>l.id===state.selected);
const input=(key,value,options='')=>`<input type="number" data-key="${key}" value="${value}" ${options}>`;
const select=(key,value,options)=>`<select data-key="${key}">${options.map(([v,label])=>`<option value="${v}" ${v===value?'selected':''}>${label}</option>`).join('')}</select>`;
const number=(label,key,value,options)=>`<label>${label}${input(key,value,options)}</label>`;
const modes=[['normal','Normal'],['additive','Additive'],['multiply','Multiply']];

function dualRange(label,lowKey,highKey,low,high,min,max,step){
 const percent=v=>(v-min)/(max-min)*100;
 return `<div class="range-field" data-low="${lowKey}" data-high="${highKey}" role="group" aria-label="${label} range"><div class="range-heading">${label}<span>Min — Max</span></div><div class="pair"><label>Min${input(lowKey,low,`aria-label="${label} minimum" min="${min}" max="${max}" step="${step}"`)}</label><label>Max${input(highKey,high,`aria-label="${label} maximum" min="${min}" max="${max}" step="${step}"`)}</label></div><div class="dual-range" style="--low:${percent(low)}%;--high:${percent(high)}%"><input type="range" aria-label="${label} minimum slider" data-key="${lowKey}" min="${min}" max="${max}" step="${step}" value="${low}"><input type="range" aria-label="${label} maximum slider" data-key="${highKey}" min="${min}" max="${max}" step="${step}" value="${high}"></div><div class="range-limits"><span>${min}</span><span>${max}</span></div></div>`;
}
function syncRanges(){
 const l=current();if(!l)return;
 for(const field of document.querySelectorAll('.range-field')){
  const track=field.querySelector('.dual-range'),slider=track.querySelector('input'),min=+slider.min,max=+slider.max;
  track.style.setProperty('--low',(l[field.dataset.low]-min)/(max-min)*100+'%');track.style.setProperty('--high',(l[field.dataset.high]-min)/(max-min)*100+'%');
 }
}
function range(label,key,value,min,max,step=1,scope='layer'){return `<div><div class="field-top"><label for="${scope}-${key}">${label}</label><input class="value-input" aria-label="${label}: exact value" type="number" data-value="${key}" data-key="${key}" data-scope="${scope}" min="${min}" max="${max}" step="${step}" value="${value}"></div><input id="${scope}-${key}" type="range" data-key="${key}" data-scope="${scope}" min="${min}" max="${max}" step="${step}" value="${value}"></div>`}
function offsets(names){const l=current();return `<details><summary>Seed offsets</summary>${names.map(([key,label])=>`<label class="offset">${label}<input type="number" data-offset="${key}" min="-2147483647" max="2147483647" step="1" value="${l.offsets[key]}"></label>`).join('')}</details>`}
function notify(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,5500)}
function paintLayers(){
 $('#layer-count').textContent=state.layers.length;
 $('#randomize-all').disabled=state.layers.length===0;
 $('#layers').innerHTML=[...state.layers].reverse().map(l=>`<div class="layer ${l.id===state.selected?'selected':''} ${!l.visible?'off':''}" data-id="${l.id}" tabindex="0" role="button" aria-label="Select ${escape(l.name)}" aria-pressed="${l.id===state.selected}"><span class="layer-swatch" style="color:${l.color};background:${l.color}15">${l.preset==='grid'?'▦':l.preset==='kaleidoscope'?'✳':'✣'}</span><div class="layer-copy"><strong>${escape(l.name)}</strong><small>${escape(l.asset?.name||'Upload SVG')}</small></div><button class="visibility" data-action="visibility" aria-label="${l.visible?'Hide':'Show'} ${escape(l.name)}">${l.visible?'◉':'○'}</button><div class="layer-actions"><button data-action="up" aria-label="Move ${escape(l.name)} up" ${state.layers.indexOf(l)===state.layers.length-1?'disabled':''}>↑</button><button data-action="down" aria-label="Move ${escape(l.name)} down" ${state.layers.indexOf(l)===0?'disabled':''}>↓</button><button data-action="duplicate" aria-label="Duplicate ${escape(l.name)}">Duplicate</button></div></div>`).join('');
}
function paintInspector(){
 $('#vector-tab').classList.toggle('active',state.tab==='vector');$('#effects-tab').classList.toggle('active',state.tab==='effects');
 $('#inspector-title').textContent=state.tab==='effects'?'POST PROCESSING':'LAYER SETTINGS';
 const l=current();$('#selected-index').textContent=state.tab==='effects'?'FX':String(state.layers.indexOf(l)+1).padStart(2,'0');
 if(state.tab==='effects'){
  const e=state.effects;$('#inspector').innerHTML=rasterControls(e,range)+`<section class="inspector-section"><div class="section-title">EXPORT</div><label>Scale<select id="export-scale">${[1,2,4].map(v=>`<option value="${v}" ${state.exportScale===v?'selected':''}>${v}× · ${state.width*v} × ${state.height*v} px</option>`).join('')}</select></label><button class="primary full" data-action="export">Download PNG</button><p class="hint">PNG includes all active vector and raster effects, in panel order.</p></section>`;return;
 }
 if(!l){$('#inspector').innerHTML='<section class="inspector-section"><p class="hint">Add a layer and upload an SVG.</p></section>';return}
 const source=l.asset;
 const presets=[['random','⁙','Random'],['x','↔','Mirror X'],['y','↕','Mirror Y'],['both','✣','X + Y'],['kaleidoscope','✳','Kaleidoscope'],['grid','▦','Grid']];
 let placement=l.preset==='grid'?`<div class="pair">${number('Columns','columns',l.columns,'min="1" max="150" step="1"')}${number('Rows','rows',l.rows,'min="1" max="150" step="1"')}</div>${range('Fill, %','fill',l.fill,0,100,1)}`:`${range('Density / 10,000 px²','density',l.density,0,30,.01)}`;
 if(l.preset==='kaleidoscope')placement+=range('Rays','sectors',l.sectors,2,32,1);
 placement+=`<div class="padding-controls" title="Insets apply to object centers. Mirrors use the inset area's center.">${l.paddingIndividual?'<span class="padding-heading">Edge padding, px</span>':`<label class="padding-global">Edge padding, px${input('padding',l.padding??0,`min="0" max="${Math.min(state.width,state.height)}" step="1"`)}</label>`}<label class="padding-toggle"><input type="checkbox" data-key="paddingIndividual" ${l.paddingIndividual?'checked':''}>Set individually</label>${l.paddingIndividual?[['Left','paddingLeft',state.width],['Right','paddingRight',state.width],['Top','paddingTop',state.height],['Bottom','paddingBottom',state.height]].map(([label,key,max])=>number(label,key,l[key],`min="0" max="${max}" step="1"`)).join(''):''}</div>`;
 const colorSpecific=l.colorMode==='hue'?`<div class="pair">${number('Hue min, °','hueMin',l.hueMin,'min="-180" max="180" step="1"')}${number('Hue max, °','hueMax',l.hueMax,'min="-180" max="180" step="1"')}</div>`:l.colorMode==='gradient'?`<label class="color-label">Second color<input type="color" data-key="color2" value="${l.color2}"><span>${l.color2.toUpperCase()}</span></label><p class="hint">Each object receives a random color between the two selected colors.</p>`:'';
 $('#inspector').innerHTML=`<section class="inspector-section"><label>Layer name<input type="text" data-key="name" maxlength="70" value="${escape(l.name)}"></label><div class="source-box"><span class="source-icon">◇</span><div><strong>${escape(source?.name||'No SVG selected')}</strong><small>${source?'Object groups: '+source.shapes.length:'One object group = one shape'}</small></div></div><label>SVG from library<select id="layer-library">${libraryOptions(source?.libraryId)}</select></label><button class="full" data-action="import">${source?'Replace SVG':'Import SVG'}</button></section><section class="inspector-section"><div class="section-title">DISTRIBUTION</div><div class="preset-options">${presets.map(([key,icon,label])=>`<button data-preset="${key}" class="${l.preset===key?'active':''}" aria-pressed="${l.preset===key}"><span>${icon}</span>${label}</button>`).join('')}</div><label>Global seed<div class="seed-row">${input('seed',l.seed,'min="-2147483647" max="2147483647" step="1"')}<button data-action="seed" aria-label="New seed">⟳</button></div></label>${placement}${offsets([['position','Position / fill'],['shape','Shape selection']])}</section><section class="inspector-section"><div class="section-title">SIZE & ROTATION</div>${dualRange('Size multiplier, ×','sizeMin','sizeMax',l.sizeMin,l.sizeMax,.01,10,.01)}<p class="hint">1× = original SVG size. Mirror copies share the same scale.</p><label>Rotation${select('rotation',l.rotation,[['none','No rotation'],['quarter','0° / 90° / 180° / 270°'],['free','Free 0–360°']])}</label>${offsets([['size','Size'],['rotation','Rotation']])}</section><section class="inspector-section"><div class="section-title">COLOR</div><label>Mode${select('colorMode',l.colorMode,[['solid','Solid'],['hue','Hue offset range'],['gradient','2 color gradient']])}</label><label class="color-label">Primary color<input type="color" data-key="color" value="${l.color}"><span>${l.color.toUpperCase()}</span></label>${colorSpecific}${offsets([['color','Color']])}</section><section class="inspector-section"><div class="section-title">OPACITY & BLENDING</div>${dualRange('Opacity','opacityMin','opacityMax',l.opacityMin,l.opacityMax,0,1,.01)}<label>Objects within layer${select('objectBlend',l.objectBlend,modes)}</label>${offsets([['opacity','Opacity']])}</section>${vectorControls(l,range)}<section class="inspector-section"><button data-action="delete" class="danger full">Delete layer</button></section>`;
}
function fit(){const wrap=$('#stage-wrap'),padding=getComputedStyle(wrap),availableW=Math.max(120,wrap.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight)-2),availableH=Math.max(120,wrap.clientHeight-parseFloat(padding.paddingTop)-parseFloat(padding.paddingBottom)-2),factor=Math.min(availableW/state.width,availableH/state.height)*state.zoom;$('#stage').style.width=state.width*factor+'px';$('#stage').style.height=state.height*factor+'px';$('#zoom-label').textContent=state.zoom===1?'Fit':Math.round(state.zoom*100)+'%'}
async function render(){
 const ticket=++revision;
 try{
  const settingsKey=JSON.stringify([state.width,state.height,state.layers.map(({asset,...settings})=>({...settings,asset:asset?.id}))]);
  if(settingsKey!==compositionKey){composition=compose(state.layers,state.width,state.height);compositionKey=settingsKey}
  const count=composition.reduce((a,c)=>a+c.placements.length,0);$('#object-count').textContent=count.toLocaleString('en')+' objects';$('#canvas-info').textContent=`${state.width} × ${state.height}`;
  $('#render-info').textContent='Canvas preview';fit();
  $('#rendering').hidden=false;const scale=Math.min(1,1400/Math.max(state.width,state.height));
  const key=JSON.stringify([settingsKey,state.background,state.blend,scale]);
  if(key!==previewKey){const base=await previewRenderer.render(composition,state,scale);if(ticket!==revision)return;previewScene=base;previewKey=key}
  const scene=document.createElement('canvas');scene.width=previewScene.width;scene.height=previewScene.height;scene.getContext('2d').drawImage(previewScene,0,0);postprocess(scene,state.effects,scale);
  if(ticket!==revision)return;const target=$('#raster-preview');target.width=scene.width;target.height=scene.height;target.getContext('2d').drawImage(scene,0,0);
 }catch(e){notify(e.message)}finally{if(ticket===revision)$('#rendering').hidden=true}
}
function schedule(){clearTimeout(timer);timer=setTimeout(render,70)}
function refresh(){paintLayers();paintInspector();libraryButtons();schedule()}
function paintLibrary(){
 const set=$('#shape-set'),setValue=set.value;
 set.innerHTML='<option value="">Custom composition</option>'+library.sets.map(s=>`<option value="${s.id}">${escape(s.name)} · ${s.files.length} SVGs</option>`).join('');set.value=setValue;
 paintPresetList();libraryButtons();
}
function libraryButtons(){
 $('#shape-set').disabled=libraryBusy;$('#composition-preset').disabled=libraryBusy;
 $('#append-set').disabled=libraryBusy||!$('#shape-set').value;
 $('#save-preset').disabled=libraryBusy;$('#import-preset').disabled=libraryBusy;
 $('#update-preset').disabled=libraryBusy||!savedPresets.some(p=>p.id===selectedPreset);
 $('#default-preset').disabled=libraryBusy||!$('#shape-set').value;
 $('#library-status').textContent=libraryBusy?'Loading composition…':`${library.files.length} SVG files · presets stored locally`;
}
function paintPresetList(){
 const set=$('#shape-set').value||'custom',select=$('#composition-preset');
 const defaultId=presetDefaults[set]??builtInPresets.find(p=>p.shapeSet===set&&p.default)?.id;
 const group=(name,items)=>items.length?`<optgroup label="${name}">${items.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}${defaultId===p.id?' · default':''}</option>`).join('')}</optgroup>`:'';
 select.innerHTML='<option value="">Standard'+(presetDefaults[set]===''?' · default':'')+'</option>'+group('Built-in',builtInPresets.filter(p=>p.shapeSet===set))+group('Local',savedPresets.filter(p=>p.shapeSet===set));
 select.value=selectedPreset;libraryButtons();
}
async function initializePresets(){
 try{savedPresets=await localPresets()}catch{notify('Preset files work; local preset storage is unavailable.')}
 const response=await fetch('presets/manifest.json',{cache:'no-store'});if(!response.ok)throw new Error('Could not load built-in presets.');
 builtInPresets=(await response.json()).map(p=>({...p,id:'builtin:'+p.id}));paintPresetList();
}
async function applyPreset(id){
 if(libraryBusy)return;
 const local=savedPresets.find(p=>p.id===id),built=builtInPresets.find(p=>p.id===id);if(!local&&!built)return;
 libraryBusy=true;libraryButtons();
 try{
  let preset=local;if(!preset){const response=await fetch(built.url);if(!response.ok)throw new Error('Could not load preset.');preset=await response.json()}
  const next=await restorePreset(preset,{libraryAsset,parseAsset});
  Object.assign(state,next,{tab:'vector',zoom:1});selectedPreset=id;
  $('#shape-set').value=preset.shapeSet==='custom'?'':preset.shapeSet;
  syncCanvasControls();paintPresetList();refresh();notify(`Loaded: ${preset.name}`);
 }catch(e){notify(e.message)}finally{libraryBusy=false;libraryButtons()}
}
function syncCanvasControls(){for(const key of ['width','height','background'])$('#'+key).value=state[key];$('#background-hex').textContent=state.background.toUpperCase();$('#canvas-blend').value=state.blend}
function openPresetSave(){const existing=[...savedPresets,...builtInPresets].find(p=>p.id===selectedPreset);$('#preset-name').value=existing?existing.name+' copy':'';$('#preset-dialog').showModal();$('#preset-name').focus()}
async function saveCurrentPreset(update=false){
 const existing=savedPresets.find(p=>p.id===selectedPreset);
 const name=update?existing?.name:$('#preset-name').value.trim();if(!name)return;
 const preset=capturePreset(state,{id:update?existing.id:'local:'+crypto.randomUUID(),name,shapeSet:$('#shape-set').value||'custom'});
 let stored=true;try{await storePreset(preset)}catch{stored=false}
 savedPresets=savedPresets.filter(p=>p.id!==preset.id);savedPresets.push(preset);selectedPreset=preset.id;paintPresetList();downloadPreset(preset);$('#preset-dialog').close();notify(stored?'Preset saved locally and downloaded.':'Preset downloaded. Browser storage unavailable.');
}
$('#save-preset').onclick=openPresetSave;$('#update-preset').onclick=()=>saveCurrentPreset(true).catch(e=>notify(e.message));
$('#preset-cancel').onclick=()=>$('#preset-dialog').close();$('#preset-form').onsubmit=e=>{e.preventDefault();saveCurrentPreset().catch(e=>notify(e.message))};
$('#import-preset').onclick=()=>{$('#preset-file').value='';$('#preset-file').click()};
$('#preset-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>32_000_000)throw new Error('Preset file must be smaller than 32 MB.');
  const p=validatePreset(JSON.parse(await file.text()));if(p.shapeSet!=='custom'&&!library.sets.some(s=>s.id===p.shapeSet))throw new Error('Unknown shape set.');
  // Resolve every SVG before storing or replacing anything.
  await restorePreset(p,{libraryAsset,parseAsset});
  p.id=typeof p.id==='string'&&p.id.startsWith('local:')&&p.id.length<100?p.id:'local:'+crypto.randomUUID();
  let stored=true;try{await storePreset(p)}catch{stored=false}
  savedPresets=savedPresets.filter(x=>x.id!==p.id);savedPresets.push(p);await applyPreset(p.id);if(!stored)notify('Preset loaded for this session. Browser storage unavailable.');
 }catch(e){notify('Could not import preset: '+e.message)}
};
$('#composition-preset').onchange=e=>{if(e.target.value)applyPreset(e.target.value);else{selectedPreset='';if($('#shape-set').value)loadShapeSet($('#shape-set').value);else paintPresetList()}};
$('#default-preset').onclick=async()=>{
 if(libraryBusy)return;const set=$('#shape-set').value;if(!set)return;
 libraryBusy=true;libraryButtons();
 try{
  const existing=savedPresets.find(p=>p.id===selectedPreset);
  const title=existing?.name||builtInPresets.find(p=>p.id===selectedPreset)?.name||((library.sets.find(s=>s.id===set)?.name||set)+' default');
  const preset=capturePreset(state,{id:existing?.id||'local:'+crypto.randomUUID(),name:title,shapeSet:set});
  await storePreset(preset);
  const defaults={...presetDefaults,[set]:preset.id};localStorage.setItem('scatter-preset-defaults',JSON.stringify(defaults));
  presetDefaults=defaults;savedPresets=savedPresets.filter(p=>p.id!==preset.id);savedPresets.push(preset);selectedPreset=preset.id;
  paintPresetList();notify('Current composition saved as default for this shape set.');
 }catch(e){notify('Could not save default: '+e.message)}finally{libraryBusy=false;libraryButtons()}
};
async function selectShapeSet(id){
 selectedPreset='';paintPresetList();
 const fallback=builtInPresets.find(p=>p.shapeSet===id&&p.default)?.id,preferred=presetDefaults[id]??fallback;
 if(preferred&&[...savedPresets,...builtInPresets].some(p=>p.id===preferred))await applyPreset(preferred);else if(id)await loadShapeSet(id);
}

async function useLibrary(id,add){
 if(libraryBusy)return;const target=current();libraryBusy=true;libraryButtons();
 try{const asset=await libraryAsset(id);if(add){const layer=createLayer(state.nextId++,asset);state.layers.push(layer);state.selected=layer.id}else if(target&&state.layers.includes(target)){target.asset=asset;state.selected=target.id}else throw new Error('Select a layer first.');state.tab='vector';refresh();notify(asset.name)}catch(e){notify(e.message)}finally{libraryBusy=false;libraryButtons()}
}
async function loadShapeSet(id,append=false){
 const set=library.sets.find(s=>s.id===id);if(!set||libraryBusy)return;libraryBusy=true;libraryButtons();
 try{
  // Parse the entire set before touching the existing composition.
  const assets=[];for(const file of set.files)assets.push(await libraryAsset(file.id));
  const first=append?state.nextId:1,palette={b1:['#ff343d','#ff9c32'],y2k:['#70ed42','#20dccc'],fui:['#3263ff','#45d8ff'],uav:['#9755ff','#ff6cae']}[id];
  const endpoints=palette.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  const layerColor=i=>'#'+endpoints[0].map((v,c)=>Math.round(v+(endpoints[1][c]-v)*(assets.length>1?i/(assets.length-1):0)).toString(16).padStart(2,'0')).join('');
  const layers=assets.map((asset,i)=>{const layer=createLayer(first+i,asset);Object.assign(layer,{density:Number(Math.min(DEFAULTS.density,.6/assets.length).toFixed(4)),seed:46+i*101,color:layerColor(i)});return layer});
  if(!append){Object.assign(state,{width:1200,height:1200,background:'#0d1619',blend:'normal',exportScale:1,effects:{...DEFAULT_EFFECTS}});selectedPreset='';syncCanvasControls();paintPresetList()}
  state.layers=append?[...state.layers,...layers]:layers;state.nextId=first+layers.length;state.selected=layers[0]?.id;state.tab='vector';refresh();notify(`${set.name}: ${layers.length} SVG layers ${append?'added':'loaded'}`);
 }catch(e){notify(e.message)}finally{libraryBusy=false;libraryButtons()}
}
$('#shape-set').onchange=e=>selectShapeSet(e.target.value);
$('#append-set').onclick=()=>loadShapeSet($('#shape-set').value,true);
function chooseTab(tab){state.tab=tab;paintInspector();schedule()}
async function exportPNG(){
 const button=$('#export');button.disabled=true;button.textContent='Preparing PNG…';
 try{const scene=await rasterComposition(compose(state.layers,state.width,state.height),state,state.exportScale);postprocess(scene,state.effects,state.exportScale);const blob=await new Promise(resolve=>scene.toBlob(resolve,'image/png'));if(!blob)throw new Error('Could not prepare PNG.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`scatter-${state.width*state.exportScale}x${state.height*state.exportScale}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('PNG ready. Active post effects are included.')}catch(e){notify(e.message)}finally{button.disabled=false;button.textContent='Export PNG'}
}
function updateField(el){
 const l=current();
 if(el.dataset.offset){if(!l)return;const v=Number(el.value);if(!Number.isFinite(v)||el.value==='')return;l.offsets[el.dataset.offset]=Math.max(-2147483647,Math.min(2147483647,Math.round(v)));schedule();return}
 const key=el.dataset.key;if(!key)return;const target=el.dataset.scope==='effects'?state.effects:l;if(!target)return;
 let value=el.type==='checkbox'?el.checked:el.type==='number'||el.type==='range'?Number(el.value):el.value;
 if(el.type==='number'||el.type==='range'){if(el.value===''||!Number.isFinite(value))return;if(el.min!=='')value=Math.max(+el.min,value);if(el.max!=='')value=Math.min(+el.max,value);if(el.step==='1')value=Math.round(value)}
 target[key]=value;
 if(key==='padding'||key==='paddingIndividual'&&!value){const padding=target.padding??0;for(const edge of ['paddingLeft','paddingRight','paddingTop','paddingBottom'])target[edge]=padding}
 if(key==='paddingIndividual'){paintInspector();schedule();return}
 for(const [a,b] of [['sizeMin','sizeMax'],['opacityMin','opacityMax'],['hueMin','hueMax'],['sortLow','sortHigh']])if(target[a]>target[b]){const otherKey=key===a?b:a;target[otherKey]=value;for(const other of document.querySelectorAll(`#inspector [data-key="${otherKey}"]`))other.value=value}
 for(const twin of document.querySelectorAll(`#inspector [data-key="${key}"]`))if(twin!==el&&twin.type!=='checkbox')twin.value=value;
 syncRanges();
 if(el.type==='checkbox'&&el.closest('.fx-block')?.querySelector('.effect-heading input')===el)el.closest('.fx-block').classList.toggle('enabled',el.checked);
 if(key==='colorMode')paintInspector();if(key==='name'||key==='color')paintLayers();
 if(el.type==='color'){const hex=el.parentElement.querySelector('span');if(hex)hex.textContent=value.toUpperCase()}
 schedule();
}
$('#inspector').addEventListener('input',e=>updateField(e.target));
// Choose the nearest endpoint even when the two slider thumbs overlap.
let rangeDrag;
function dragRange(e){
 if(!rangeDrag)return;const {track,input}=rangeDrag,b=track.getBoundingClientRect();
 const t=Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),min=+input.min,max=+input.max,step=+input.step;
 input.value=Math.round((min+t*(max-min))/step)*step;updateField(input);
}
$('#inspector').addEventListener('pointerdown',e=>{
 const track=e.target.closest('.dual-range');if(!track)return;e.preventDefault();
 const inputs=[...track.querySelectorAll('input')],b=track.getBoundingClientRect(),value=+inputs[0].min+Math.max(0,Math.min(1,(e.clientX-b.left)/b.width))*(+inputs[0].max-+inputs[0].min);
 const input=Math.abs(value-inputs[0].value)<Math.abs(value-inputs[1].value)?inputs[0]:inputs[1];
 rangeDrag={track,input};input.focus();track.setPointerCapture(e.pointerId);dragRange(e);
});
$('#inspector').addEventListener('pointermove',dragRange);
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('#inspector').addEventListener(event,()=>rangeDrag=null);
$('#inspector').addEventListener('change',e=>{if(e.target.id==='export-scale')state.exportScale=+e.target.value;if(e.target.id==='layer-library'&&e.target.value)useLibrary(e.target.value,false)});
$('#inspector').addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;const l=current();
 if(button.dataset.preset&&l){l.preset=button.dataset.preset;refresh();return}
 const action=button.dataset.action;
 if(action==='export'){exportPNG();return}if(!l)return;
 if(action==='import'){fileLayerId=l.id;$('#svg-file').value='';$('#svg-file').click()}
 if(action==='seed'){l.seed=Math.floor(Math.random()*1000000);refresh()}
 if(action==='delete'){const idx=state.layers.indexOf(l);state.layers.splice(idx,1);state.selected=state.layers[Math.min(idx,state.layers.length-1)]?.id;refresh()}
});
function selectRow(e){
 const row=e.target.closest('[data-id]');if(!row)return;state.selected=+row.dataset.id;
 const l=current(),action=e.target.closest('[data-action]')?.dataset.action;
 if(action==='visibility')l.visible=!l.visible;
 else if(action==='duplicate'){const id=state.nextId++,copy={...l,id,name:`Layer ${id}`,offsets:{...l.offsets}};state.layers.splice(state.layers.indexOf(l)+1,0,copy);state.selected=id}
 else if(action==='up'||action==='down'){const idx=state.layers.indexOf(l),next=idx+(action==='up'?1:-1);if(next>=0&&next<state.layers.length)[state.layers[idx],state.layers[next]]=[state.layers[next],state.layers[idx]]}
 else state.tab='vector';refresh();
}
$('#layers').onclick=selectRow;$('#layers').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.layer')){e.preventDefault();selectRow(e)}};
function addLayer(){const l=createLayer(state.nextId++,null);state.layers.push(l);state.selected=l.id;state.tab='vector';refresh();notify('Layer added. Upload an SVG with object groups.')}
$('#add-layer').onclick=addLayer;$('#add-layer-bottom').onclick=addLayer;
$('#svg-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const {asset,saved}=await importLibraryFile(await file.text(),file.name),l=state.layers.find(l=>l.id===fileLayerId);if(!l)return;l.asset=asset;paintLibrary();refresh();notify(`Imported: ${asset.shapes.length} object groups${saved?' · saved to library':' · available this session; browser storage unavailable'}`)}catch(err){notify(err.message)}};
for(const key of ['width','height'])$(`#${key}`).onchange=e=>{let value=Math.round(Number(e.target.value));if(!Number.isFinite(value))return;value=Math.max(128,Math.min(4096,value));e.target.value=state[key]=value;paintInspector();schedule()};
$('#background').oninput=e=>{state.background=e.target.value;$('#background-hex').textContent=state.background.toUpperCase();schedule()};
$('#canvas-blend').onchange=e=>{state.blend=e.target.value;schedule()};
$('#vector-tab').onclick=()=>chooseTab('vector');$('#effects-tab').onclick=()=>chooseTab('effects');$('#export').onclick=exportPNG;
$('#randomize-all').onclick=()=>{randomizeLayerSeeds(state.layers);refresh();notify('All layer seeds randomized.')};
$('#zoom-in').onclick=()=>{state.zoom=Math.min(4,state.zoom+.25);fit()};$('#zoom-out').onclick=()=>{state.zoom=Math.max(.25,state.zoom-.25);fit()};$('#zoom-fit').onclick=()=>{state.zoom=1;fit()};window.addEventListener('resize',fit);
async function start(){
 try{
  const storageAvailable=await initializeLibrary();
  try{await initializePresets()}catch(e){notify(e.message)}
  paintLibrary();$('#shape-set').value='b1';await selectShapeSet('b1');
  await render();registerTools();
  if(!storageAvailable)notify('Built-in library ready. Browser storage is unavailable for imported files.');
 }catch(e){$('#library-status').textContent=e.message;notify(e.message);refresh()}
}
function registerTools(){if(!document.modelContext?.registerTool)return;const tools=[{name:'read_composition',description:'Read canvas and layer settings.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({width:state.width,height:state.height,background:state.background,layers:state.layers.map(({asset,...l})=>({...l,source:asset?.name,shapeCount:asset?.shapes.length||0}))})},{name:'set_layer_seed',description:'Set a layer global seed and update the composition.',inputSchema:{type:'object',properties:{layerId:{type:'integer'},seed:{type:'integer'}},required:['layerId','seed'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async args=>{if(!args||!Number.isInteger(args.layerId)||!Number.isInteger(args.seed)||Math.abs(args.seed)>2147483647)throw new Error('Invalid layer ID or seed.');const l=state.layers.find(l=>l.id===args.layerId);if(!l)throw new Error('Layer not found.');l.seed=args.seed;paintInspector();await render();return {layerId:l.id,seed:l.seed}}}];for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{})}catch{}}
start();
