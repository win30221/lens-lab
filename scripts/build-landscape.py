"""Editable Blender diorama: branching trees, a shingled chalet and alpine ridges.
Run: blender --background --python scripts/build-landscape.py
All geometry and materials are original, deterministic and exported without add-ons.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
from mathutils.noise import noise_vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(41)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=32

def mat(name,rgb,rough=.7,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    return m
wood=[mat('Cedar / '+str(i),(.21+i*.019,.105+i*.012,.047+i*.007)) for i in range(5)]
bark=mat('Ridged walnut bark',(.105,.064,.032),.96)
leaf=[mat('Broadleaf / '+str(i),c,.8) for i,c in enumerate([(.13,.24,.07),(.21,.32,.105),(.31,.39,.14),(.095,.19,.065)])]
pine=[mat('Spruce needles / '+str(i),c,.91) for i,c in enumerate([(.045,.13,.095),(.08,.20,.14),(.13,.26,.18)])]
slate=[mat('Slate tile / '+str(i),(.055+i*.014,.09+i*.016,.11+i*.018),.68) for i in range(4)]
rocks=[mat('Alpine strata / '+str(i),(.17+i*.035,.20+i*.033,.22+i*.032),.94) for i in range(6)]
snow=[mat('Snow / '+str(i),(.68+i*.045,.76+i*.035,.79+i*.03),.84) for i in range(3)]
soil=mat('Forest floor',(.14,.18,.095),1);moss=mat('Moss',(.19,.245,.11),1)
brass=mat('HUGO brushed brass',(.5,.33,.12),.32,.8)
dark=mat('Charcoal fittings',(.025,.034,.039),.42,.5)
clay=mat('Hand thrown terracotta',(.39,.19,.105),.82)
window=mat('Amber window glass',(.8,.41,.13),.3,0,.55)
ivory=mat('Ivory lettering',(.83,.79,.65),.52)

def coord(p):return (p[0],-p[2],p[1])
def group(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
collections={n:group(n) for n in ['01 / Specimen tree','02 / HUGO alpine chalet','03 / Alpine mountain range','04 / Spruce grove','05 / Landscape tray','06 / Animated wind rotor']}
batch={}
active='05 / Landscape tray'
def mesh(name,verts,faces,m):
    key=(active,name,m.name)
    if key not in batch:batch[key]=[[],[]]
    vs,fs=batch[key];offset=len(vs);vs.extend([coord(v) for v in verts]);fs.extend([tuple(offset+i for i in f) for f in faces])
def box(name,p,s,m,angle=0):
    vs=[]
    for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
        a=x*s[0]/2;b=y*s[1]/2;c=z*s[2]/2
        vs.append((p[0]+a,p[1]+b*math.cos(angle)-c*math.sin(angle),p[2]+b*math.sin(angle)+c*math.cos(angle)))
    mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],m)
def tube(name,points,radii,m,sides=10):
    vs=[];fs=[]
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize();ref=Vector((0,1,0)) if abs(tangent.y)<.92 else Vector((1,0,0))
        u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
        for j in range(sides):vs.append(Vector(p)+radii[i]*(math.cos(j*math.tau/sides)*u+math.sin(j*math.tau/sides)*v))
    for i in range(len(points)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))]);mesh(name,vs,fs,m)
def leaf_shape(p,direction,length,width,m,name='Individual folded leaves'):
    d=Vector(direction).normalized();u=d.cross(Vector((0,1,0)))
    if u.length<.01:u=Vector((1,0,0))
    u.normalize();v=d.cross(u).normalized();p=Vector(p)
    vs=[p,p+d*length*.4+u*width,p+d*length+v*.012,p+d*length*.4-u*width,p+d*length*.45+v*.008]
    mesh(name,vs,[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(4,1,0),(4,2,1),(4,3,2),(4,0,3)],m)
def rock(name,p,s,m,seed):
    r=random.Random(seed);vs=[(p[0],p[1]+s[1],p[2])];n=9
    for y,rr in [(s[1]*.5,.8),(0,1)]:
        for j in range(n):a=j*math.tau/n;v=rr*(.8+r.random()*.3);vs.append((p[0]+math.cos(a)*s[0]*v,p[1]+y+r.random()*s[1]*.12,p[2]+math.sin(a)*s[2]*v))
    fs=[]
    for j in range(n):fs.extend([(0,1+j,1+(j+1)%n),(1+j,n+1+j,n+1+(j+1)%n),(1+j,n+1+(j+1)%n,1+(j+1)%n)])
    mesh(name,vs,[tuple(reversed(f)) for f in fs],m)
def lettering(text,p,size,m,front=False):
    bpy.ops.object.text_add(location=coord(p));o=bpy.context.object;o.name=text
    # Local text +Z faces either the viewer (+world Z) or the optical camera (-X).
    o.rotation_euler=(math.pi/2,0,-math.pi/2 if front else 0)
    o.data.body=text;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=.0006
    o.data.materials.append(m)
    for c in list(o.users_collection):c.objects.unlink(o)
    collections[active].objects.link(o)
def sx(d):return 1.8+5.3*math.log(d/.35)/math.log(20/.35)
near,mid,far=sx(.65),sx(2),sx(7)

# Ground-planted trees: curved trunks, tapered branches and individual leaves.
active='01 / Specimen tree';x=near;z=-.55
trunk=[(x,.70,z),(x-.025,.9,z+.02),(x+.025,1.14,z),(x-.015,1.4,z+.02),(x+.04,1.72,z)]
tube('Curved trunk',trunk,[.047,.039,.029,.018,.006],bark,14)
for i in range(15):
    a=i*2.3999;h=.94+i*.044;length=.24+random.random()*.12
    start=Vector((x,h,z));end=start+Vector((math.cos(a)*length,.18+random.random()*.12,math.sin(a)*length))
    tube('Primary boughs',[start,start.lerp(end,.55)+Vector((0,-.035,0)),end],[.018,.011,.003],bark)
    for q in range(5):
        b=a+(q%2*2-1)*.65;t=start.lerp(end,.35+q*.14)
        tip=t+Vector((math.cos(b)*.16,.07,math.sin(b)*.16))
        tube('Fine twigs',[t,tip],[.005,.001],bark,6)
        for k in range(9):
            pos=t.lerp(tip,k/9);ang=b+(1 if k%2 else -1)*1.15
            leaf_shape(pos,(math.cos(ang),.4+random.random(),math.sin(ang)),.055+random.random()*.045,.022,leaf[(i+q+k)%4])
# Root flare and spreading roots meet the meadow directly after lowering.
for j in range(5):
    a=j*math.tau/5
    tube('Surface roots',[(x,.8,z),(x+math.cos(a)*.09,.71,z+math.sin(a)*.09),(x+math.cos(a)*.18,.70,z+math.sin(a)*.18)],[.028,.018,.002],bark,8)
# Reuse the detailed branching geometry with varied scale and orientation.
# Blender coordinates are (scene x, -scene z, scene y).
for (collection,name,material),(vs,fs) in list(batch.items()):
    if collection!='01 / Specimen tree':continue
    base=[(vx,vy,vz-.33) for vx,vy,vz in vs]
    vertices=list(base);faces=list(fs)
    for xx,zz,scale,angle in [(mid-.45,-1.05,.72,.6),(mid+.55,-.95,.85,2.1),(mid+.62,1.08,.68,3.4),(mid-.38,1.16,.6,4.7)]:
        offset=len(vertices)
        for vx,vy,vz in base:
            dx=(vx-x)*scale;dy=(vy+z)*scale
            vertices.append((xx+dx*math.cos(angle)-dy*math.sin(angle),-zz+dx*math.sin(angle)+dy*math.cos(angle),.37+(vz-.37)*scale))
        faces.extend([tuple(offset+i for i in f) for f in fs])
    batch[(collection,name,material)]=[vertices,faces]

# Chalet: cedar boards, deep window reveals, individual slate shingles, porch and chimney.
active='02 / HUGO alpine chalet';cz=.18
box('Stone footing',(mid,.415,cz),(1.12,.15,1.22),rocks[2])
box('Insulated wall core',(mid,.84,cz),(1.02,.74,1.10),wood[0])
for j in range(13):
    yy=.5+j*.052
    for side in [-1,1]:
        box('Horizontal cedar siding',(mid+side*.52,yy,cz),(.034,.045,1.12),wood[j%5])
        box('Side cedar siding',(mid,yy,cz+side*.56),(1.04,.045,.028),wood[(j+2)%5])
# Gable ends.
for xx in [mid-.54,mid+.54]:
    mesh('Gable end',[(xx,1.19,cz-.56),(xx,1.19,cz+.56),(xx,1.69,cz)],[(0,1,2),(2,1,0)],wood[2])
    for j in range(9):
        yy=1.21+j*.049;w=max(.03,1.12*(1-(yy-1.19)/.5))
        box('Gable boards',(xx-.005,yy,cz),(.035,.042,w),wood[j%5])
angle=math.atan2(.5,.64)
for side in [-1,1]:
    # Local z axis follows roof slope. Separate staggered tiles catch highlights.
    for row in range(10):
        zz=.035+row*.067;yy=1.72-zz*math.tan(angle)
        for col in range(9):
            xx=mid-.59+col*.14+(row%2)*.035
            box('Overlapping slate shingles',(xx,yy,cz+side*zz),(.137,.016,.102),slate[(row//3+col//3)%4],side*angle)
    tube('Eave gutter',[(mid-.68,1.18,cz+side*.69),(mid+.68,1.18,cz+side*.69)],[.025,.025],dark,12)
for j in range(12):box('Copper ridge caps',(mid-.64+j*.115,1.733,cz),(.117,.035,.065),dark)
for xx in [mid-.57,mid+.57]:
    for side in [-1,1]:tube('Gable fascia',[(xx,1.17,cz+side*.68),(xx,1.72,cz)],[.025,.025],wood[0],6)
for zz in [cz-.57,cz+.57]:box('Corner timber',(mid-.55,.85,zz),(.065,.75,.065),wood[0])
for zz in [cz-.32,cz+.32]:
    box('Window recess',(mid-.549,.91,zz),(.045,.31,.27),dark)
    box('Amber glazing',(mid-.576,.91,zz),(.009,.245,.207),window)
    for y in [.765,1.055]:box('Window header and sill',(mid-.60,y,zz),(.075,.035,.32),wood[4])
    for side in [-1,1]:box('Window jamb',(mid-.59,.91,zz+side*.13),(.045,.29,.025),wood[4])
    box('Window mullion',(mid-.60,.91,zz),(.025,.25,.016),wood[0])
    box('Window transom',(mid-.60,.91,zz),(.025,.016,.23),wood[0])
    for side in [-1,1]:
        box('Shutter',(mid-.57,.91,zz+side*.19),(.028,.29,.075),wood[0])
        for q in range(7):box('Shutter louvers',(mid-.59,.8+q*.033,zz+side*.19),(.016,.018,.066),wood[3])
box('Door',(mid-.567,.72,cz),(.035,.48,.19),wood[0])
for j in range(5):box('Door vertical panels',(mid-.59,.72,cz-.075+j*.038),(.012,.43,.029),wood[2])
box('Door handle',(mid-.607,.73,cz+.055),(.018,.045,.01),brass)
box('HUGO signboard',(mid-.585,1.14,cz),(.024,.095,.26),brass)
lettering('HUGO',(mid-.601,1.115,cz),.052,dark,True)
box('Porch frame',(mid-.78,.46,cz),(.45,.08,1.02),wood[0])
for j in range(12):box('Porch planks',(mid-.79,.51,cz-.47+j*.085),(.43,.03,.077),wood[j%5])
for j in range(3):box('Front steps',(mid-1.08-j*.10,.47-j*.043,cz),(.14,.055,.36),wood[2])
for zz in [cz-.46,cz+.46]:
    for xx in [mid-.96,mid-.63]:box('Porch post',(xx,.69,zz),(.032,.4,.032),wood[0])
    box('Porch handrail',(mid-.79,.9,zz),(.44,.035,.04),wood[3])
for j in range(7):
    for k in range(2):box('Chimney masonry',(mid+.25+(k-.5)*.105,1.47+j*.056,cz+.31),(.1,.05,.19),rocks[(j+k)%4])
box('Chimney cap',(mid+.25,1.87,cz+.31),(.29,.045,.28),rocks[2])
box('Chimney flue',(mid+.25,1.895,cz+.31),(.16,.01,.15),dark)

# Continuous triangulated mountain terrain. Snow follows irregular elevation and slope.
active='03 / Alpine mountain range'
nx,nz=64,64;points=[];heights=[]
def height(x,z):
    peaks=[(far+.10,.16,2.05,.65,.57),(far+.53,-.91,1.65,.52,.43),(far+.76,1.03,1.39,.49,.43),(far-.45,.82,.8,.43,.42)]
    h=0
    for px,pz,hh,wx,wz in peaks:
        d=math.sqrt(((x-px)/wx)**2+((z-pz)/wz)**2)
        h=max(h,hh*max(0,1-d/1.8)**1.4)
    n=noise_vector(Vector((x*7,z*7,1))).x
    fine=noise_vector(Vector((x*22,z*22,4))).y
    return .37+max(0,h*(1+.16*n)+.04*fine*min(1,h*3))
for i in range(nx+1):
    for j in range(nz+1):
        x=far-1.12+i*2.35/nx;z=-1.53+j*3.08/nz
        points.append((x,height(x,z),z))
for i in range(nx):
    for j in range(nz):
        a=i*(nz+1)+j;b=a+nz+1
        for ids in [(a,b,a+1),(b,b+1,a+1)]:
            vs=[points[k] for k in ids];center=sum((Vector(v) for v in vs),Vector())/3
            normal=(Vector(vs[1])-Vector(vs[0])).cross(Vector(vs[2])-Vector(vs[0])).normalized()
            snowline=1.35+.12*math.sin(center.x*12+center.z*5)+.1*noise_vector(center*9).x
            snowy=center.y>snowline and abs(normal.y)>.36
            tone=noise_vector(center*3).x
            m=snow[min(2,max(0,int(1+tone)))] if snowy else rocks[min(5,max(0,int((center.y-.37)*1.3+tone*.8)))]
            mesh('Snow fields' if snowy else 'Eroded rock ridges',vs,[(0,2,1)],m)
for j in range(75):
    xx=far-1.0+random.random()*2.1;zz=random.uniform(-1.45,1.45);yy=height(xx,zz)
    if yy<.92:rock('Talus boulders',(xx,yy-.015,zz),(.035+random.random()*.07,.04+random.random()*.08,.05),rocks[j%4],j+900)

# Spruce grove: articulated branches, individual needle sprays; no cone primitives.
active='04 / Spruce grove'
for tree,(xx,zz,h) in enumerate([(mid+.5,-1.12,.9),(mid+.95,1.08,.88),(far-.65,-1.15,.75),(far-.63,1.27,.63),(mid+.32,1.34,.64),(far+.3,-1.4,.7),(far+.65,1.43,.55)]):
    ground=height(xx,zz) if xx>far-1.12 else .38
    tube('Spruce trunks',[(xx,ground,zz),(xx,ground+h,zz)],[.025,.004],bark,10)
    for level in range(8):
        yy=ground+h*(.2+level*.095);r=h*(.31-level*.029)
        for branch in range(7):
            a=branch*math.tau/7+level*.7+tree;end=Vector((xx+math.cos(a)*r,yy-.04,zz+math.sin(a)*r))
            start=Vector((xx,yy,zz));tube('Spruce boughs',[start,end],[.007,.001],bark,5)
            for q in range(6):
                p=start.lerp(end,.2+q*.14)
                for side in [-1,1]:
                    direction=(math.cos(a+side*.65),.4,math.sin(a+side*.65))
                    leaf_shape(p,direction,r*.45,.015+(.008*(7-level)/7),pine[(branch+q)%3],'Spruce needle sprays')

active='05 / Landscape tray'
box('Walnut plinth',(4.65,.25,0),(5.8,.22,3.35),wood[0])
for z in [-1.66,1.66]:box('Brass tray inlay',(4.65,.37,z),(5.8,.035,.025),brass)
box('Meadow ground',(4.65,.37,0),(5.7,.035,3.23),soil)
for j in range(120):
    xx=random.uniform(1.86,7.35);zz=random.uniform(-1.5,1.5)
    if abs(xx-mid)<.72 and abs(zz-cz)<.75:continue
    if xx>far-.9:continue
    for k in range(4):leaf_shape((xx,.395,zz),(random.uniform(-1,1),1,random.uniform(-1,1)),random.uniform(.03,.09),.009,leaf[k],'Meadow grass')
for j in range(13):
    xx=mid-1.27-j*.085;zz=cz+math.sin(j*.5)*.10
    rock('Stepping stones',(xx,.39,zz),(.055,.02,.09),rocks[j%4],j+500)
for j in range(22):
    xx=random.uniform(1.9,5.2);zz=random.uniform(-1.5,1.5)
    if abs(xx-mid)<.85 and abs(zz-cz)<.8:continue
    rock('Garden stones',(xx,.39,zz),(.04,.035,.055),rocks[j%4],j+400)
for j in range(16):box('Fence pickets',(3+j*.23,.53,1.48),(.028,.29,.03),wood[1])
for y in [.48,.61]:box('Fence rails',(4.72,y,1.48),(3.52,.027,.025),wood[3])
box('Diorama maker plate',(4.65,.255,1.69),(1.1,.105,.014),brass)
lettering('LANDSCAPES BY HUGO',(4.65,.235,1.704),.044,dark)

# A real articulated rotor, used for shutter-speed exposure integration in the app.
wind_center=(mid+.1,1.66,.98)
tube('Windmill tapered tower',[(wind_center[0]+.05,.39,.98),(wind_center[0]+.05,1.66,.98)],[.105,.06],wood[1],16)
box('Windmill foundation',(wind_center[0]+.05,.4,.98),(.28,.08,.28),rocks[2])
tube('Windmill axle',[(wind_center[0]-.07,1.66,.98),(wind_center[0]+.13,1.66,.98)],[.045,.045],brass,16)
active='06 / Animated wind rotor'
tube('Rotor hub',[(-.04,0,0),(.04,0,0)],[.075,.075],brass,24)
for blade in range(4):
    a=blade*math.pi/2
    def rp(y,z):return (-.055,y*math.cos(a)-z*math.sin(a),y*math.sin(a)+z*math.cos(a))
    tube('Rotor spars',[rp(.06,0),rp(.46,0)],[.014,.008],wood[0],6)
    for side in [-1,1]:tube('Sail frame',[rp(.17,side*.055),rp(.44,side*.075)],[.008,.008],wood[3],6)
    for j in range(7):
        y=.17+j*.04;w=.052+(y-.17)*.08
        mesh('Ivory sail louvers',[rp(y,-w),rp(y,w),rp(y+.028,w),rp(y+.028,-w)],[(0,1,2,3),(3,2,1,0)],ivory)
bpy.ops.object.empty_add(location=coord(wind_center));rotor=bpy.context.object;rotor.name='HUGO_WIND_ROTOR'
for c in list(rotor.users_collection):c.objects.unlink(rotor)
collections[active].objects.link(rotor)

# Material batches keep browser draw calls modest while named Blender collections
# retain the three requested asset categories for further editing.
for (collection,name,material), (vs,fs) in batch.items():
    data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.materials.append(bpy.data.materials[material]);data.update()
    obj=bpy.data.objects.new(name,data);collections[collection].objects.link(obj)
    if collection=='06 / Animated wind rotor':obj.parent=rotor
    if name in ['Eroded rock ridges','Snow fields']:
        bm=bmesh.new();bm.from_mesh(data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(data);bm.free()
        for poly in data.polygons:poly.use_smooth=True
    if any(w in name.lower() for w in ['trunk','bough','twig','pot']):
        for poly in data.polygons:poly.use_smooth=True
    if any(w in name.lower() for w in ['siding','timber','window','door','plank','slate','signboard','ridge cap','footing']):
        mod=obj.modifiers.new('Crafted edge bevel','BEVEL');mod.width=.002;mod.segments=2
        obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')

# Keep the chalet rooted at the same focus position, with a lower silhouette
# so the background mountain range stays visible through the optical camera.
chalet_pivot=Vector(coord((mid,.37,cz)))
chalet_scale=Matrix.Translation(chalet_pivot) @ Matrix.Scale(.75,4) @ Matrix.Translation(-chalet_pivot)
for obj in collections['02 / HUGO alpine chalet'].objects:
    obj.matrix_world=chalet_scale @ obj.matrix_world

# Save an editable file with a usable inspection camera and lights (excluded from GLB).
bpy.ops.object.camera_add(location=coord((1.8,3.4,6.5)));cam=bpy.context.object;cam.name='Landscape inspection camera'
target=Vector(coord((4.5,1,0)));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=48;bpy.context.scene.camera=cam
for p,power,size in [((1,6,3),500,5),((7,5,-3),700,4)]:
    bpy.ops.object.light_add(type='AREA',location=coord(p));o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.world.color=(.18,.18,.18)
bpy.context.scene.render.resolution_x=1440;bpy.context.scene.render.resolution_y=1000;bpy.context.scene.render.resolution_percentage=100
os.makedirs(os.path.join(ROOT,'assets'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','hugo-landscape.blend'))
bpy.ops.object.select_all(action='DESELECT')
for c in collections.values():
    for o in c.objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for c in collections.values() for o in c.objects)
bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets','hugo-landscape.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
print('HUGO landscape exported:',len(batch),'material batches')
