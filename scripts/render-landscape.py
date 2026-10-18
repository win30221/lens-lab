"""Render the saved Blender landscape for model QA, without changing the .blend."""
import bpy, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.12))
floor=bpy.context.object;floor.name='Preview ground (not exported)'
m=bpy.data.materials.new('Preview charcoal');m.diffuse_color=(.033,.046,.052,1);floor.data.materials.append(m)
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.25,.30,.34,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.45
scene.render.filepath=os.path.join(ROOT,'artifacts','hugo-landscape-blender.png')
os.makedirs(os.path.dirname(scene.render.filepath),exist_ok=True)
bpy.ops.render.render(write_still=True)
