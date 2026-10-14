"""Re-encode runtime foliage with submillimeter geometry precision.

No decimation or silhouette changes. Run with Blender, then run
restore_runtime_quality.py to retain the source-resolution texture encoding.
"""
import bpy,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for name in (['garden.glb'] if '--garden-only' in sys.argv else ['garden.glb','tree.glb']):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    target=ROOT/'public/assets/runtime'/name
    bpy.ops.import_scene.gltf(filepath=str(target))
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_yup=True,
        export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=10,
        export_draco_position_quantization=14,export_draco_texcoord_quantization=12,
        export_tangents=False,export_cameras=False,export_lights=False)
    print('REPACKED',name,target.stat().st_size,flush=True)
