import * as THREE from 'three';

// Presentation-only focus cue: world X follows the demonstration's optical
// axis. It is deliberately separate from the physical sensor-preview shader.
export function createSceneFinish(renderer,camera){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,samples:4});
  target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const uniforms={colorMap:{value:target.texture},depthMap:{value:target.depthTexture},resolution:{value:new THREE.Vector2()},projectionInverse:{value:camera.projectionMatrixInverse},worldMatrix:{value:camera.matrixWorld},focusDistance:{value:2},focalLength:{value:50},fStop:{value:5.6},sampleCount:{value:32}};
  const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
    varying vec2 uv0;uniform sampler2D colorMap,depthMap;uniform vec2 resolution;
    uniform mat4 projectionInverse,worldMatrix;uniform float focusDistance,focalLength,fStop,sampleCount;
    vec3 worldAt(vec2 uv){float d=texture2D(depthMap,uv).x;vec4 p=projectionInverse*vec4(uv*2.-1.,d*2.-1.,1.);return (worldMatrix*vec4(p.xyz/p.w,1.)).xyz;}
    float blurAt(vec3 p){
      float background=(1.-smoothstep(-4.8,-3.2,p.z))*2.2;
      float garden=step(1.7,p.x)*step(p.x,7.4)*step(.33,p.y)*step(p.y,3.3)*step(abs(p.z),1.65);
      float distance=.35*exp((p.x-1.8)/5.3*log(20./.35));
      float s=focusDistance*1000.,u=max(distance*1000.,100.);
      float coc=focalLength*focalLength*abs(u-s)/(fStop*u*max(s-focalLength,1.));
      return max(background,garden*min(coc*resolution.x/36.*1.7,11.));
    }
    void main(){
      vec3 p=worldAt(uv0);float radius=blurAt(p);vec3 color=texture2D(colorMap,uv0).rgb;float weight=1.;
      if(radius>.4){for(int i=0;i<32;i++){
        if(float(i)>=sampleCount)break;
        float n=float(i)+.5,a=n*2.39996323;
        vec2 q=clamp(uv0+vec2(cos(a),sin(a))*sqrt(n/sampleCount)*radius/resolution,vec2(.001),vec2(.999));
        vec3 other=worldAt(q);float otherRadius=blurAt(other);
        float w=smoothstep(.0,1.5,otherRadius+.15)*exp(-abs(p.y-other.y)*.2);
        color+=texture2D(colorMap,q).rgb*w;weight+=w;
      }}
      color/=weight;
      vec2 v=uv0-.5;color*=1.-.22*dot(v,v);
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const screen=new THREE.Scene();screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  const screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),size=new THREE.Vector2();
  return {render(scene,focus,focal,aperture,interacting=false){
    renderer.getDrawingBufferSize(size);
    if(target.width!==size.x||target.height!==size.y){target.setSize(size.x,size.y);uniforms.resolution.value.copy(size)}
    uniforms.focusDistance.value=focus;uniforms.focalLength.value=focal;uniforms.fStop.value=aperture;
    // Keep the render target, blur radius and color pipeline stable during input.
    uniforms.sampleCount.value=interacting?8:32;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(screen,screenCamera);
  }};
}
