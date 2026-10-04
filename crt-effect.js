// Pixel grid and phosphor treatment use canvas units, so exports keep the same pattern.
export function crtPixels(source,w,h,e,scale=1){
 const out=new Uint8ClampedArray(source),size=Math.max(1,e.crtPixelSize*scale);
 const cols=Math.ceil(w/size),rows=Math.ceil(h/size),grid=new Float32Array(cols*rows*4);
 // Average in premultiplied color to avoid dark halos around transparent geometry.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,j=(Math.floor(y/size)*cols+Math.floor(x/size))*4,a=source[i+3]/255;
  for(let c=0;c<3;c++)grid[j+c]+=source[i+c]*a;grid[j+3]+=a;
 }
 for(let j=0;j<grid.length;j+=4)if(grid[j+3])for(let c=0;c<3;c++)grid[j+c]/=grid[j+3];
 const at=(x,y,c)=>grid[(Math.max(0,Math.min(rows-1,y))*cols+Math.max(0,Math.min(cols-1,x)))*4+c];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const gx=Math.floor(x/size),gy=Math.floor(y/size),i=(y*w+x)*4;
  const scan=1-e.crtScanlines*(.5-.5*Math.cos(2*Math.PI*((y+.5)/size-.5)));
  const nx=(x+.5)/w*2-1,ny=(y+.5)/h*2-1,vignette=Math.max(0,1-e.crtVignette*(nx*nx+ny*ny)/2);
  const channel=Math.floor(x/scale)%3;
  for(let c=0;c<3;c++){
   const v=at(gx,gy,c),near=(at(gx-1,gy,c)+at(gx+1,gy,c)+at(gx,gy-1,c)+at(gx,gy+1,c))/4;
   const sharp=Math.max(0,Math.min(255,v+e.crtSharpen*(v-near)));
   out[i+c]=sharp*scan*vignette*(channel===c?1:1-e.crtMask);
  }
  // Retain original coverage; the generator's canvas background is opaque.
 }
 return out;
}
