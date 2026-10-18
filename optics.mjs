export const apertureStops=[2.8,4,5.6,8,11,16];
// Relative scene calibration: ISO 100, f/5.6, 1/125 s gives unit exposure.
export const isoStops=Object.freeze([100,200,400,800,1600,3200,6400]);
export const exposureGain=(aperture,seconds,ndStops=0,iso=100)=>(seconds*125)*(5.6/aperture)**2*2**(-ndStops)*(iso/100);
export const relativeExposureEV=(aperture,seconds,ndStops=0,iso=100)=>Math.log2(exposureGain(aperture,seconds,ndStops,iso));
// Gaussian approximation to the Airy central lobe, green light, millimetres.
export const diffractionSigma=aperture=>.437*.00055*aperture;
export const focusFromSlider=value=>.35*Math.pow(20/.35,value/1000);
export const sliderFromFocus=distance=>1000*Math.log(distance/.35)/Math.log(20/.35);
export const sceneX=distance=>1.8+5.3*Math.log(distance/.35)/Math.log(20/.35);
export function depthOfField(focal,aperture,distance,circle=.03){
  // Solve blurCircle == circle, using the same thin-lens model as the image.
  const s=distance*1000,h=focal*focal/(aperture*circle),offset=s-focal;
  return {near:h*s/(h+offset)/1000,far:h>offset?h*s/(h-offset)/1000:Infinity,hyperfocal:(h+focal)/1000};
}
export function blurCircle(focal,aperture,focus,distance){
  const s=focus*1000,u=distance*1000;
  return focal*focal*Math.abs(u-s)/(aperture*u*(s-focal));
}

// Live View is gain-compensated; an optical finder follows the actual iris.
export const previewGain=(liveView,workingAperture,ndStops=0)=>liveView?1:(2.8/workingAperture)**2*2**(-ndStops);
