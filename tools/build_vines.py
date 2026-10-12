"""Fine hanging foliage using an actual scanned leaf from the CC0 tree asset."""
import bpy, math, random, json
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

root=Path(__file__).resolve().parents[1]
random.seed(72)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/tree-small.glb'))
source=next(o for o in bpy.context.scene.objects if o.type=='MESH' and any('lea' in m.name.lower() for m in o.data.materials))
mesh=source.data
adj=[[] for _ in mesh.vertices]
for edge in mesh.edges:
    a,b=edge.vertices;adj[a].append(b);adj[b].append(a)
seen=set();components=[]
for i in range(len(adj)):
    if i in seen:continue
    stack=[i];seen.add(i);part=[]
    while stack:
        v=stack.pop();part.append(v)
        for w in adj[v]:
            if w not in seen:seen.add(w);stack.append(w)
    if len(part)>3:components.append(part)
components.sort(key=len)
part=components[len(components)//2];ids=set(part)
polygons=[p for p in mesh.polygons if all(v in ids for v in p.vertices)]
points=np.array([tuple(mesh.vertices[v].co) for v in part]);center=points.mean(axis=0)
_,vectors=np.linalg.eigh(np.cov((points-center).T));long=Vector(vectors[:,-1]);normal=Vector(vectors[:,0]);right=long.cross(normal).normalized()
basis=Matrix((right,long,normal));transform={v:i for i,v in enumerate(part)}
coords=[basis@(mesh.vertices[v].co-Vector(center)) for v in part]
extent=max(v.y for v in coords)-min(v.y for v in coords);scale=.056/extent
verts=[(v.x*scale,v.y*scale+.028,v.z*scale) for v in coords]
leaf_mesh=bpy.data.meshes.new('Scanned_Leaf');leaf_mesh.from_pydata(verts,[],[tuple(transform[v] for v in p.vertices) for p in polygons]);leaf_mesh.update()
uv=leaf_mesh.uv_layers.new(name='UVMap')
for new,original in zip(leaf_mesh.polygons,polygons):
    for ni,oi in zip(new.loop_indices,original.loop_indices):uv.data[ni].uv=mesh.uv_layers.active.data[oi].uv
leaf_mesh.materials.append(source.data.materials[polygons[0].material_index])
for p in leaf_mesh.polygons:p.use_smooth=True
for obj in list(bpy.context.scene.objects):bpy.data.objects.remove(obj,do_unlink=True)

stem_mat=bpy.data.materials.new('Vine_Stem');stem_mat.diffuse_color=(.11,.14,.041,1);stem_mat.use_nodes=True
stem_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.11,.14,.041,1)

garden=json.loads((root/'src/scene/garden-layout.json').read_text(encoding='utf-8-sig'))
def stair_soil_height(x,z):
    sections=garden['stairBedSections']
    for a,b in zip(sections,sections[1:]):
        pa,pb=a['edge'][1],b['edge'][1];dx,dz=pb[0]-pa[0],pb[1]-pa[1]
        if abs(dz)<1e-8:continue
        t=(z-pa[1])/dz
        if -1e-6<=t<=1+1e-6:return a['height']+(b['height']-a['height'])*t+.225
    raise ValueError('Plant root is outside the shared rising garden sections')
all_verts=[];all_faces=[];all_uv=[];all_materials=[];stems=[];leaf_count=0
active_variant=0;active_cap=None;active_normal=Vector((0,0,0))
leaf_profiles=[(1.50,.88),(.63,1.28),(.90,.67),(1.18,1.02)]
base_uv=[tuple(v.uv) for v in leaf_mesh.uv_layers.active.data]
space=json.loads((root/'src/navigation/space-layout.json').read_text(encoding='utf-8-sig'))
def east_x(z):
    points=space['eastWall']
    for a,b in zip(points,points[1:]):
        if a[1]<=z<=b[1]:return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1])
    return points[0][0] if z<points[0][1] else points[-1][0]
deform_east=False
def coords(p):return Vector((p[0]+(east_x(p[2])-5.37 if deform_east else 0),-p[2],p[1]))
def leaf(anchor,scale=1,angle=0):
    global leaf_count
    start=len(all_verts)
    # Leaves are tilted independently and sit on petioles, with the original
    # scanned curvature and photographic alpha silhouette preserved.
    rotation=Matrix.Rotation(random.uniform(-1.2,1.2),4,'X') @ Matrix.Rotation(random.uniform(-.8,.8),4,'Y') @ Matrix.Rotation(angle+random.uniform(-1.5,1.5),4,'Z')
    anchor=Vector(anchor)
    if active_cap is not None and anchor.y>active_cap-.12:
        anchor.y=active_cap-.12
    width,length=leaf_profiles[active_variant]
    shape=Matrix.Diagonal((scale*width,scale*length,scale,1))
    transform=Matrix.Translation(coords(anchor)) @ rotation @ shape
    all_verts.extend(tuple(transform@v.co) for v in leaf_mesh.vertices)
    for poly in leaf_mesh.polygons:
        all_faces.append(tuple(start+i for i in poly.vertices));all_materials.append(active_variant)
        all_uv.extend(base_uv[i] for i in poly.loop_indices)
    leaf_count+=1
def branch(points,radius=.004,leaf_size=1.4,spacing=.065):
    curve=bpy.data.curves.new('Rooted_Branch','CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=1
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for i,(p,q) in enumerate(zip(spline.points,points)):
        p.co=(*coords(q),1);p.radius=max(.22,1-i/(len(points)-1)*.78)
    stem=bpy.data.objects.new('Continuous_Ivy_Stem',curve);bpy.context.collection.objects.link(stem);curve.materials.append(stem_mat);stems.append(stem)
    distance=0
    for i in range(1,len(points)):
        distance+=(points[i]-points[i-1]).length
        if distance<spacing:continue
        distance=0
        for side in [-1,1]:
            leaf(points[i],leaf_size*random.uniform(.72,1.25),side*.85)

def wall(root_data):
    global active_variant,active_cap,active_normal
    random.seed(root_data['seed'])
    base=Vector(root_data['base']);along=Vector(root_data['along']);normal=Vector(root_data['normal']);up=Vector((0,1,0))
    style=root_data.get('style','wild');density=root_data.get('density',1)
    h=root_data['height'];span=root_data['span'];cap=root_data.get('wallTop',root_data.get('faceTop'))
    active_cap=cap;active_normal=normal
    active_variant={'fan':0,'column':1,'cascade':2,'dense':3,'wild':root_data['seed']%4}[style]
    trunk_count={'fan':5,'column':3,'cascade':4,'dense':6,'wild':4}[style]
    for trunk in range(trunk_count):
        phase=random.random()*math.tau;shift=random.uniform(-.20,.20)
        rise=h*random.uniform(.82,1.0)
        spread=(trunk/(trunk_count-1)-.5)*span*(.65 if style=='fan' else .34)
        points=[]
        for i in range(86):
            t=i/85
            lateral=shift+(.09 if style=='column' else .20)*math.sin(t*5+phase)+spread*t**1.4
            p=base+along*lateral+up*(rise*t)+normal*(.026+.025*math.sin(t*11+phase))
            if cap is not None:p.y=min(p.y,cap-.095)
            points.append(p)
        branch(points,.007,random.uniform(1.35,1.85),.069/density)
        # Only stems reaching the coping wrap over it. Every arc bends behind
        # the masonry and descends; there is no tall skyline-facing extension.
        if root_data.get('overWall') and trunk%2==0 and cap-base.y-rise<1.05:
            anchor=points[-1];reach=anchor+up*max(0,cap-.10-anchor.y)
            wrap=[anchor.lerp(reach,t) for t in [i/12 for i in range(13)]]
            for i in range(1,19):
                t=i/18
                wrap.append(reach-normal*(.44*t)+up*(.11*math.sin(math.pi*t)-.04*t))
            branch(wrap,.004,1.3,.055)
            rear=wrap[-1];sign=random.choice([-1,1]);length=random.uniform(.55,1.45);drop=random.uniform(.72,1.72)
            trail=[rear+along*(sign*length*t)-normal*(.02+.04*math.sin(t*8))+up*(-drop*t) for t in [i/38 for i in range(39)]]
            trail[0]=rear;branch(trail,.003,random.uniform(1.25,1.8),.054)
        forks=round((10 if style=='column' else 13)*density)
        indexes=sorted(random.sample(range(11,76),forks))
        for k,index in enumerate(indexes):
            anchor=points[index];sign=random.choice([-1,1])
            length=span*random.uniform(.28,.92)*(1 if style!='column' else .50)
            climb=random.uniform(-.27,.40) if style=='cascade' else random.uniform(.12,.65)
            shoot=[]
            for j in range(30):
                t=j/29
                p=anchor+along*(sign*length*t)+up*(climb*t+.13*math.sin(t*3.8+phase*.15))+normal*(.04*math.sin(t*7+phase))
                if cap is not None:p.y=min(p.y,cap-.11)
                shoot.append(p)
            branch(shoot,.0032,random.uniform(1.3,1.95),.048/density)
            for j in random.sample(range(8,25),3):
                anchor2=shoot[j];length2=random.uniform(.18,.46)
                twig=[]
                for i in range(17):
                    t=i/16
                    p=anchor2+along*(sign*length2*t)+up*(.22*math.sin(t*3)-(.42 if style=='cascade' else .12)*t)+normal*(.035*math.sin(t*7))
                    if cap is not None:p.y=min(p.y,cap-.12)
                    twig.append(p)
                branch(twig,.0017,random.uniform(1.25,1.8),.040/density)
    active_cap=None

def over_wall_cascade(root_data):
    """A rooted runner comes from behind the coping, then hangs on its face."""
    global active_variant,active_cap,active_normal
    random.seed(root_data['seed'])
    base=Vector(root_data['base']);along=Vector(root_data['along']);normal=Vector(root_data['normal']);up=Vector((0,1,0))
    cap=root_data['wallTop'];span=root_data['span'];active_normal=normal
    # Only a slim natural fringe rises a few centimeters above the black cap.
    active_cap=cap+.20
    def face_branch(points,*args):
        # Keep this garden on the masonry instead of trailing into the entry.
        left,right=root_data['faceBounds']
        return branch([Vector((max(left,min(right,p.x)),p.y,p.z)) for p in points],*args)
    for k in range(root_data['strands']):
        active_variant=(k+root_data['seed'])%4
        phase=random.random()*math.tau;shift=(k/(root_data['strands']-1)-.5)*span*.85
        front=Vector((base.x,cap-.12,base.z))+along*shift+normal*.075
        behind=front-normal*.52-up*.10
        crown=[]
        for j in range(33):
            t=j/32
            crown.append(behind.lerp(front,t)+up*(.245*math.sin(math.pi*t)))
        face_branch(crown,.0055,1.65,.047)
        drop=root_data['height']*random.uniform(.68,1.0)
        points=[]
        drift=random.uniform(-.14,.14)
        for j in range(76):
            t=j/75
            points.append(front+up*(-drop*t)+along*(.075*math.sin(t*8+phase)+drift*t)+normal*(.018+.025*math.sin(t*6+phase)))
        points[0]=front;face_branch(points,.0046,random.uniform(1.45,1.85),.044)
        for j in [7,16,27,39,52,63]:
            anchor=points[j];sign=-1 if (j+k)%2 else 1
            length=random.uniform(.18,.44);fall=random.uniform(.20,.52)
            shoot=[anchor+along*(sign*length*t)+up*(-fall*t+.065*math.sin(t*math.pi))+normal*(.02*math.sin(t*6)) for t in [i/26 for i in range(27)]]
            face_branch(shoot,.0025,random.uniform(1.45,1.85),.040)
            for index in [10,19]:
                twig_start=shoot[index];twig_drop=random.uniform(.16,.33)
                twig=[twig_start+along*(sign*.13*t)+up*(-twig_drop*t) for t in [i/13 for i in range(14)]]
                face_branch(twig,.0015,1.55,.042)
    active_cap=None

for root_data in garden['roots']:
    deform_east=root_data['base'][0]>4.45 and root_data['normal'][0]<0 and not root_data.get('risingBed')
    if root_data.get('growth')=='over-wall-cascade':over_wall_cascade(root_data)
    else:wall(root_data)
deform_east=False
active_variant=2;active_cap=None

# The balcony ivy runs along one connected woody runner, then trails down from
# shared nodes in unequal lengths and density. No repeated hanging asset stamps.
random.seed(garden['cornice']['seed'])
a=Vector(garden['cornice']['from']);b=Vector(garden['cornice']['to'])
runner=[a.lerp(b,t)+Vector((0,.05*math.sin(t*29),.025*math.sin(t*19))) for t in [i/160 for i in range(161)]]
branch(runner,.012,1.3,.033)
for k in range(76):
    anchor=runner[round(k/75*160)];length=random.uniform(.35,1.55);phase=random.random()*math.tau
    points=[anchor+Vector((.10*math.sin(t*7+phase),-length*t,.06+.10*math.sin(t*3))) for t in [i/45 for i in range(46)]]
    branch(points,.004,random.uniform(.85,1.15),.033)
    for j in [8,15,24]:
        start=points[j];direction=random.choice([-1,1]);width=random.uniform(.18,.4)
        shoot=[start+Vector((direction*width*t,-.30*t,.015*math.sin(t*7))) for t in [i/20 for i in range(21)]]
        branch(shoot,.002,1.4,.05)

# Mixed-size low foliage actually sits in the bed soil. Sparse edge leaves
# soften the stone rim while small woody bushes provide varied silhouettes.
plant_beds=[([(a,c),(b,c),(b,d),(a,d)],False) for a,b,c,d in garden['beds']]+[(garden['stairBed'],True),(garden['eastBed'],True)]
for i,(polygon,angled) in enumerate(plant_beds):
    a=min(p[0] for p in polygon);b=max(p[0] for p in polygon);c=min(p[1] for p in polygon);d=max(p[1] for p in polygon)
    random.seed(120+i)
    for k in range(max(6,round((d-c+b-a)*10))):
        x=random.uniform(a+.03,b-.03);z=random.uniform(c+.03,d-.03)
        if angled:
            # Rejection sampling supports the whole bent bed, including its
            # shared corners; a four-point parallelogram would miss two runs.
            def within(x,z):
                hit=False
                for a2,b2 in zip(polygon,polygon[1:]+polygon[:1]):
                    if (a2[1]>z)!=(b2[1]>z) and x<(b2[0]-a2[0])*(z-a2[1])/(b2[1]-a2[1])+a2[0]:hit=not hit
                return hit
            for attempt in range(300):
                x=random.uniform(a+.025,b-.025);z=random.uniform(c+.025,d-.025)
                if within(x,z):break
            else:continue
        active_variant=(i+k)%4;h=random.uniform(.20,.65)
        # Soil follows the stair slope; the stems always use the world-up axis.
        y=stair_soil_height(x,z)+.012 if polygon==garden['stairBed'] else .23
        start=Vector((x,y,z));points=[start+Vector((.035*math.sin(t*8),h*t,.035*math.sin(t*9))) for t in [j/14 for j in range(15)]]
        branch(points,.0025,1.45,.039)
        for height in [.25,.55,.8]:
            origin=start+Vector((0,h*height,0));phase=random.random()*math.tau;width=random.uniform(.07,.20)
            shoot=[origin+Vector((math.cos(phase)*width*t,.07*t,math.sin(phase)*width*t)) for t in [j/8 for j in range(9)]]
            branch(shoot,.0014,1.6,.035)

mesh=bpy.data.meshes.new('Organic_Ivy_Photographic_Leaves');mesh.from_pydata(all_verts,[],all_faces);mesh.update();uv=mesh.uv_layers.new(name='UVMap')
for i,value in enumerate(all_uv):uv.data[i].uv=value
for variant,tint in enumerate([(.77,.92,.73),(.72,.83,.65),(.88,1.0,.80),(.67,.82,.70)]):
    mat=leaf_mesh.materials[0].copy();mat.name='Garden_Leaf_'+str(variant)
    bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    links=list(bsdf.inputs['Base Color'].links)
    if links:
        source_socket=links[0].from_socket;mat.node_tree.links.remove(links[0])
        tint_node=mat.node_tree.nodes.new('ShaderNodeMixRGB');tint_node.blend_type='MULTIPLY';tint_node.inputs[0].default_value=1;tint_node.inputs[2].default_value=(*tint,1)
        mat.node_tree.links.new(source_socket,tint_node.inputs[1]);mat.node_tree.links.new(tint_node.outputs[0],bsdf.inputs['Base Color'])
    mesh.materials.append(mat)
for poly,index in zip(mesh.polygons,all_materials):poly.material_index=index
obj=bpy.data.objects.new('Rooted_Ivy_Leaves',mesh);bpy.context.collection.objects.link(obj)
for poly in mesh.polygons:poly.use_smooth=True
bpy.ops.object.select_all(action='DESELECT')
for stem in stems:stem.select_set(True)
bpy.context.view_layer.objects.active=stems[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name='Rooted_Ivy_Connected_Branches'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/rooted-garden.glb'),export_format='GLB',export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('ROOTED_GARDEN_EXPORTED',leaf_count,len(all_faces),'roots',len(garden['roots']),'leaf_variants',len(leaf_profiles),'maximum_height',max(v[2] for v in all_verts),flush=True)
