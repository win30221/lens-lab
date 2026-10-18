// Thin-lens defocus, rounded nine-blade pupil and an Airy-core approximation.
// Exposure acts in linear light before tone mapping, shared by preview and PNG.
export const sensorFragment=`
varying vec2 vUv;
uniform sampler2D tColor,tDepth;
uniform vec2 resolution;
uniform float focus,focal,aperture,exposure,diffraction;
float coc(vec2 uv){
  float d=texture2D(tDepth,uv).x;
  float z=(2.*.1*30.)/(30.+.1-(2.*d-1.)*(30.-.1));
  float u=clamp(.35*exp((.9+z-1.8)/5.3*log(20./.35)),.25,200.)*1000.;
  return min(focal*focal*abs(u-focus*1000.)/(aperture*u*max(focus*1000.-focal,1.)),4.);
}
void main(){
  float r=coc(vUv)*resolution.x/36.*.5;
  float sigma=diffraction*resolution.x/36.;
  vec3 col=vec3(0.);float weight=0.;
  for(int i=0;i<48;i++){
    float f=float(i)+.5,a=f*2.39996323;
    float sector=6.28318530718/9.;
    float edge=cos(sector*.5)/cos(mod(a,sector)-sector*.5);
    float pupil=mix(1.,edge,smoothstep(2.8,8.,aperture));
    vec2 defocus=vec2(cos(a),sin(a))*sqrt(f/48.)*r*pupil;
    float g=fract(f*.754877666),ga=f*1.618033989;
    vec2 airy=vec2(cos(ga),sin(ga))*sqrt(-2.*log(max(g,.001)))*sigma;
    vec2 q=clamp(vUv+(defocus+airy)/resolution,vec2(.001),vec2(.999));
    // Reduce sharp-object colour leaking into a blurred background.
    float other=coc(q)*resolution.x/36.*.5;
    float w=mix(1.,smoothstep(length(defocus)*.5-1.,length(defocus)*.5+1.,other),smoothstep(1.,3.,r));
    col+=texture2D(tColor,q).rgb*w;weight+=w;
  }
  col=weight>.001?col/weight:texture2D(tColor,vUv).rgb;
  gl_FragColor=vec4(col*exposure,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
