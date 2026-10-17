import * as THREE from 'three';
import {sensorFormat} from './camera-mechanics.mjs';

export function createCameraBody({scene,texture,box,label,metal,dark,chrome,axisY}){
  const root=new THREE.Group();scene.add(root);
  const sensorX=-5.95,W=2.1,H=W/sensorFormat.aspect;
  const pcbMaterial=new THREE.MeshStandardMaterial({color:0x203c35,metalness:.35,roughness:.55,transparent:true,opacity:.22,depthWrite:false});
  const sensor=new THREE.Group();sensor.position.set(sensorX,axisY,0);root.add(sensor);
  const pcb=box(sensor,.065,H+.28,W+.3,-.05,0,0,pcbMaterial);
  const wafer=box(sensor,.025,H,W,0,0,0,new THREE.MeshPhysicalMaterial({color:0x67738f,metalness:.25,roughness:.2,transparent:true,opacity:.2,depthWrite:false,clearcoat:1}));
  for(const y of [-H/2-.055,H/2+.055])box(sensor,.08,.09,W+.22,.01,y,0,chrome);
  for(const z of [-W/2-.065,W/2+.065])box(sensor,.08,H+.2,.1,.01,0,z,chrome);
  for(const y of [-H/2-.11,H/2+.11])for(let j=0;j<24;j++)box(sensor,.018,.06,.025,-.06,y,-W/2+j*W/23,new THREE.MeshStandardMaterial({color:0xbca96c,metalness:.8,roughness:.35}));
  const geometry=new THREE.PlaneGeometry(W,H);const uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,1-uv.getX(i),1-uv.getY(i));
  const image=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,toneMapped:false,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));image.rotation.y=Math.PI/2;image.position.x=.035;image.renderOrder=3;sensor.add(image);
  sensor.traverse(m=>{if(m.isMesh)m.userData.bodyPart='sensor'});
  for(const side of [-1,1]){const text=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.13),new THREE.MeshBasicMaterial({map:label('CMOS 36 x 24 mm / 3:2','#b3cbd0'),transparent:true}));text.rotation.y=side*Math.PI/2;text.position.set(side*.06,-H/2-.25,0);sensor.add(text)}
  box(root,.55,.14,2.65,sensorX,.57,0,metal);box(root,.16,.23,.7,sensorX,.74,0,dark);
  // A coverage guide is a drawing, not an extra optical element.
  const circlePoints=[];for(let j=0;j<=128;j++){const a=j*Math.PI*2/128;circlePoints.push(new THREE.Vector3(sensorX+.075,axisY+Math.sin(a)*1.29,Math.cos(a)*1.29))}
  const imageCircle=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints),new THREE.LineDashedMaterial({color:0x7ad7e0,dashSize:.08,gapSize:.05,transparent:true,opacity:.65,depthWrite:false}));imageCircle.computeLineDistances();imageCircle.layers.set(1);imageCircle.visible=false;root.add(imageCircle);
  // Open mirror box: the near wall is removed for the teaching cutaway.
  box(root,2.65,.08,2.55,-4.65,.66,0,dark);box(root,2.6,1.85,.065,-4.65,1.6,-1.27,dark);
  for(const x of [-5.85,-3.45])for(const z of [-1.24,1.24])box(root,.075,1.8,.075,x,1.6,z,metal);
  const mirror=new THREE.Group();mirror.position.set(-5.55,axisY+.75,0);root.add(mirror);
  box(mirror,.045,2.1,1.66,-.012,-1.05,0,dark);
  const mirrorFace=new THREE.Mesh(new THREE.PlaneGeometry(1.62,2.07),new THREE.MeshStandardMaterial({color:0xdce6e5,metalness:1,roughness:.055,side:THREE.DoubleSide,envMapIntensity:1.5}));mirrorFace.rotation.y=Math.PI/2;mirrorFace.position.set(.014,-1.05,0);mirror.add(mirrorFace);
  mirror.traverse(m=>{if(m.isMesh)m.userData.bodyPart='mirror'});
  const focusScreen=box(root,.92,.035,1.66,-4.8,2.75,0,new THREE.MeshPhysicalMaterial({color:0xd8e8d4,roughness:.7,transparent:true,opacity:.6,side:THREE.DoubleSide}));focusScreen.userData.bodyPart='prism';
  const prismShape=new THREE.Shape();prismShape.moveTo(-.52,0);prismShape.lineTo(.52,0);prismShape.lineTo(.52,.35);prismShape.lineTo(0,.8);prismShape.lineTo(-.52,.35);prismShape.closePath();
  const prismGeo=new THREE.ExtrudeGeometry(prismShape,{depth:1.36,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2});prismGeo.translate(-4.8,2.82,-.68);
  const prism=new THREE.Mesh(prismGeo,new THREE.MeshPhysicalMaterial({color:0xa1c4c8,roughness:.12,metalness:.1,transmission:.5,transparent:true,opacity:.47,side:THREE.DoubleSide,depthWrite:false}));prism.userData.bodyPart='prism';root.add(prism);
  root.add(new THREE.LineSegments(new THREE.EdgesGeometry(prismGeo,20),new THREE.LineBasicMaterial({color:0x7e969c,transparent:true,opacity:.6})));
  box(root,.55,.53,.87,-5.59,3.12,0,dark);
  const eyepiece=new THREE.Mesh(new THREE.PlaneGeometry(.72,.48),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));eyepiece.rotation.y=-Math.PI/2;eyepiece.position.set(-5.88,3.12,0);eyepiece.userData.bodyPart='prism';root.add(eyepiece);
  const shutter=new THREE.Group();shutter.position.set(sensorX+.17,axisY,0);root.add(shutter);
  for(const y of [-H/2-.07,H/2+.07])box(shutter,.065,.07,W+.22,0,y,0,dark);
  for(const z of [-W/2-.08,W/2+.08])box(shutter,.065,H+.23,.075,0,0,z,dark);
  const curtainMaterial=new THREE.MeshStandardMaterial({color:0x252b32,metalness:.6,roughness:.43});
  const first=box(shutter,.014,H,W,.014,0,0,curtainMaterial),second=box(shutter,.014,H,W,.03,0,0,curtainMaterial);
  for(const curtain of [first,second])for(let j=1;j<6;j++)box(curtain,.012,.006,1.002,.65,-.5+j/6,0,metal);
  shutter.traverse(m=>{if(m.isMesh)m.userData.bodyPart='shutter'});
  // Diagram rays show the OVF's change of direction; optical surfaces are schematic.
  const ovfGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.5,axisY,0),new THREE.Vector3(-4.8,axisY,0),new THREE.Vector3(-4.8,2.76,0),new THREE.Vector3(-4.55,3.22,0),new THREE.Vector3(-5.01,3.45,0),new THREE.Vector3(-5.93,3.12,0)]);
  const viewfinderRay=new THREE.Line(ovfGeo,new THREE.LineBasicMaterial({color:0xf1dba1,transparent:true,opacity:.85,depthWrite:false}));viewfinderRay.layers.set(1);root.add(viewfinderRay);
  function update({state,xray,showCircle,showRays}){
    mirror.rotation.z=Math.PI/4+state.mirrorLift*Math.PI/4;
    for(const [mesh,cover,top]of [[first,state.firstCover,false],[second,state.secondCover,true]]){mesh.visible=cover>.001;mesh.scale.y=H*Math.max(.001,cover);mesh.position.y=(top?1:-1)*H/2+(top?-1:1)*H*cover/2;}
    const receiving=state.mirrorLift>.99&&state.firstCover<.01&&state.secondCover<.01;
    image.visible=receiving;const side=xray?THREE.DoubleSide:THREE.FrontSide;if(image.material.side!==side){image.material.side=side;image.material.needsUpdate=true;}
    pcb.material.opacity=xray?.18:1;pcb.material.depthWrite=!xray;wafer.material.opacity=xray?.18:1;
    eyepiece.visible=state.mirrorLift<.01;viewfinderRay.visible=showRays&&state.mirrorLift<.01;imageCircle.visible=showCircle;
  }
  return {root,image,sensor,mirror,first,second,update,sensorX,mirrorX:-4.8};
}
