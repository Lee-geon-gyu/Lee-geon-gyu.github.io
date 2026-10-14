"""Build browser-sized derivatives without changing architecture/lightmap UVs.

Run with Blender --background --factory-startup --python tools/build_runtime_models.py.
Original meshes remain available to the native geometry and lighting pipeline.
"""
import bpy, bmesh, math, json, sys
import numpy as np
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SPACE=json.loads((ROOT/'src/navigation/space-layout.json').read_text(encoding='utf-8-sig'))
GARDEN=json.loads((ROOT/'src/scene/garden-layout.json').read_text(encoding='utf-8-sig'))
OUT=ROOT/'public/assets/runtime'
OUT.mkdir(parents=True,exist_ok=True)
TEX=ROOT/'tools/generated/runtime-textures'
TEX.mkdir(parents=True,exist_ok=True)

def clear():
    for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
    for collection in [bpy.data.meshes,bpy.data.materials,bpy.data.images]:
        for item in list(collection):collection.remove(item)

def triangles(mesh):return sum(len(p.vertices)-2 for p in mesh.polygons)

def leaf_cards(obj, keep=1, leaf_scale=1):
    """Sample complete native leaf silhouettes, preserving their texture UVs."""
    mesh=obj.data;n=len(mesh.vertices)
    positions=np.empty(n*3,dtype=np.float32);mesh.vertices.foreach_get('co',positions);positions=positions.reshape(-1,3)
    edges=np.empty(len(mesh.edges)*2,dtype=np.int32);mesh.edges.foreach_get('vertices',edges);edges=edges.reshape(-1,2)
    parent=list(range(n))
    def find(a):
        while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
        return a
    for a,b in edges:
        a=find(int(a));b=find(int(b))
        if a!=b:parent[b]=a
    groups={}
    for i in range(n):groups.setdefault(find(i),[]).append(i)
    loop_ids=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',loop_ids)
    loop_uv=np.empty(len(mesh.loops)*2,dtype=np.float32);mesh.uv_layers.active.data.foreach_get('uv',loop_uv)
    loop_uv=loop_uv.reshape(-1,2)
    verts=[];faces=[];uvs=[];materials=[];remap={}
    for index,ids in enumerate(groups.values()):
        # Evenly distributed, reproducible canopy sampling. Slightly wider cards
        # keep dense silhouettes without tens of thousands of subpixel leaves.
        if ((index*2654435761)%4294967296)/4294967296 >= keep:continue
        if len(ids)<3:continue
        points=positions[ids];center=points.mean(axis=0);points=center+(points-center)*leaf_scale
        for old,point in zip(ids,points):remap[old]=len(verts);verts.append(tuple(point))
    for p in mesh.polygons:
        if int(p.vertices[0]) not in remap:continue
        faces.append(tuple(remap[int(v)] for v in p.vertices));materials.append(p.material_index)
        uvs.extend(tuple(loop_uv[i]) for i in p.loop_indices)
    result=bpy.data.meshes.new(mesh.name+'_Browser_Leaves');result.from_pydata(verts,[],faces);result.update()
    layer=result.uv_layers.new(name='UVMap')
    for i,v in enumerate(uvs):layer.data[i].uv=v
    for material in mesh.materials:result.materials.append(material)
    for p,m in zip(result.polygons,materials):p.material_index=m
    before=triangles(mesh);obj.data=result
    print('LEAF_CARDS',obj.name,'leaves',len(faces),'triangles',before,triangles(result),flush=True)

def simplify(obj,ratio):
    before=triangles(obj.data)
    # Scanned tubes have duplicated seam vertices. Weld before decimation so
    # disconnected triangle islands cannot impose a huge minimum face count.
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000002)
    bm.to_mesh(obj.data);bm.free()
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('Browser_Silhouette','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print('SIMPLIFIED',obj.name,before,triangles(obj.data),flush=True)

def prepare_materials(architecture=False):
    override={'Warm_Pale_Limestone','Ivory_Polished_Column','Furniture_Ivory_Porcelain','Pale_Marble_Planter','Jute'}
    for mat in bpy.data.materials:
        if not mat.use_nodes:continue
        bsdf=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if not bsdf:continue
        for socket in ['Roughness','Metallic']+(['Base Color'] if architecture and mat.name in override else []):
            for link in list(bsdf.inputs[socket].links):mat.node_tree.links.remove(link)
    for image in list(bpy.data.images):
        if image.type!='IMAGE' or not image.size[0]:continue
        limit=1024 if architecture else 512
        scale=min(1,limit/max(image.size))
        if scale<1:image.scale(max(1,round(image.size[0]*scale)),max(1,round(image.size[1]*scale)))
        # Keep alpha silhouettes lossless; opaque source scans use compact JPEG.
        alpha=not architecture and 'lea' in image.name.lower() and 'diff' in image.name.lower()
        image.file_format='PNG' if alpha else 'JPEG'
        image.filepath_raw=str(TEX/(image.name.replace('/','_')+('.png' if alpha else '.jpg')))
        image.save();image.pack()

def spatial_chunks(obj):
    """Let the browser cull wall planting outside the camera instead of drawing
    one courtyard-sized mesh. Keep face silhouettes, UVs and material indices."""
    mesh=obj.data;groups={}
    roof=SPACE['upperRoof'];fa,fb=SPACE['balconyFront'];roof_end=fb[0]+roof['eastOverhang']
    west=SPACE['westFacade'];roof_left=west['wallCenterX']+west['wallThickness']/2
    roof_low=SPACE['upperCeiling']+SPACE['upperRoofThickness']-.22-GARDEN['roofCornice']['drop'][1]-.18
    for polygon in mesh.polygons:
        center=polygon.center
        key=(math.floor(center.x/2.5),math.floor(center.y/2.5),math.floor(center.z/3))
        x,z,y=center.x,-center.y,center.z
        front=fa[1]+(fb[1]-fa[1])*(x-fa[0])/(fb[0]-fa[0])+roof['frontOverhang']
        roof_front=roof_left-.10<=x<=roof_end+.26 and abs(z-front)<=.26
        roof_side=abs(x-roof_end)<=.26 and SPACE['upperClosure'][3]-.30<=z<=front+.26
        # A small connected cornice needs at most the existing four leaf draws
        # and one stem draw, instead of a new set in every 2.5m garden cell.
        if y>=roof_low and (roof_front or roof_side):key=('roof-cornice',0,0)
        groups.setdefault(key,[]).append(polygon)
    for key,polygons in groups.items():
        remap={};vertices=[];faces=[];uvs=[]
        for polygon in polygons:
            face=[]
            for vertex in polygon.vertices:
                if vertex not in remap:remap[vertex]=len(vertices);vertices.append(tuple(mesh.vertices[vertex].co))
                face.append(remap[vertex])
            faces.append(tuple(face))
            uvs.extend(tuple(mesh.uv_layers.active.data[i].uv) for i in polygon.loop_indices)
        part=bpy.data.meshes.new(obj.name+str(key));part.from_pydata(vertices,[],faces);part.update()
        for material in mesh.materials:part.materials.append(material)
        if uvs:
            layer=part.uv_layers.new(name='UVMap')
            for i,uv in enumerate(uvs):layer.data[i].uv=uv
        for polygon,original in zip(part.polygons,polygons):polygon.material_index=original.material_index
        child=bpy.data.objects.new(part.name,part);bpy.context.collection.objects.link(child);child.matrix_world=obj.matrix_world.copy()
    bpy.data.objects.remove(obj,do_unlink=True)

def export(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',export_yup=True,
        export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
        export_draco_position_quantization=16,export_draco_texcoord_quantization=14,
        export_image_format='AUTO',export_image_quality=82,export_cameras=False,export_lights=False)
    print('RUNTIME_EXPORTED',name,(OUT/name).stat().st_size,flush=True)

if '--garden-only' not in sys.argv:
    clear();bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/connected-atelier.glb'))
    prepare_materials(True);export('atelier.glb')

# Architecture-only edits must not regenerate the separately approved foliage.
if '--architecture-only' in sys.argv:sys.exit(0)

clear();bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/rooted-garden.glb'))
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    if 'Leaves' in obj.name:leaf_cards(obj,.30,1.35)
    else:simplify(obj,.035)
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH':spatial_chunks(obj)
prepare_materials();export('garden.glb')
if '--garden-only' in sys.argv or '--scene-only' in sys.argv:sys.exit(0)

clear();bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/tree-small.glb'))
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    if obj.name=='Cube':bpy.data.objects.remove(obj,do_unlink=True);continue
    if any(m and 'lea' in m.name.lower() for m in obj.data.materials):leaf_cards(obj,.06,1.8)
    else:simplify(obj,.22)
prepare_materials();export('tree.glb')
