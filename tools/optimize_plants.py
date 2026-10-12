import bpy,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
for obj in list(bpy.context.scene.objects):bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(root/'tools/source-assets/models/potted_plant_02/potted_plant_02.gltf'))
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    bpy.context.view_layer.objects.active=obj
    if 'pot' in obj.data.materials[0].name and 'leaves' not in obj.data.materials[0].name:
        mod=obj.modifiers.new('Keep curved pottery detail','DECIMATE');mod.ratio=.05;bpy.ops.object.modifier_apply(modifier=mod.name)
    print('PLANT_WEB',obj.name,len(obj.data.polygons),flush=True)
bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/potted-02.glb'),export_format='GLB',export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
