"""Build the editable HUGO studio and its web asset with Blender (no add-ons)."""
import bpy, math, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0, rough=.5, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metallic; p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    return m

navy=material('Midnight enamel',(.025,.045,.061),.45,.36)
wall=material('Mineral plaster',(.052,.073,.087),0,.95)
gold=material('Brushed champagne',(.48,.32,.14),.8,.3)
steel=material('Satin titanium',(.27,.34,.37),.82,.26)
black=material('Soft graphite',(.013,.02,.026),.1,.65)
ivory=material('Warm lettering',(.7,.76,.71),.1,.5)
blue=material('Ice blue illumination',(.14,.53,.68),.2,.3,2)
warm=material('Warm strip',(.95,.56,.22),0,.3,2)
wood=material('Smoked oak',(.12,.065,.035),0,.72)

# Helpers accept Three.js coordinates (x, y-up, z); glTF export handles conversion.
def loc(p): return (p[0],-p[2],p[1])
def finish(o,name,mat):
    o.name=name; o.data.materials.append(mat); return o
def box(name,p,s,mat,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc(p)); o=bpy.context.object
    o.dimensions=(s[0],s[2],s[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,name,mat)
    if bevel:
        m=o.modifiers.new('Machined edges','BEVEL'); m.width=bevel; m.segments=3
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o
def text(body,p,size,mat):
    bpy.ops.object.text_add(location=loc(p),rotation=(math.pi/2,0,0)); o=bpy.context.object
    o.data.body=body; o.data.align_x='CENTER'; o.data.size=size; o.data.extrude=.001; o.data.bevel_depth=.0005
    return finish(o,body,mat)
def line(name,points,mat,r=.008):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=r; c.bevel_resolution=2
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for q,p in zip(s.points,points): q.co=(*loc(p),1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(mat)
    return o
def ring(name,p,r,mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=10,location=loc(p),rotation=(math.pi/2,0,0),major_radius=r,minor_radius=.028)
    return finish(bpy.context.object,name,mat)

box('Back wall',(0,3.3,-5.5),(26,9,.2),wall)
for x in range(-12,14,2): box('Wall seam',(x,3.4,-5.36),(.018,8,.012),black,.003)
box('Architectural light',(0,6.4,-5.22),(22,.035,.035),warm,.008)
text('H U G O',(-7.7,4.9,-5.18),.55,ivory)
text('O P T I C A L   A T E L I E R',(-7.7,4.5,-5.17),.105,gold)
text('LIGHT  /  FORM  /  PRECISION',(-7.7,4.22,-5.17),.085,ivory)

for n,cx in enumerate([-3.8,-.7,2.4]):
    box('Optics study frame',(cx,3.9,-5.13),(2.7,2.05,.12),gold)
    box('Optics study print',(cx,3.9,-5.05),(2.57,1.92,.035),navy)
    text(['01   CONVERGENCE','02   DEPTH OF FIELD','03   IMAGE FORMATION'][n],(cx,4.66,-5.02),.115,ivory)
    line('Optical axis',[(cx-1.1,3.95,-5),(cx+1.1,3.95,-5)],steel,.004)
    for j in [-2,-1,0,1,2]:
        y=3.95+j*.18
        line('Ray study',[(cx-1.05,y,-5),(cx-.12,y,-5),(cx+.85,3.95+j*.025*n,-5)],blue,.006)
    line('Lens outline',[(cx+.11*math.sin(a),3.95+.64*math.cos(a),-4.99) for a in [i*math.tau/64 for i in range(65)]],gold,.012)
    text('HUGO  /  OPTICAL STUDIES',(cx,3.13,-5.01),.083,gold)

for cx in [-7.8,6.6]:
    box('Instrument cabinet',(cx,.7,-4.6),(3.6,1.8,1.15),navy,.06)
    box('Oak cabinet top',(cx,1.65,-4.58),(3.8,.12,1.3),wood,.035)
    for y in [.16,.64,1.12]:
        for x in [cx-.87,cx+.87]:
            box('Drawer',(x,y,-3.98),(1.65,.42,.06),black,.018)
            box('Drawer pull',(x,y+.06,-3.91),(.5,.035,.05),gold,.014)
    for j in range(3):
        x=cx-.95+j*.95
        box('Display plinth',(x,1.77,-4.55),(.65,.12,.5),black)
        box('Lens stand',(x,2.03,-4.55),(.035,.45,.05),gold,.008)
        ring('Display optical element',(x,2.4,-4.55),.32+j*.045,steel)
        ring('Coating accent',(x,2.4,-4.54),.29+j*.045,blue)
    text('HUGO  /  ARCHIVE',(cx,1.48,-3.96),.11,gold)

# Framed bench furniture gives the floating optics platform a physical support.
for x in [-5.6,5.9]:
    for z in [-1.7,1.7]:
        box('Bench leg',(x,-1.4,z),(.24,2.35,.24),navy,.045)
        box('Bench foot',(x,-2.52,z),(.45,.14,.48),black,.04)
    box('Bench crossbar',(x,-2.05,0),(.18,.16,3.5),steel)
box('Bench front apron',(.2,-.52,2.03),(12.4,.62,.13),navy)
box('Apron brass inlay',(.2,-.79,2.11),(12.2,.012,.014),gold,.003)
text('H U G O',(-4.7,-.57,2.11),.18,ivory)
text('PRECISION OPTICS  /  No. 001',(-2.5,-.55,2.11),.085,gold)
for i in range(28): box('Vent slot',(2.4+i*.09,-.5,2.105),(.026,.24,.01),black,.006)
ring('Control bezel',(5.3,-.48,2.12),.17,gold)
box('Bench status LED',(4.8,-.47,2.13),(.06,.025,.012),blue,.006)

# Convert lettering/curves before export to guarantee identical web geometry.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.convert(target='MESH')
os.makedirs(os.path.join(ROOT,'assets'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','hugo-studio.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets','hugo-studio.glb'),export_format='GLB',export_apply=True)
print('HUGO studio exported')
