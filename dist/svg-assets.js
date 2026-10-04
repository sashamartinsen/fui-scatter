const NS='http://www.w3.org/2000/svg';let serial=0;
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export {escape};
// Illustrator/Inkscape often wrap the asset groups in an exported layer.
// Layer containers can mix object groups with standalone compound paths.
// Preserve the children of an object group, including its individual letters.
export function findShapeGroups(svg){
 const drawable=new Set(['g','path','rect','circle','ellipse','polygon','polyline','line','text','use']);
 const children=g=>[...g.children].filter(e=>drawable.has(e.localName));
 function isContainer(g,allowAnonymous){
  if(g.localName!=='g')return false;
  const items=children(g),groupOnly=items.length&&items.every(e=>e.localName==='g');
  const label=g.getAttribute('data-name')||g.getAttribute('aria-label')||g.id||'';
  const layer=g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape','groupmode')==='layer'||/^layer(?:[\s_-]*\d|$)|^слой(?:[\s_-]*\d|$)/i.test(label);
  const anonymous=!g.id&&!g.getAttribute('data-name')&&!g.getAttribute('aria-label');
  return items.length>0&&(layer||(groupOnly&&((allowAnonymous&&anonymous)||items.length===1)));
 }
 let groups=children(svg);
 // Before the first branching level, unnamed containers are safe to skip.
 while(groups.length===1&&isContainer(groups[0],true))groups=children(groups[0]);
 // At the object level, preserve compound objects made entirely of subgroups.
 function layerContents(g){return isContainer(g,false)?children(g).flatMap(layerContents):[g]}
 return groups.flatMap(layerContents);
}
export async function parseAsset(text,name){
 if(text.length>8_000_000)throw new Error('SVG must be smaller than 8 MB.');
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw new Error('Could not read SVG. Check the file format.');
 const svg=doc.documentElement;serial++;const prefix=`asset${serial}_`;
 svg.querySelectorAll('script,foreignObject,image,animate,animateTransform,animateMotion,set').forEach(e=>e.remove());
 for(const el of [svg,...svg.querySelectorAll('*')])for(const attr of [...el.attributes]){
  const v=attr.value;
  const external=[...v.matchAll(/url\s*\(([^)]*)\)/gi)].some(m=>!m[1].trim().replace(/^['"]|['"]$/g,'').startsWith('#'));
  if(/^on/i.test(attr.name)||(/href$/i.test(attr.name)&&v&&!v.startsWith('#'))||external)el.removeAttribute(attr.name);
 }
 svg.querySelectorAll('style').forEach(e=>{e.textContent=e.textContent.replace(/@import[^;]+;/gi,'').replace(/url\s*\([^)]*\)/gi,v=>/url\s*\(\s*['"]?#/.test(v)?v:'none')});
 const groups=findShapeGroups(svg);
 if(!groups.length)throw new Error('No drawable objects found in the SVG.');
 svg.setAttribute('xmlns',NS);svg.style.cssText='position:fixed;left:-100000px;top:0;width:1000px;height:1000px;visibility:hidden;pointer-events:none';
 document.body.append(svg);
 try{
  // Measure from a child in root user units. Firefox's root getCTM()
  // differs from descendant getCTM() when a viewBox scales the viewport.
  const reference=document.createElementNS(NS,'g');svg.append(reference);
  const rootInverse=reference.getCTM().inverse();reference.remove();
  const boxes=groups.map(g=>{
   const b=g.getBBox(),m=rootInverse.multiply(g.getCTM());
   const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
   const x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y)),width=Math.max(...corners.map(p=>p.x))-x,height=Math.max(...corners.map(p=>p.y))-y;
   if(!Number.isFinite(width)||Math.max(width,height)<=0)throw new Error('One group contains no visible geometry.');
   return {x,y,width,height};
  });
  // Capture authored paint before removing styles; keep holes, strokes and masks.
  for(const el of svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line,text,use')){
   if(el.closest('mask,clipPath,filter'))continue;
   const s=getComputedStyle(el);const fill=s.fill,stroke=s.stroke;
   el.style.fill=fill==='none'?'none':'currentColor';el.style.stroke=stroke==='none'?'none':'currentColor';el.style.fillRule=s.fillRule;el.style.fillOpacity=s.fillOpacity;el.style.strokeOpacity=s.strokeOpacity;
   if(stroke!=='none'){el.style.strokeWidth=s.strokeWidth;el.style.strokeLinecap=s.strokeLinecap;el.style.strokeLinejoin=s.strokeLinejoin;el.style.strokeDasharray=s.strokeDasharray}
  }
  for(const el of svg.querySelectorAll('g,path,rect,circle,ellipse,polygon,polyline,line,text,use'))el.style.opacity=getComputedStyle(el).opacity;
  svg.querySelectorAll('style').forEach(e=>e.remove());
  const map=new Map([...svg.querySelectorAll('[id]')].map(el=>[el.id,prefix+el.id]));
  for(const el of [svg,...svg.querySelectorAll('*')])for(const attr of [...el.attributes]){
   let v=attr.value;if(attr.name==='id')v=map.get(v)||prefix+v;
   else{v=v.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g,(_,q,id)=>`url(#${map.get(id)||prefix+id})`);if(/href$/i.test(attr.name)&&v.startsWith('#'))v='#'+(map.get(v.slice(1))||prefix+v.slice(1))}
   el.setAttribute(attr.name,v);
  }
  svg.removeAttribute('style');
  const definitions=[...svg.querySelectorAll('defs')].map(e=>e.innerHTML).join('');
  const serializer=new XMLSerializer();
  const shapes=groups.map((g,i)=>{
   const b=boxes[i],extent=Math.max(b.width,b.height)*1.015,cx=b.x+b.width/2,cy=b.y+b.height/2;
   let contentNode=g.cloneNode(true);
   for(let ancestor=g.parentElement;ancestor&&ancestor!==svg;ancestor=ancestor.parentElement){const shell=ancestor.cloneNode(false);shell.removeAttribute('id');shell.append(contentNode);contentNode=shell}
   const rootShell=document.createElementNS(NS,'g');for(const key of ['fill-rule','clip-rule','opacity','fill-opacity','stroke-opacity'])if(svg.hasAttribute(key))rootShell.setAttribute(key,svg.getAttribute(key));rootShell.append(contentNode);
   return {name:g.getAttribute('data-name')||g.id.replace(prefix,'')||`Shape ${i+1}`,content:serializer.serializeToString(rootShell),extent,width:b.width,height:b.height,cx,cy,viewBox:`${cx-extent/2} ${cy-extent/2} ${extent} ${extent}`,definitions};
  });
  return {id:prefix,name,shapes,sourceText:text};
 }finally{svg.remove()}
}
// Center each shape while retaining its original SVG units and relative size.
export function symbols(asset){return `<defs>${asset.shapes.map(s=>s.definitions).filter((d,i,a)=>a.indexOf(d)===i).join('')}</defs>`+asset.shapes.map((s,i)=>`<g id="${asset.id}s${i}"><g transform="translate(${-s.cx} ${-s.cy})">${s.content}</g></g>`).join('')}
export function shapeSVG(shape,color,resolution=256){return `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${resolution}" height="${resolution}" viewBox="${shape.viewBox}" style="color:${color};overflow:visible"><defs>${shape.definitions}</defs>${shape.content}</svg>`}
export async function svgImage(svg){const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();return img}
