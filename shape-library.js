import {parseAsset,escape} from './svg-assets.js?v=2';
export const library={sets:[],files:[]};
const cache=new Map();
function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('scatter-svg-library',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function storedFiles(){const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}finally{db.close()}}
async function storeFile(file){const db=await database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
export async function initializeLibrary(){
 const response=await fetch('shape-library/manifest.json');if(!response.ok)throw new Error('Could not load shape sets.');
 library.sets=await response.json();library.files=library.sets.flatMap(s=>s.files.map(f=>({...f,set:s.id,group:s.name})));
 let storageAvailable=true;try{library.files.push(...await storedFiles())}catch{storageAvailable=false}
 return storageAvailable;
}
export async function libraryAsset(id){
 const entry=library.files.find(f=>f.id===id);if(!entry)throw new Error('Choose an SVG from the library.');
 if(!cache.has(id))cache.set(id,(async()=>{let text=entry.text;if(text===undefined){const response=await fetch(entry.url,{cache:'no-cache'});if(!response.ok)throw new Error('Could not load '+entry.name);text=await response.text()}const asset=await parseAsset(text,entry.name);asset.libraryId=id;return asset})());
 try{return await cache.get(id)}catch(e){cache.delete(id);throw new Error(entry.name+': '+e.message)}
}
export async function importLibraryFile(text,name){
 const existing=library.files.find(f=>f.name===name&&f.text===text);if(existing)return {asset:await libraryAsset(existing.id),saved:true};
 const asset=await parseAsset(text,name),file={id:'imported/'+crypto.randomUUID(),name,text,group:'Imported',set:'imported'};asset.libraryId=file.id;
 library.files.push(file);cache.set(file.id,Promise.resolve(asset));let saved=true;try{await storeFile(file)}catch{saved=false}
 return {asset,saved};
}
export function libraryOptions(selected='',placeholder='Choose SVG…'){
 const groups=[...new Set(library.files.map(f=>f.group))];
 return `<option value="">${escape(placeholder)}</option>`+groups.map(group=>`<optgroup label="${escape(group)}">${library.files.filter(f=>f.group===group).map(f=>`<option value="${escape(f.id)}" ${f.id===selected?'selected':''}>${escape(f.name)}</option>`).join('')}</optgroup>`).join('');
}
