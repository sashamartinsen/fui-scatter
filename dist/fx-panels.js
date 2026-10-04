const axes=[['horizontal','Horizontal'],['vertical','Vertical']];
function block(title,key,on,body,scope){return `<section class="inspector-section fx-block ${on?'enabled':''}"><div class="effect-heading"><strong>${title}</strong><input aria-label="Enable ${title}" type="checkbox" data-scope="${scope}" data-key="${key}" ${on?'checked':''}></div><div class="fx-controls">${body}</div></section>`}
function choice(label,key,value,options,scope){return `<label>${label}<select data-scope="${scope}" data-key="${key}">${options.map(([v,n])=>`<option value="${v}" ${v===value?'selected':''}>${n}</option>`).join('')}</select></label>`}
function color(label,key,value){return `<label class="color-label">${label}<input aria-label="${label}" type="color" data-scope="effects" data-key="${key}" value="${value}"><span>${value.toUpperCase()}</span></label>`}
function seed(key,value,scope,label='Seed'){return `<label>${label}<input type="number" data-scope="${scope}" data-key="${key}" min="-2147483647" max="2147483647" step="1" value="${value}"></label>`}
export function vectorControls(l,range){
 const r=(label,k,min,max,step=1)=>range(label,k,l[k],min,max,step);
 return `<div class="fx-divider">VECTOR DEFORMATION <span>Per source shape · before mirrors</span></div>`+
 block('Echo / Trails','echo',l.echo,r('Copies','echoCount',1,12)+r('Distance / source size','echoDistance',0,1,.01)+r('Direction, °','echoAngle',0,360)+r('Scale per copy','echoScale',.5,1.2,.01)+r('Opacity per copy','echoOpacity',0,1,.01),'layer');
}
export function rasterControls(e,range){
 const r=(label,k,min,max,step=1)=>range(label,k,e[k],min,max,step,'effects'),axis=k=>choice('Direction',k,e[k],axes,'effects'),b=(name,k,body)=>block(name,k,e[k],body,'effects');
 return `<div class="fx-divider">GEOMETRY & MOTION</div>`+
 b('Pixel Stretch','pixelStretch',axis('pixelStretchAxis')+r('Strip position','pixelStretchPosition',0,1,.01)+r('Source strip width','pixelStretchWidth',.001,.2,.001)+r('Stretch length','pixelStretchLength',0,1,.01))+
 b('Pixel Sorting','pixelSort',axis('sortAxis')+choice('Sort by','sortMetric',e.sortMetric,[['brightness','Brightness'],['hue','Hue']],'effects')+r('Lower threshold','sortLow',0,1,.01)+r('Upper threshold','sortHigh',0,1,.01)+`<label class="check-option"><input type="checkbox" data-scope="effects" data-key="sortReverse" ${e.sortReverse?'checked':''}>Descending order</label>`)+
 b('Noise Displacement','displace',r('Offset, px','displaceAmount',0,100)+r('Noise scale, px','displaceSize',4,200)+seed('displaceSeed',e.displaceSeed,'effects'))+
 b('Glitch Bands','glitch',r('Band height, px','glitchSize',1,120)+r('Offset, px','glitchAmount',0,200)+r('Coverage','glitchCoverage',0,1,.01)+r('RGB separation, px','glitchRGB',0,40)+seed('glitchSeed',e.glitchSeed,'effects'))+
 b('Directional Blur','blur',r('Length, px','blurLength',0,100)+r('Direction, °','blurAngle',0,360)+r('Samples','blurSamples',2,24))+
 `<div class="fx-divider">LIGHT & COLOR</div>`+
 b('Bloom','bloom',r('Threshold','threshold',0,1,.01)+r('Intensity','strength',0,2,.05)+r('Radius, px','radius',1,80))+
 b('Chromatic aberration','chromatic',r('Directional offset, px','aberration',0,40)+r('Direction, °','angle',0,360)+r('Radial offset, px','radial',0,80))+
 b('Invert','invert','')+
 b('Hue Shift','hueShift',r('Hue shift, °','hueShiftAngle',-180,180))+
 `<div class="fx-divider">PRINT & TEXTURE</div>`+
 b('Halftone','halftone',r('Cell size, px','halftoneSize',2,40)+r('Screen angle, °','halftoneAngle',0,90)+r('Contrast','halftoneContrast',.1,3,.05)+color('Dot color','halftoneInk',e.halftoneInk)+color('Paper color','halftonePaper',e.halftonePaper))+
 b('Dither','dither',r('Levels per channel','ditherLevels',2,8)+r('Dither amount','ditherAmount',0,1,.01))+
 b('Threshold','cutoff',r('Cutoff','cutoffLevel',0,1,.01)+color('Light color','cutoffInk',e.cutoffInk)+color('Dark color','cutoffPaper',e.cutoffPaper))+
 b('Posterize','posterize',r('Levels per channel','posterizeLevels',2,16))+
 b('Pixel / CRT Display','crt',r('Pixel size, px','crtPixelSize',1,32)+r('Scanlines','crtScanlines',0,1,.01)+r('RGB mask','crtMask',0,1,.01)+r('Sharpen','crtSharpen',0,3,.05)+r('Vignette','crtVignette',0,1,.01))+
 b('Grain','grain',r('Amount','grainAmount',0,1,.01)+r('Size, px','grainSize',1,8,.25)+seed('grainSeed',e.grainSeed,'effects','Grain seed'));
}
