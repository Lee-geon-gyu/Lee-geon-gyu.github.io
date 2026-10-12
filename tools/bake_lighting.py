"""Bake smooth indirect radiance; fine direct shadows remain live at 4096 px."""
import bpy, pathlib, math, json
import numpy as np
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[1]
LIGHT=json.loads((root/'src/scene/lighting-layout.json').read_text(encoding='utf-8-sig'))
decor=json.loads((root/'src/scene/wall-decor.json').read_text(encoding='utf-8-sig'))
GARDEN=json.loads((root/'src/scene/garden-layout.json').read_text(encoding='utf-8-sig'))
bpy.ops.wm.open_mainfile(filepath=str(root/'tools/generated/connected-atelier.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=64
scene.cycles.use_denoising=True;scene.cycles.max_bounces=5
prefs=bpy.context.preferences.addons['cycles'].preferences
for backend in ['OPTIX','CUDA']:
    try:
        prefs.compute_device_type=backend;prefs.get_devices()
        active=[d for d in prefs.devices if d.type!='CPU']
        if active:
            for d in prefs.devices:d.use=d.type!='CPU'
            scene.cycles.device='GPU';print('BAKE_GPU',[(d.name,d.type) for d in active],flush=True);break
    except Exception:pass
world=bpy.data.worlds.new('Afternoon_Environment');world.use_nodes=True;scene.world=world
nodes=world.node_tree.nodes;env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(root/'public/assets/afternoon.hdr'))
background=nodes.get('Background');background.inputs['Strength'].default_value=LIGHT['bakeEnvironment']
world.node_tree.links.new(env.outputs['Color'],background.inputs['Color'])
sun_data=bpy.data.lights.new('Afternoon_Sun','SUN');sun_data.energy=LIGHT['sun']['intensity'];sun_data.color=LIGHT['sun']['color'];sun_data.angle=.035
sun=bpy.data.objects.new('Afternoon_Sun',sun_data);scene.collection.objects.link(sun)
direction=[b-a for a,b in zip(LIGHT['sun']['position'],LIGHT['sun']['target'])]
sun.rotation_euler=Vector((direction[0],-direction[2],direction[1])).to_track_quat('-Z','Y').to_euler()
door_data=bpy.data.lights.new('Open_Passage_Daylight','SUN');door_data.energy=.8;door_data.color=(1,.68,.38);door_data.angle=.07
door_sun=bpy.data.objects.new('Open_Passage_Daylight',door_data);scene.collection.objects.link(door_sun)
door_sun.rotation_euler=Vector((-3,8,-3)).to_track_quat('-Z','Y').to_euler()
meshes=[o for o in scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:obj.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();architecture=bpy.context.object;architecture.name='Connected_Atelier'
if len(architecture.data.uv_layers)!=1:raise RuntimeError('Architecture must have one material UV before adding the lightmap UV')
uv=architecture.data.uv_layers.new(name='IndirectLightUV');architecture.data.uv_layers.active=uv
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.00025,margin_method='FRACTION',area_weight=.6,correct_aspect=True,scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT');print('LIGHTMAP_UV_READY',len(architecture.data.polygons),flush=True)

# Use the same bright floor and rug surfaces for bounced light as in the runtime.
for mat in architecture.data.materials:
    if mat and mat.name in ['Warm_Pale_Limestone','Pale_Marble_Planter','Furniture_Ivory_Porcelain','Jute']:
        replacement='jute-rug.png' if mat.name=='Jute' else 'ivory-marble.png'
        bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(root/'public/assets'/replacement))
        mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])

def duplicate_hierarchy(obj,parent=None):
    new=obj.copy();scene.collection.objects.link(new);new.parent=parent
    for child in obj.children:duplicate_hierarchy(child,new)
    return new

def foliage_template(file):
    before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(file));created=set(scene.objects)-before
    group=bpy.data.objects.new('Foliage_Template',None);scene.collection.objects.link(group)
    for obj in created:
        if obj.parent not in created:obj.parent=group
    bpy.context.view_layer.update()
    points=[obj.matrix_world@Vector(corner) for obj in created if obj.type=='MESH' for corner in obj.bound_box]
    minimum=Vector([min(p[i] for p in points) for i in range(3)]);maximum=Vector([max(p[i] for p in points) for i in range(3)])
    return group,created,minimum,maximum

def place_foliage(file,placements):
    template,original,low,high=foliage_template(file)
    for placement in placements:
        x,z,height,y,rotation,*optional=placement
        width_scale=optional[0] if optional else 1
        clone=duplicate_hierarchy(template);scale=height/(high.z-low.z);clone.scale=(scale*width_scale,scale*width_scale,scale)
        centered=file.name!='tree-small.glb'
        clone.location=(x-((low.x+high.x)*scale*width_scale/2 if centered else 0),-z-((low.y+high.y)*scale*width_scale/2 if centered else 0),y-low.z*scale);clone.rotation_euler[2]=-rotation
    for obj in original:bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.objects.remove(template,do_unlink=True)

place_foliage(root/'public/assets/tree-small.glb',[*GARDEN['canopyTrees'],*GARDEN['bedTrees'],*GARDEN['roomTrees'],(-1.55,-6.35,.15,1.16,.2,1.2),(1.58,-2.36,1.9,4.38,.8),*[(p['position'][0],p['position'][1],p['plantHeight'],p['height'],p['rotation'],p['widthScale']) for p in GARDEN['rightAtelier']['pots']]])
place_foliage(root/'public/assets/tree-small.glb',[(p['position'][0],p['position'][1],p['plantHeight'],p['potHeight']+.016,p['rotation'],p['widthScale']) for p in GARDEN['stairWallPots']])
place_foliage(root/'public/assets/potted-02.glb',[(4.35,9.8,.8,0,1)])
place_foliage(root/'public/assets/models/potted_plant_04/potted_plant_04.gltf',[(-4.9,.72,.9,0,1)])
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/rooted-garden.glb'))
for i,(x,y,z,rotation) in enumerate(decor['lamps']):
    data=bpy.data.lights.new('Warm_Sconce_'+str(i),'POINT');data.energy=35;data.color=(1,.56,.25);data.shadow_soft_size=.08
    light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light)
    light.location=(x+math.sin(rotation)*.12,-z-math.cos(rotation)*.12,y)
for i,(x,y,z,angle) in enumerate(decor['stairLamps']):
    data=bpy.data.lights.new('Stair_Side_Warm_'+str(i),'POINT');data.energy=45;data.color=(1,.63,.30);data.shadow_soft_size=.13
    light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light);light.location=(x-.12,-z,y)
for i,(x,y,z,angle) in enumerate(decor['stepLights']):
    data=bpy.data.lights.new('Step_Glow_'+str(i),'POINT');data.energy=14;data.color=(1,.72,.40);data.shadow_soft_size=.05
    light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light);light.location=(x-.07,-z,y)
x,y,z=decor['galleryLight'];data=bpy.data.lights.new('Gallery_Amber_Fill','POINT');data.energy=150;data.color=(1,.78,.49);data.shadow_soft_size=.35
light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light);light.location=(x,-z,y)
ceiling=decor['ceilingLight'];x,y,z=ceiling['position']
data=bpy.data.lights.new('Library_Central_Pendant','POINT');data.energy=110;data.color=(1,.80,.53);data.shadow_soft_size=.16
light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light);light.location=(x,-z,y-.07)
for i,fitting in enumerate(decor['ceilingSpots']):
    x,y,z=fitting['position'];data=bpy.data.lights.new('Modeled_Ceiling_Spot_'+str(i),'POINT');data.energy=fitting['power'];data.color=(1,.80,.53);data.shadow_soft_size=.064
    light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light);light.location=(x,-z,y-.018)
for i,fixture in enumerate([*decor['interiorStrips'],*decor['interiorFill']]):
    x,y,z=fixture['position'];data=bpy.data.lights.new('Interior_Fixture_'+str(i),'AREA')
    data.energy=fixture['power'];data.color=fixture['color'];data.shape='RECTANGLE'
    data.size=fixture['width'];data.size_y=fixture.get('height',.035)
    obj=bpy.data.objects.new(data.name,data);scene.collection.objects.link(obj);obj.location=(x,-z,y-.012)
    # Default -Z emission points down in Blender's Z-up coordinate system.
bpy.ops.object.select_all(action='DESELECT');architecture.select_set(True);bpy.context.view_layer.objects.active=architecture
print('FOLIAGE_SHADOWS_READY',len(scene.objects),flush=True)
image=bpy.data.images.new('Afternoon_Indirect_Light',width=2048,height=2048,alpha=False,float_buffer=True)
image.colorspace_settings.name='Non-Color'
for mat in architecture.data.materials:
    if not mat:continue
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;node.name='Indirect_Light_Bake_Target';mat.node_tree.nodes.active=node
scene.render.bake.use_pass_color=False;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=True
scene.render.bake.margin=4
architecture.data.uv_layers['IndirectLightUV'].active_render=True
bpy.ops.object.bake(type='DIFFUSE',uv_layer='IndirectLightUV')
# Preserve high sunlight values in a compact PNG; runtime restores the scale.
pixels=np.empty(len(image.pixels),dtype=np.float32);image.pixels.foreach_get(pixels)
pixels=pixels.reshape(-1,4);pixels[:,:3]/=4;image.pixels.foreach_set(pixels.reshape(-1))
out=root/'public/assets/atelier-indirect.png';image.filepath_raw=str(out);image.file_format='PNG';image.save()
architecture.data.uv_layers.active_index=0
architecture.data.uv_layers[0].active_render=True
bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/connected-atelier.glb'),export_format='GLB',use_selection=True,export_yup=True,export_texcoords=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('INDIRECT_BAKED',out.stat().st_size,flush=True)
