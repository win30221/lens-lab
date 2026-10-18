import * as THREE from 'three';

// Accumulate linear-light scene samples, then apply the existing sensor optics
// once. Static geometry stays sharp; only geometry whose pose changes can smear.
export function integrateExposure({renderer,scene,camera,source,times,pose}){
  const target=new THREE.WebGLRenderTarget(source.width,source.height,{type:THREE.HalfFloatType,depthBuffer:false});
  const material=new THREE.ShaderMaterial({
    uniforms:{sampleMap:{value:source.texture},weight:{value:1/times.length}},
    depthTest:false,depthWrite:false,transparent:true,blending:THREE.AdditiveBlending,toneMapped:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:'varying vec2 vUv;uniform sampler2D sampleMap;uniform float weight;void main(){gl_FragColor=vec4(texture2D(sampleMap,vUv).rgb*weight,1.);}'
  });
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material),screen=new THREE.Scene();screen.add(quad);
  const ortho=new THREE.OrthographicCamera(-1,1,1,-1,0,1),autoClear=renderer.autoClear;
  try{
    renderer.setRenderTarget(target);renderer.clear();
    for(const time of times){
      pose(time);renderer.autoClear=true;renderer.setRenderTarget(source);renderer.render(scene,camera);
      renderer.autoClear=false;renderer.setRenderTarget(target);renderer.render(screen,ortho);
    }
  }catch(error){target.dispose();throw error}
  finally{renderer.autoClear=autoClear;renderer.setRenderTarget(null);material.dispose();quad.geometry.dispose()}
  return target;
}
