import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import studioAsset from './assets/hugo-studio.glb';
import landscapeAsset from './assets/hugo-landscape.glb';

// Only the specimen garden is visible to the photographic camera. Furniture,
// lettering and the surrounding studio belong to the explanatory camera layer.
export function buildAtelier({scene,props,bench,groups,body,nearX,midX,farX,label,materials,onLoad,onRotor}){
  const {metal,dark,rubber,brass,chrome}=materials;
  const round=new RoundedBoxGeometry(1,1,1,3,.04);
  const box=(p,s,v,m)=>{const o=new THREE.Mesh(round,m);o.scale.set(...s);o.position.set(...v);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
  const print=(p,text,w,h,v,rotation=0,color='#d4c5a4')=>{
    const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:label(text,color,null,1024,128),transparent:true,roughness:.5,metalness:.25,depthWrite:false}));
    o.position.set(...v);o.rotation.y=rotation;p.add(o);return o;
  };
  const screwGeometry=new THREE.CylinderGeometry(.026,.026,.018,12);
  function screw(p,x,y,z){const s=new THREE.Mesh(screwGeometry,chrome);s.rotation.x=Math.PI/2;s.position.set(x,y,z);p.add(s);box(p,[.028,.004,.002],[x,y,z+.01],dark)}

  // Faceplate, recessed fasteners and stepped end caps, not just plain cylinders.
  for(let i=0;i<groups.length;i++){
    const g=groups[i];
    for(let j=0;j<6;j++){
      const a=j*Math.PI/3,r=i===0?1.035:.86;
      const s=new THREE.Mesh(screwGeometry,i===10?brass:chrome);s.rotation.z=Math.PI/2;s.position.set(.035,r*Math.cos(a),r*Math.sin(a));s.userData.part=i;g.add(s);
    }
    g.traverse(o=>{if(o.isMesh&&o.userData.part===undefined)o.userData.part=i});
  }
  const badge=box(groups[4],[.36,.16,.028],[0,.28,.94],dark);badge.rotation.x=-.29;
  const brand=print(groups[4],'H U G O',.32,.09,[0,.28,.963]);brand.rotation.x=-.29;brand.userData.part=4;
  print(groups[0],'HUGO  /  24–70',.56,.08,[0,.3,1.06]).userData.part=0;
  const bodyPlate=box(body.root,[1.22,.23,.026],[-4.65,.85,1.285],brass);
  print(body.root,'HUGO  /  SENSOR LAB',1.08,.12,[-4.65,.85,1.302],0,'#201c15');
  for(const x of [-5.18,-4.12])screw(body.root,x,.85,1.32);
  for(const x of [-5.8,-3.6])for(const y of [.72,2.4])screw(body.root,x,y,1.29);
  // Optical table has a recessed top, fine brass trim and actual mounting holes.
  for(const z of [-2.21,2.21])box(bench,[14.1,.018,.025],[.4,.243,z],brass);
  const holes=new THREE.InstancedMesh(new THREE.CylinderGeometry(.026,.026,.006,10),dark,132);
  const dummy=new THREE.Object3D();let k=0;
  for(let x=0;x<33;x++)for(const z of [-2,-1.75,1.8,2]){dummy.position.set(-6+x*.4,.239,z);dummy.updateMatrix();holes.setMatrixAt(k++,dummy.matrix)}bench.add(holes);
  for(const x of [-6.55,7.3])for(const z of [-2.04,2.04]){const s=new THREE.Mesh(screwGeometry,chrome);s.position.set(x,.25,z);bench.add(s)}
  const plaque=box(bench,[2.25,.055,.54],[-.6,.27,1.75],brass);
  const signature=print(bench,'CRAFTED BY HUGO',1.9,.18,[-.6,.302,1.75],0,'#251e14');signature.rotation.x=-Math.PI/2;

  // Both Blender assets must finish before the loading screen is dismissed.
  const loader=new GLTFLoader();
  Promise.all([
    loader.loadAsync(studioAsset).then(gltf=>{
      gltf.scene.name='HUGO / Blender studio';
      gltf.scene.traverse(o=>{o.layers.set(1);if(o.isMesh){o.receiveShadow=true;o.castShadow=false}});
      scene.add(gltf.scene);
    }),
    loader.loadAsync(landscapeAsset).then(gltf=>{
      gltf.scene.name='HUGO / Blender landscape';
      gltf.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=true}});
      props.add(gltf.scene);
      const rotor=gltf.scene.getObjectByName('HUGO_WIND_ROTOR');
      if(!rotor)throw new Error('Landscape asset is missing its animated rotor');
      onRotor?.(rotor);
    })
  ]).then(()=>onLoad(),error=>{console.error('HUGO assets could not load',error);onLoad(error)});
}
