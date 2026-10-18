import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function glb(path){
  const b=readFileSync(new URL(path,import.meta.url));
  assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const data=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  assert.ok(data.buffers.every(b=>!b.uri),'Self-contained geometry');
  assert.ok((data.images??[]).every(i=>!i.uri),'No external texture requests');
  return data;
}
const landscape=glb('./assets/hugo-landscape.glb');
glb('./assets/hugo-studio.glb');
const rotor=landscape.nodes.find(n=>n.name==='HUGO_WIND_ROTOR');
assert.ok(rotor&&rotor.children.length===4,'Rotor retains its articulated child meshes');
assert.ok(rotor.translation[0]>3&&rotor.translation[0]<5&&rotor.translation[1]>1,'Rotor pivot uses the scene coordinate system');
for(const name of ['Curved trunk','Eroded rock ridges','Snow fields','Overlapping slate shingles'])assert.ok(landscape.nodes.some(n=>n.name.startsWith(name)),name+' is exported');
const triangles=landscape.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+landscape.accessors[p.indices].count/3,0);
assert.ok(triangles<150000,'Diorama remains within its web geometry budget');
for(const i of rotor.children){
  const child=landscape.nodes[i];
  for(const p of landscape.meshes[child.mesh].primitives){
    const a=landscape.accessors[p.attributes.POSITION];
    assert.ok(a.min.every(v=>v>-.55)&&a.max.every(v=>v<.55),'Rotor vertices are local to the hub, not the world origin');
  }
}
console.log(`Blender asset checks passed: self-contained GLBs, articulated rotor, tree/chalet/mountains, ${triangles} landscape triangles.`);
