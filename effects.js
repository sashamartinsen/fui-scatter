// Offsets are canvas pixels. Radial displacement grows linearly from center
// to corners; bilinear sampling keeps fractional shifts smooth at export scale.
export function chromaticPixels(source,width,height,effects,scale=1){
 const out=new Uint8ClampedArray(source.length),amount=(effects.aberration||0)*scale,radial=(effects.radial||0)*scale;
 const angle=(effects.angle||0)*Math.PI/180,dx=Math.cos(angle)*amount,dy=Math.sin(angle)*amount;
 const cx=(width-1)/2,cy=(height-1)/2,diagonal=Math.hypot(cx,cy)||1;
 function sample(x,y,channel){
  x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=x-x0,fy=y-y0;
  const top=source[(y0*width+x0)*4+channel]*(1-fx)+source[(y0*width+x1)*4+channel]*fx;
  const bottom=source[(y1*width+x0)*4+channel]*(1-fx)+source[(y1*width+x1)*4+channel]*fx;
  return top*(1-fy)+bottom*fy;
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,sx=dx+radial*(x-cx)/diagonal,sy=dy+radial*(y-cy)/diagonal;
  out[i]=sample(x-sx,y-sy,0);out[i+1]=source[i+1];out[i+2]=sample(x+sx,y+sy,2);out[i+3]=source[i+3];
 }
 return out;
}

// Spatially seeded monochrome grain, stable between redraws. Cell dimensions
// are canvas pixels so changing export resolution preserves the grain pattern.
export function grainPixels(source,width,height,effects,scale=1){
 const out=new Uint8ClampedArray(source),amplitude=Math.max(0,Math.min(1,effects.grainAmount||0))*64;
 if(!amplitude)return out;
 const size=Math.max(.25,(effects.grainSize||1)*scale),seed=(effects.grainSeed||0)|0;
 function noise(x,y){let n=Math.imul(x^seed,374761393)^Math.imul(y+seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295*2-1}
 for(let y=0;y<height;y++){
  const cellY=Math.floor(y/size);let lastCell=-1,offset=0;
  for(let x=0;x<width;x++){
   const cellX=Math.floor(x/size);if(cellX!==lastCell){offset=noise(cellX,cellY)*amplitude;lastCell=cellX}
   const i=(y*width+x)*4;for(let c=0;c<3;c++)out[i+c]=source[i+c]+offset;
  }
 }
 return out;
}
