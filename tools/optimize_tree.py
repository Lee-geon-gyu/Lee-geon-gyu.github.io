import bpy, pathlib, time
root=pathlib.Path(__file__).resolve().parents[1]
source=root/'tools/source-assets/models/tree_small_02/tree_small_02.gltf'
for obj in list(bpy.context.scene.objects): bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(source))
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH': continue
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH': continue
    bpy.context.view_layer.objects.active=obj
    if len(obj.data.polygons)>20000:
        mod=obj.modifiers.new('Web foliage LOD','DECIMATE')
        mod.ratio=.25
        mod.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    print('TREE_LOD',obj.name,len(obj.data.polygons),flush=True)
bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/tree-small.glb'),export_format='GLB',export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('TREE_OPTIMIZED',(root/'public/assets/tree-small.glb').stat().st_size,flush=True)
