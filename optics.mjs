export const apertureStops=[2.8,4,5.6,8,11,16];
export const focusFromSlider=value=>.35*Math.pow(20/.35,value/1000);
export const sliderFromFocus=distance=>1000*Math.log(distance/.35)/Math.log(20/.35);
export const sceneX=distance=>1.8+5.3*Math.log(distance/.35)/Math.log(20/.35);
export function depthOfField(focal,aperture,distance,circle=.03){
  const s=distance*1000,H=focal*focal/(aperture*circle)+focal;
  return {near:H*s/(H+s-focal)/1000,far:H>s-focal?H*s/(H-s+focal)/1000:Infinity,hyperfocal:H/1000};
}
export function blurCircle(focal,aperture,focus,distance){
  const s=focus*1000,u=distance*1000;
  return focal*focal*Math.abs(u-s)/(aperture*u*(s-focal));
}
