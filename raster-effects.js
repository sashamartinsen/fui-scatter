export const RASTER_DEFAULTS={invert:false,hueShift:false,hueShiftAngle:0,crt:false,crtPixelSize:3,crtScanlines:.35,crtMask:.25,crtSharpen:1.2,crtVignette:.2,pixelStretch:false,pixelStretchAxis:'horizontal',pixelStretchPosition:.5,pixelStretchWidth:.015,pixelStretchLength:.25,pixelSort:false,sortAxis:'horizontal',sortMetric:'brightness',sortLow:.15,sortHigh:.95,sortReverse:false,displace:false,displaceAmount:15,displaceSize:50,displaceSeed:46,glitch:false,glitchSize:18,glitchAmount:35,glitchCoverage:.3,glitchRGB:5,glitchSeed:46,halftone:false,halftoneSize:8,halftoneAngle:45,halftoneContrast:1,halftoneInk:'#ffffff',halftonePaper:'#000000',dither:false,ditherLevels:2,ditherAmount:1,blur:false,blurLength:15,blurAngle:0,blurSamples:8,cutoff:false,cutoffLevel:.5,cutoffInk:'#ffffff',cutoffPaper:'#000000',posterize:false,posterizeLevels:4};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lum=(d,i)=>(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function hash(x,y,seed){let t=Math.imul(x+seed,374761393)^Math.imul(y,668265263);t=Math.imul(t^(t>>>13),1274126177);return ((t^(t>>>16))>>>0)/4294967295}
function pixel(d,w,h,x,y,c){x=clamp(x,0,w-1);y=clamp(y,0,h-1);const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,w-1),y1=Math.min(y0+1,h-1),u=x-x0,v=y-y0;return (d[(y0*w+x0)*4+c]*(1-u)+d[(y0*w+x1)*4+c]*u)*(1-v)+(d[(y1*w+x0)*4+c]*(1-u)+d[(y1*w+x1)*4+c]*u)*v}
export function rasterEffect(d,w,h,effect,e,scale=1){
 const out=new Uint8ClampedArray(d);
 if(effect==='invert'){
  for(let i=0;i<d.length;i+=4)for(let c=0;c<3;c++)out[i+c]=255-d[i+c];
 }else if(effect==='hueShift'){
  const shift=((e.hueShiftAngle%360)+360)%360/60;if(!shift)return out;
  // Rotate hue while preserving saturation and lightness, including neutral grays.
  for(let i=0;i<d.length;i+=4){
   const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min;
   if(!chroma)continue;
   const hue=(((max===r?(g-b)/chroma:max===g?(b-r)/chroma+2:(r-g)/chroma+4)+shift)%6+6)%6;
   const x=chroma*(1-Math.abs(hue%2-1));
   const color=hue<1?[chroma,x,0]:hue<2?[x,chroma,0]:hue<3?[0,chroma,x]:hue<4?[0,x,chroma]:hue<5?[x,0,chroma]:[chroma,0,x];
   for(let c=0;c<3;c++)out[i+c]=(color[c]+min)*255;
  }
 }else if(effect==='pixelStretch'){
  const horizontal=e.pixelStretchAxis==='horizontal',span=horizontal?w:h,mid=e.pixelStretchPosition*(span-1),band=Math.max(1,e.pixelStretchWidth*span),length=e.pixelStretchLength*span;
  if(length===0)return out;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=horizontal?x:y;if(Math.abs(p-mid)>(band+length)/2)continue;const q=mid+(p-mid)*band/(band+length),i=(y*w+x)*4;for(let c=0;c<4;c++)out[i+c]=pixel(d,w,h,horizontal?q:x,horizontal?y:q,c)}
 }else if(effect==='pixelSort'){
  const horizontal=e.sortAxis==='horizontal',lines=horizontal?h:w,length=horizontal?w:h;
  const score=i=>{if(e.sortMetric!=='hue')return lum(d,i);const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255,m=Math.max(r,g,b),n=Math.min(r,g,b),delta=m-n;if(!delta)return 0;let hue=m===r?((g-b)/delta)%6:m===g?(b-r)/delta+2:(r-g)/delta+4;return ((hue/6)%1+1)%1};
  for(let line=0;line<lines;line++){
   let run=[];const offset=n=>(horizontal?line*w+n:n*w+line)*4;
   const flush=()=>{const sorted=run.map(i=>({i,s:score(i)})).sort((a,b)=>e.sortReverse?b.s-a.s:a.s-b.s);for(let n=0;n<run.length;n++)for(let c=0;c<4;c++)out[run[n]+c]=d[sorted[n].i+c];run=[]};
   for(let n=0;n<length;n++){const i=offset(n),s=score(i);if(d[i+3]&&s>=e.sortLow&&s<=e.sortHigh)run.push(i);else if(run.length)flush()}if(run.length)flush();
  }
 }else if(effect==='displace'){
  const size=Math.max(1,e.displaceSize*scale),amount=e.displaceAmount*scale;
  function noise(x,y,seed){const u=x/size,v=y/size,a=Math.floor(u),b=Math.floor(v),tx=u-a,ty=v-b,fx=tx*tx*(3-2*tx),fy=ty*ty*(3-2*ty);return (hash(a,b,seed)*(1-fx)+hash(a+1,b,seed)*fx)*(1-fy)+(hash(a,b+1,seed)*(1-fx)+hash(a+1,b+1,seed)*fx)*fy}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(noise(x,y,e.displaceSeed)*2-1)*amount,dy=(noise(x,y,e.displaceSeed+733)*2-1)*amount,i=(y*w+x)*4;for(let c=0;c<4;c++)out[i+c]=pixel(d,w,h,x+dx,y+dy,c)}
 }else if(effect==='glitch'){
  const size=Math.max(1,e.glitchSize*scale);
  for(let y=0;y<h;y++){const band=Math.floor(y/size);if(hash(band,0,e.glitchSeed)>e.glitchCoverage)continue;const shift=(hash(band,1,e.glitchSeed)*2-1)*e.glitchAmount*scale;for(let x=0;x<w;x++){const i=(y*w+x)*4;for(let c=0;c<4;c++)out[i+c]=pixel(d,w,h,x+shift+(c===0?e.glitchRGB*scale:c===2?-e.glitchRGB*scale:0),y,c)}}
 }else if(effect==='halftone'){
  const size=Math.max(2,e.halftoneSize*scale),a=e.halftoneAngle*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),ink=rgb(e.halftoneInk),paper=rgb(e.halftonePaper);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x*cs+y*sn,v=-x*sn+y*cs,cu=(Math.floor(u/size)+.5)*size,cv=(Math.floor(v/size)+.5)*size,sx=clamp(Math.round(cu*cs-cv*sn),0,w-1),sy=clamp(Math.round(cu*sn+cv*cs),0,h-1),brightness=clamp((lum(d,(sy*w+sx)*4)-.5)*e.halftoneContrast+.5,0,1),radius=size*.7071*Math.sqrt(brightness),coverage=clamp(radius-Math.hypot(u-cu,v-cv)+.5,0,1),i=(y*w+x)*4;for(let c=0;c<3;c++)out[i+c]=paper[c]+(ink[c]-paper[c])*coverage}
 }else if(effect==='dither'||effect==='posterize'||effect==='cutoff'){
  const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],levels=effect==='dither'?e.ditherLevels:e.posterizeLevels,step=255/(levels-1),ink=rgb(e.cutoffInk),paper=rgb(e.cutoffPaper);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(effect==='cutoff'){const col=lum(d,i)>=e.cutoffLevel?ink:paper;for(let c=0;c<3;c++)out[i+c]=col[c]}else{const noise=effect==='dither'?(bayer[(Math.floor(y/scale)%4)*4+Math.floor(x/scale)%4]/16-.5)*step*e.ditherAmount:0;for(let c=0;c<3;c++)out[i+c]=Math.round(clamp(d[i+c]+noise,0,255)/step)*step}}
 }else if(effect==='blur'){
  const samples=Math.max(2,e.blurSamples),a=e.blurAngle*Math.PI/180,dx=Math.cos(a)*e.blurLength*scale,dy=Math.sin(a)*e.blurLength*scale;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;for(let c=0;c<4;c++){let sum=0;for(let n=0;n<samples;n++){const t=n/(samples-1)-.5;sum+=pixel(d,w,h,x+dx*t,y+dy*t,c)}out[i+c]=sum/samples}}
 }
 return out;
}
