"""Denoise the baked radiance in Blender, retaining its UV layout and linear data."""
import bpy,pathlib,shutil,struct
root=pathlib.Path(__file__).resolve().parents[1]
source=root/'public/assets/atelier-indirect.png'
shutil.copy2(source,root/'tools/generated/atelier-indirect-before-denoise.png')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
scene.render.resolution_x=2048;scene.render.resolution_y=2048;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Raw';scene.view_settings.look='None'
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.color_depth='8'
image=bpy.data.images.load(str(source));image.colorspace_settings.name='Non-Color'
group=bpy.data.node_groups.new('Linear_Indirect_Denoise','CompositorNodeTree')
group.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
load=group.nodes.new('CompositorNodeImage');load.image=image
denoise=group.nodes.new('CompositorNodeDenoise')
output=group.nodes.new('NodeGroupOutput')
group.links.new(load.outputs['Image'],denoise.inputs['Image']);group.links.new(denoise.outputs['Image'],output.inputs['Image'])
scene.compositing_node_group=group
bpy.ops.render.render()
result=bpy.data.images['Render Result'];temporary=root/'tools/generated/denoised-indirect.png'
result.save_render(str(temporary),scene=scene)
dimensions=struct.unpack('>II',temporary.read_bytes()[16:24]);print('DENOISED_SIZE',dimensions,flush=True)
assert dimensions==(2048,2048),'Refusing to replace the light map with the wrong render size.'
shutil.copy2(temporary,source);print('DENOISED_MAP',source.stat().st_size,flush=True)
