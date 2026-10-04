// Deform source geometry once per layer. Every reflected placement uses that same symbol.
export const VECTOR_DEFAULTS={echo:false,echoCount:4,echoDistance:.15,echoAngle:0,echoScale:.95,echoOpacity:.65};
export function deformShape(shape,layer,index=0){
 const w=shape.width||shape.extent,h=shape.height||shape.extent;
 let extent=shape.extent,xml=`<g transform="translate(${-shape.cx} ${-shape.cy})">${shape.content}</g>`,defs=shape.definitions||'';
 const prefix=`vf${layer.id}_${layer.asset?.id||'a'}_${index}_`;
 // Namespace authored IDs, then reuse each stage through <use> instead of copying paths.
 const ids=new Set([...(`${defs}${xml}`).matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const id of ids){const replacement=prefix+id;for(const key of ['defs','xml']){let s=key==='defs'?defs:xml;s=s.replaceAll(`id="${id}"`,`id="${replacement}"`).replaceAll(`url(#${id})`,`url(#${replacement})`).replaceAll(`href="#${id}"`,`href="#${replacement}"`);if(key==='defs')defs=s;else xml=s}}
 if(layer.echo){
  const copies=[],a=layer.echoAngle*Math.PI/180,step=layer.echoDistance*Math.max(w,h),sourceId=prefix+'echoSource';defs+=`<g id="${sourceId}">${xml}</g>`;
  let bound=extent;
  for(let n=layer.echoCount;n>=0;n--){const factor=layer.echoScale**n,x=Math.cos(a)*step*n,y=Math.sin(a)*step*n;bound=Math.max(bound,extent*factor+2*Math.max(Math.abs(x),Math.abs(y)));copies.push(`<g transform="translate(${x} ${y}) scale(${factor})" opacity="${layer.echoOpacity**n}"><use href="#${sourceId}"/></g>`)}
  extent=bound;xml=copies.join('');
 }
 return {...shape,extent,cx:0,cy:0,viewBox:`${-extent/2} ${-extent/2} ${extent} ${extent}`,definitions:defs,content:xml};
}
export function hasVectorEffects(layer){return layer.echo}
export function vectorAsset(layer){return hasVectorEffects(layer)?{...layer.asset,id:layer.asset.id+'v'+layer.id,shapes:layer.asset.shapes.map((s,i)=>deformShape(s,layer,i))}:layer.asset}
