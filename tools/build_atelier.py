"""Original connected architecture/furniture; run in a separate factory-startup Blender.

Logical coordinates are Three.js (x, y up, z toward terrace).
Only this generated scene is modified. Scanned vegetation is loaded separately in the app.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public/assets'
SPACE=json.loads((ROOT/'src/navigation/space-layout.json').read_text(encoding='utf-8-sig'))
WEST=SPACE['westFacade']
GARDEN=json.loads((ROOT/'src/scene/garden-layout.json').read_text(encoding='utf-8-sig'))
LIGHT=json.loads((ROOT/'src/scene/lighting-layout.json').read_text(encoding='utf-8-sig'))
random.seed(24)
for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
print('BLENDER_VERSION',bpy.app.version_string,flush=True)

def xyz(p): return (p[0],-p[2],p[1])

def material(name,color,rough=.6,texture=None,emission=0):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=rough
    if emission:
        bsdf.inputs['Emission Color'].default_value=(*color,1)
        bsdf.inputs['Emission Strength'].default_value=emission
    if texture:
        folder=ROOT/'tools/source-assets/materials'/texture
        for stem,socket in [('diff','Base Color'),('rough','Roughness'),('normal','Normal')]:
            file=next(folder.glob(stem+'.*'),None)
            if not file: continue
            node=nodes.new('ShaderNodeTexImage')
            node.image=bpy.data.images.load(str(file),check_existing=True)
            if max(node.image.size)>2048:
                scale=2048/max(node.image.size);node.image.scale(int(node.image.size[0]*scale),int(node.image.size[1]*scale))
                texture_dir=ROOT/'tools/generated/textures';texture_dir.mkdir(parents=True,exist_ok=True)
                node.image.filepath_raw=str(texture_dir/(texture+'_'+stem+'.jpg'));node.image.file_format='JPEG';node.image.save()
            if stem!='diff': node.image.colorspace_settings.name='Non-Color'
            if stem=='normal':
                normal=nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value=.38
                mat.node_tree.links.new(node.outputs['Color'],normal.inputs['Color'])
                mat.node_tree.links.new(normal.outputs['Normal'],bsdf.inputs[socket])
            else: mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs[socket])
    return mat

oak=material('Warm_Oak',(.74,.52,.29),.52,'oak_veneer_01')
oak_dark=material('Oak_Shaded_Edges',(.40,.24,.11),.56)
stone=material('Warm_Pale_Limestone',(.88,.83,.73),.10,'marble_01')
stone.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.65
stone.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.08
planterstone=material('Pale_Marble_Planter',(.83,.75,.63),.48,'marble_01')
plaster=material('Ivory_Mineral_Plaster',(.98,.91,.80),.86,'beige_wall_001')
poolstone=material('Pool_Stone',(.25,.64,.59),.38,'marble_01')
metal=material('Bronze',(.19,.13,.065),.32)
charcoal=material('Charcoal',(.042,.043,.039),.6)
paper=material('Warm_Paper',(.88,.86,.77),.89)
ceramic=material('Unglazed_Ceramic',(.69,.55,.40),.73)
whiteceramic=material('Cream_Ceramic',(.86,.83,.72),.28)
soil=material('Soil',(.072,.051,.024),1)
jute=material('Jute',(.58,.40,.23),.95)
linen=material('Natural_Linen',(.93,.89,.79),.96)
warm_light=material('Lamp_Diffuser',(.98,.73,.39),.45,emission=2)
shelf_light=material('Shelf_Amber_Diffuser',(.99,.80,.49),.45,emission=2.4)
ceiling_opal=material('Ceiling_Opal',(1,.91,.77),.48,emission=2.0)
ground_ceiling_opal=material('Ground_Ceiling_Opal',(1,.91,.77),.48,emission=1.55)
studio_ceiling_opal=material('Studio_Ceiling_Opal',(1,.91,.77),.48,emission=1.55*LIGHT['studioFixtureGain'])
exterior_black=material('Exterior_Gloss_Black',(.012,.015,.020),.18)
black_bsdf=exterior_black.node_tree.nodes.get('Principled BSDF')
black_bsdf.inputs['Metallic'].default_value=.65
black_bsdf.inputs['Coat Weight'].default_value=.5
black_bsdf.inputs['Coat Roughness'].default_value=.12
ceiling_white=material('White_Satin_Ceiling',(.95,.94,.90),.78)
column_stone=material('Ivory_Polished_Column',(.94,.93,.89),.24,'marble_01')
column_stone.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.24
porcelain=material('Furniture_Ivory_Porcelain',(.94,.94,.91),.19)
porcelain.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.45
porcelain.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.15
lacquer=material('Furniture_White_Lacquer',(.87,.88,.86),.27)
leather=material('Furniture_White_Leather',(.94,.93,.90),.40)
leather_bsdf=leather.node_tree.nodes.get('Principled BSDF')
leather_bsdf.inputs['Sheen Weight'].default_value=.22
leather_bsdf.inputs['Sheen Roughness'].default_value=.65
blacksteel=material('Furniture_Graphite_Steel',(.026,.030,.033),.30)
blacksteel.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.82
book_mats=[material('Book_'+str(i),color,.92) for i,color in enumerate([
    (.71,.63,.48),(.83,.78,.65),(.29,.34,.28),(.48,.31,.17),(.61,.52,.35),(.86,.83,.72)])]

# Cubes use physical per-face UVs, with bevels at close viewing distances.
def box(name,pos,size,mat,bevel=.009,rot=0):
    assert len(size)==3 and all(v>0 for v in size), (name,size)
    # Build data directly: operator creation updates every previous object and
    # makes a furnished two-story scene needlessly slow to regenerate.
    sx,sy,sz=size[0]/2,size[2]/2,size[1]/2
    mesh=bpy.data.meshes.new(name+'_Mesh')
    mesh.from_pydata([(-sx,-sy,-sz),(-sx,-sy,sz),(-sx,sy,-sz),(-sx,sy,sz),(sx,-sy,-sz),(sx,-sy,sz),(sx,sy,-sz),(sx,sy,sz)],[],[(2,6,4,0),(5,7,3,1),(4,5,1,0),(3,7,6,2),(1,3,2,0),(6,7,5,4)])
    mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=xyz(pos)
    obj.rotation_euler[2]=-rot
    obj.data.materials.append(mat)
    uv=obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        axis=max(range(3),key=lambda i:abs(poly.normal[i]))
        others=[i for i in range(3) if i!=axis]
        if mat==oak:
            # The photographed grain runs along V. Align it with each board's
            # long edge, including horizontal aprons, rails and shelf boards.
            longest=max(others,key=lambda i:(size[0],size[2],size[1])[i])
            others=[next(i for i in others if i!=longest),longest]
        for loop_index in poly.loop_indices:
            v=obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv=(v[others[0]]/1.7+.5,v[others[1]]/1.7+.5)
    if bevel:
        modifier=obj.modifiers.new('Crafted_Edges','BEVEL')
        modifier.width=min(bevel,min(size)*.17)
        modifier.segments=3
        modifier.affect='EDGES'
    return obj

def cylinder(name,pos,radius,depth,mat,radius_top=None,vertices=32):
    top=radius if radius_top is None else radius_top
    verts=[(r*math.cos(i*math.tau/vertices),r*math.sin(i*math.tau/vertices),h) for r,h in [(radius,-depth/2),(top,depth/2)] for i in range(vertices)]
    faces=[tuple(reversed(range(vertices))),tuple(range(vertices,vertices*2))]+[(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
    mesh=bpy.data.meshes.new(name+'_Mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=xyz(pos)
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(v.x+.5,v.z+.5)
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth=abs(p.normal.z)<.5
    bevel=obj.modifiers.new('Small_Rounded_Lip','BEVEL'); bevel.width=.004; bevel.segments=2
    return obj

def rod(name,a,b,r,mat):
    av,bv=Vector(xyz(a)),Vector(xyz(b))
    obj=cylinder(name,((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),r,(bv-av).length,mat,vertices=10)
    obj.rotation_euler=(bv-av).to_track_quat('Z','Y').to_euler()
    return obj

def subtract(rect,cut):
    x0,x1,z0,z1=rect; a,b,c,d=cut
    ix0,ix1=max(x0,a),min(x1,b); iz0,iz1=max(z0,c),min(z1,d)
    if ix0>=ix1 or iz0>=iz1: return [rect]
    pieces=[(x0,ix0,z0,z1),(ix1,x1,z0,z1),(ix0,ix1,z0,iz0),(ix0,ix1,iz1,z1)]
    return [r for r in pieces if r[1]-r[0]>.012 and r[3]-r[2]>.012]

def roof_height(z): return SPACE['groundCeiling'] + max(0,-z-3.4)*.094
def ground_finish(z): return roof_height(z)-.10

def crafted_mesh(name,vertices,faces,mat):
    mesh=bpy.data.meshes.new(name+'_Mesh')
    mesh.from_pydata([xyz(p) for p in vertices],[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(poly.normal[i]))
        axes=[i for i in range(3) if i!=axis]
        if mat==oak:
            longest=2 if 'Vertical_Oak_Slat' in name and 2 in axes else 0 if name.endswith('_Ceiling') and axis==2 else max(axes,key=lambda i:obj.dimensions[i])
            axes=[next(i for i in axes if i!=longest),longest]
        for li in poly.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(v[axes[0]]/1.7+.5,v[axes[1]]/1.7+.5)
    return obj

def closed_rim(name,outer,inner,bottom,top,mat,bevel=0):
    """A single mitered ring: no intersecting bar ends at the corners."""
    n=len(outer);assert len(inner)==n
    vertices=[(x,y,z) for y in [bottom,top] for loop in [outer,inner] for x,z in loop]
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,2*n+j,2*n+i),(n+i,3*n+i,3*n+j,n+j),(2*n+i,2*n+j,3*n+j,3*n+i),(i,n+i,n+j,j)])
    obj=crafted_mesh(name,vertices,faces,mat)
    import bmesh
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    if bevel:
        mod=obj.modifiers.new('Continuous_Rim_Edges','BEVEL');mod.width=bevel;mod.segments=3
    return obj

def column_molding(name,x,z,radius,bottom,top,border,inverted=False):
    # Classical plinth, rounded torus and concave neck, all swept as one hollow
    # stone profile. Its largest ring retains the approved collision footprint.
    section=[(0,.92),(.05,1),(.16,1),(.23,.84),(.28,.78),(.34,.79),
             (.40,.87),(.47,.88),(.54,.79),(.60,.63),(.66,.42),
             (.73,.25),(.80,.15),(.85,.23),(.91,.34),(.96,.29),(1,.05)]
    if inverted:section=[(1-t,r) for t,r in reversed(section)]
    segments=24;inner=radius-.002
    levels=[(bottom+(top-bottom)*t,radius+border*r) for t,r in section]
    levels.extend([(bottom,inner),(top,inner)])
    vertices=[(x+r*math.cos(i*math.tau/segments),y,z+r*math.sin(i*math.tau/segments)) for y,r in levels for i in range(segments)]
    faces=[];rings=len(section)
    for ring in range(rings-1):
        for i in range(segments):
            j=(i+1)%segments
            faces.append((ring*segments+i,ring*segments+j,(ring+1)*segments+j,(ring+1)*segments+i))
    for i in range(segments):
        j=(i+1)%segments;a=rings*segments;b=(rings+1)*segments;c=(rings-1)*segments
        faces.extend([(a+i,b+i,b+j,a+j),(i,a+i,a+j,j),(c+i,c+j,b+j,b+i)])
    obj=crafted_mesh(name,vertices,faces,column_stone)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    assert all(edge.is_manifold for edge in bm.edges),'Column molding must be a closed hollow ring'
    bm.to_mesh(obj.data);bm.free()
    for poly in obj.data.polygons:poly.use_smooth=abs(poly.normal.z)<.999
    print('CLASSICAL_COLUMN_MOLDING',name,round(x,6),round(z,6),bottom,top,column_stone.name,flush=True)
    return obj

def column_collar(name,x,z,width,depth,wall_x=None,profile=None):
    base=profile if profile is not None else SPACE['lowerColumnBase']
    return column_molding(name,x,z,min(width,depth)/2,base['bottom'],base['bottom']+base['height'],base['border'])

def column_head(name,x,z,size,bottom,top,border):
    return column_molding(name,x,z,size/2,bottom,top,border,inverted=True)

def wall_panel(name,a,b,thickness,mat,bottom=lambda z:0,top=roof_height):
    dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
    nx,nz=-dz/length*thickness/2,dx/length*thickness/2
    corners=[(a[0]+nx,a[1]+nz),(b[0]+nx,b[1]+nz),(b[0]-nx,b[1]-nz),(a[0]-nx,a[1]-nz)]
    vertices=[(x,bottom(z),z) for x,z in corners]+[(x,top(z),z) for x,z in corners]
    return crafted_mesh(name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)

# One continuous floor, with a real opening cut around the pool basin.
for xi in range(19):
    for zi in range(math.ceil((7+SPACE['courtyard'][3])/.6)):
        x0=-5.4+xi*.6; x1=min(x0+.598,5.4)
        z0=-7+zi*.6; z1=min(z0+.598,SPACE['courtyard'][3])
        if x0>=5.4 or z0>=SPACE['courtyard'][3]: continue
        if z1 < -3.3 and (x1 < -2.3 or x0 > 2.3): continue
        for piece in subtract((x0,x1,z0,z1),SPACE['pool']):
            a,b,c,d=piece
            box('Limestone_Tile',((a+b)/2,-.025,(c+d)/2),(b-a,.05,d-c),stone,.002)

# Atelier walls, a side light opening, and one shared front aperture.
box('Back_Artwork_Wall',(0,roof_height(-7.12)/2,-7.12),(4.84,roof_height(-7.12),.24),plaster)
wall_panel('Left_Solid_Wall',(-2.42,-7.12),(-2.42,-1.2),.24,plaster)
wall_panel('Left_Entry_Taper',(-2.42,-1.2),(-2.05,0),.24,plaster)
wall_panel('Right_Entry_Taper',(2.42,-1.2),(2.05,0),.24,plaster)
wall_panel('Right_Continuous_Interior_Wall',(2.42,-7.12),(2.42,-1.2),.24,plaster)
box('Front_Pier_Left',(-1.94,1.8,.02),(.48,3.6,.28),plaster)
box('Front_Pier_Right',(1.94,1.8,.02),(.48,3.6,.28),plaster)
box('Front_Header',(0,3.43,.02),(3.4,.34,.28),plaster)
box('Facade_Coping',(0,3.64,.02),(4.34,.12,.34),stone,.007)
for x in [-1.78,1.78]: box('Shared_Stone_Jamb',(x,1.65,.05),(.14,3.30,.36),column_stone,.012)
box('Shared_Stone_Lintel',(0,3.32,.05),(3.70,.14,.36),column_stone,.012)
roof_stations=[(.16,2.18),(-1.2,2.54),(-7.26,2.54)]
roof_vertices=[]
for top in [False,True]:
    for z,width in roof_stations:
        for x in [-width,width]:roof_vertices.append((x,roof_height(z)+(.08 if top else 0),z))
roof_faces=[(0,2,3,1),(2,4,5,3),(6,7,9,8),(8,9,11,10),(0,1,7,6),(4,10,11,5),(0,6,8,2),(2,8,10,4),(1,3,9,7),(3,5,11,9)]
# The continuous white ceiling and genuine light channels are built below,
# after polygon clipping helpers are defined. No exposed timber beams remain.
# Back-wall desk and under-desk volumes.
box('Workbench_Top',(0,.86,-5.26),(3.8,.095,.92),porcelain,.022)
box('Workbench_Front_Apron',(0,.765,-4.86),(3.72,.10,.08),blacksteel)
for x in [-1.74,1.74,-.7,.7]:
    box('Workbench_Leg',(x,.41,-5.29),(.055,.82,.72),blacksteel)
box('Workbench_Lower_Shelf',(0,.21,-5.26),(3.65,.06,.75),lacquer)
for x in [-1.36,-.48,.48,1.36]:
    box('Storage_Crate_Base',(x,.25,-5.26),(.62,.04,.53),oak)
    for y in [.31,.41,.51]:
        for z in [-5.52,-5.0]: box('Crate_Slatted_Face',(x,y,z),(.62,.075,.035),oak,.002)
        for xx in [x-.29,x+.29]: box('Crate_Slatted_End',(xx,y,-5.26),(.035,.075,.53),oak,.002)
    for xx in [x-.27,x+.27]: box('Crate_Corner_Post',(xx,.39,-5.01),(.045,.32,.045),oak_dark,.002)
for i in range(7): box('Paper_Book_Stack',(.03,.265+i*.028,-5.1),(.35,.025,.30),book_mats[i%6],.003)

def stool(x,z):
    cylinder('Stool_Steel_Seat_Frame',(x,.455,z),.24,.035,blacksteel,vertices=48)
    cylinder('Stool_Leather_Seat',(x,.51,z),.233,.085,leather,vertices=48)
    for dx,dz in [(-.145,-.145),(-.145,.145),(.145,-.145),(.145,.145)]:
        rod('Stool_Splayed_Leg',(x+dx*1.2,.035,z+dz*1.2),(x+dx,.46,z+dz),.021,blacksteel)
    for dz in [-.14,.14]: rod('Stool_Brace',(x-.17,.19,z+dz),(x+.17,.19,z+dz),.012,blacksteel)
    for dx in [-.18,.18]:rod('Stool_Back_Support',(x+dx,.43,z+.17),(x+dx,.84,z+.17),.014,blacksteel)
    box('Stool_Leather_Back',(x,.82,z+.18),(.42,.23,.075),leather,.035)
stool(-.9,-4.55); stool(.9,-4.55)

def tools(x,z):
    cylinder('Tool_Cup',(x,.96,z),.062,.16,ceramic,radius_top=.072)
    for i in range(9):
        dx=random.uniform(-.045,.045); dz=random.uniform(-.04,.04)
        end=(x+dx*1.8,1.18+random.uniform(0,.16),z+dz*1.8)
        rod('Brush_Wood_Handle',(x+dx,.93,z+dz),end,.005,oak_dark)
        rod('Brush_Tip',end,(end[0],end[1]+.042,end[2]),.008,book_mats[i%6])
for x in [-1.3,-.63,.12,.76,1.5]: tools(x,-5.4)
for i in range(4):
    box('Paper_Stack',(-1.65+i*.42,.93+i*.012,-5.12),(.29,.019,.38),paper,.002)
for x,z in [(-1.53,-5.62),(-.94,-5.64),(-.24,-5.63),(.46,-5.62),(1.14,-5.59)]:
    cylinder('Tool_Glazed_Jar',(x,.965,z),.073,.12,whiteceramic,radius_top=.064)
    cylinder('Tool_Jar_Rim',(x,1.028,z),.065,.012,ceramic)
    tools(x+.12,z+.06)
for x,z,n in [(-1.35,-5.02,4),(-.16,-5.15,3),(.9,-5.05,5)]:
    for i in range(n):
        box('Paper_Stack_Sketchbook',(x,.918+i*.02,z),(.3,.018,.23),book_mats[(i+2)%6],.003,rot=.08-i*.02)
camera_body=box('Tool_Camera_Body',(-1.05,1.01,-5.20),(.16,.10,.075),charcoal,.011)
camera_lens=cylinder('Tool_Camera_Lens',(-1.05,1.008,-5.15),.039,.035,charcoal)
camera_lens.rotation_euler[0]=math.pi/2
box('Tool_Camera_Viewfinder',(-1.03,1.068,-5.20),(.055,.026,.045),charcoal,.004)
rod('Desk_Lamp_Stem',(1.7,.91,-5.45),(1.7,1.27,-5.45),.011,metal)
cylinder('Desk_Lamp_Base',(1.7,.915,-5.45),.105,.03,metal)
cylinder('Desk_Lamp_Shade',(1.7,1.25,-5.45),.125,.12,warm_light,radius_top=.034)

# Restore only the original entrance-side bay on the left wall. Its own
# random stream leaves the opposite cabinet and other furnishings unchanged.
entry_bookcase=GARDEN['rightAtelier']['leftEntryBookcase']
x,z=entry_bookcase['position'];depth=entry_bookcase['depth'];height=entry_bookcase['height'];width=entry_bookcase['width']
entry_books=random.Random(84)
for sz in [-.48,.48]:
    for xx in [x-depth/2,x+depth/2]:box('Entry_Bookcase_Upright',(xx,height/2,z+sz),(.07,height,.075),oak)
for y in [.12,.68,1.25,1.83,2.43,2.92]:box('Entry_Bookcase_Shelf',(x,y,z),(depth,.055,width),oak)
for level in range(4):
    for k in range(entry_books.randint(5,9)):
        h=entry_books.uniform(.21,.35)
        box('Entry_Bookcase_Book',(x,.15+level*.575+h/2,z-.4+k*.105),(.28,h,.07),book_mats[entry_books.randrange(6)],.002)
for level in [0,2]:
    for i in range(4):box('Entry_Bookcase_Horizontal_Book',(x,.17+level*.575+i*.032,z+.31),(.27,.028,.29-i*.01),book_mats[(i+level)%6],.003,rot=.025*(i-1))

# The remaining left wall stays empty for future artworks.
x,z=GARDEN['rightAtelier']['cabinet'];depth=.68;shelf_height=.86
for sz in [-.48,.48]:
    for xx in [x-depth/2,x+depth/2]:box('Shelf_Upright',(xx,shelf_height/2,z+sz),(.07,shelf_height,.075),oak)
for y in [.12,.48,.87]:box('Shelf_Board',(x,y,z),(depth,.055,1.02),oak)
for level in [0,1]:
    if random.random()<.15:continue
    for k in range(random.randint(5,9)):
        zbook=z-.4+k*.105;h=random.uniform(.19,.27)
        box('Library_Book',(x,.15+level*.34+h/2,zbook),(.28,h,.07),book_mats[random.randrange(6)],.002)

box('Natural_Woven_Rug',(0,.018,-4.73),(2.55,.02,1.3),jute,.003)
for x in [i*.04-1.24 for i in range(63)]:
    rod('Rug_Fringe',(x,.026,-5.38),(x+random.uniform(-.01,.01),.025,-5.43-random.uniform(0,.03)),.0018,jute)
    rod('Rug_Fringe',(x,.026,-4.08),(x+random.uniform(-.01,.01),.025,-4.03+random.uniform(0,.03)),.0018,jute)

# Terrace pergola occupies the positive-X side of the same shared aperture.
for x in [1.3,5.2]:
    for z in [.36,2.45]: box('Pergola_Column',(x,1.5,z),(.18,3,.18),column_stone,.015)
for z in [.36,2.45]: box('Pergola_Beam',(3.25,3.04,z),(4.3,.21,.2),ceiling_white,.012)
for x in [1.24,5.26]: box('Pergola_Side_Beam',(x,3.045,1.41),(.19,.2,2.48),ceiling_white,.012)
for x in [1.2+i*.19 for i in range(23)]:
    box('Pergola_Roof_Slat',(x,3.13,1.42),(.053,.055,2.55),ceiling_white,.004)
for z in [.32+i*.09 for i in range(26)]:
    box('Pergola_Cross_Weave',(3.25,3.175,z),(4.3,.027,.025),ceiling_white,.002)
for i in range(26):
    z=.03+i*.10
    box('Exterior_Work_Wall_Slat',(3.3+.222*z,1.58,z),(.045,2.7,.045),oak)

box('Terrace_Worktable_Top',(3.25,.82,1.71),(3.65,.09,.78),oak,.012)
for x in [1.6,4.9]:
    for z in [1.43,1.98]: box('Terrace_Table_Leg',(x,.39,z),(.085,.78,.085),oak)
stool(2.2,2.35); stool(4.3,2.35)
for x in [1.7,2.25,3.0,3.5,4.3,4.8]: tools(x,1.55)
for i in range(4): box('Terrace_Paper_Stack',(-2.0-i*.3,.885+i*.009,1.85),(.25,.013,.28),paper,.001)
box('Laptop_Base',(3.3,.887,1.67),(.48,.025,.31),charcoal,.008)
box('Laptop_Screen',(3.3,1.04,1.57),(.48,.29,.016),charcoal,.008)

# Suspended linen has a real curved surface and casts a soft shaded canopy.
verts=[];faces=[];nx,nz=30,20
for i in range(nx+1):
    for j in range(nz+1):
        u,v=i/nx,j/nz
        verts.append(xyz((-1.78-u*3.73,2.98-.26*math.sin(math.pi*u)*math.sin(math.pi*v),.43+v*1.83)))
for i in range(nx):
    for j in range(nz):
        a=i*(nz+1)+j;faces.append((a,a+1,a+nz+2,a+nz+1))
mesh=bpy.data.meshes.new('Linen_Canopy_Mesh');mesh.from_pydata(verts,[],faces);mesh.update()
cloth=bpy.data.objects.new('Linen_Canopy',mesh);bpy.context.collection.objects.link(cloth);cloth.data.materials.append(linen)
for poly in mesh.polygons:poly.use_smooth=True

# A recessed basin and substantial matching stone coping, not a flat painted patch.
pool_left,pool_right,pool_back,pool_front=SPACE['pool']
pool_x=(pool_left+pool_right)/2;pool_z=(pool_back+pool_front)/2
pool_width=pool_right-pool_left;pool_length=pool_front-pool_back
pool_bottom=SPACE['poolMotion']['bottom']
water_inset=SPACE['poolWaterInset']
box('Pool_Basin_Bottom',(pool_x,pool_bottom-.0325,pool_z),(pool_width,.065,pool_length),poolstone,.008)
# A single flush graphite grate, with real narrow slots over a dark recess.
box('Pool_Center_Drain_Recess',(pool_x,pool_bottom+.003,pool_z),(.32,.006,.32),charcoal,.004)
for dx,dz,sx,sz in [(-.155,0,.025,.32),(.155,0,.025,.32),(0,-.155,.285,.025),(0,.155,.285,.025)]:
    box('Pool_Center_Drain_Frame',(pool_x+dx,pool_bottom+.010,pool_z+dz),(sx,.014,sz),blacksteel,.002)
for i in range(9):box('Pool_Center_Drain_Grate',(pool_x-.12+i*.03,pool_bottom+.009,pool_z),(.013,.012,.278),blacksteel,.002)
for x in [pool_left+.015,pool_right-.015]: box('Pool_Basin_Wall',(x,(pool_bottom+.04)/2,pool_z),(.06,.04-pool_bottom,pool_length),poolstone)
for z in [pool_back+.015,pool_front-.015]: box('Pool_Basin_Wall',(pool_x,(pool_bottom+.04)/2,z),(pool_width,.04-pool_bottom,.06),poolstone)
closed_rim('Pool_Coping_Continuous',
    [(pool_left-.055,pool_back-.055),(pool_right+.055,pool_back-.055),(pool_right+.055,pool_front+.055),(pool_left-.055,pool_front+.055)],
    [(pool_left+water_inset,pool_back+water_inset),(pool_right-water_inset,pool_back+water_inset),(pool_right-water_inset,pool_front-water_inset),(pool_left+water_inset,pool_front-water_inset)],
    -.020,.110,stone,.009)

# Enclosed open-air courtyard: solid returns close the entrance flanks, and
# eye-height-plus walls conceal the old horizon from every walkable edge.
courtyard_height=SPACE['courtyardHeight']
courtyard_depth=SPACE['courtyard'][3]
for x in [WEST['wallCenterX']]:
    # One full-height west plane spans the studio, library and courtyard.
    # Coplanar overlapping wall pieces would flicker after the lightmap bake.
    back=-3.56;front=courtyard_depth+.22
    box('Courtyard_Perimeter_Wall',(x,courtyard_height/2,(back+front)/2),(WEST['wallThickness'],courtyard_height,front-back),plaster,.012)
    box('Courtyard_Stone_Coping',(x,courtyard_height+.0175,courtyard_depth/2-.18),(.29,.185,courtyard_depth+.84),exterior_black,.012)
box('Courtyard_End_Wall',(0,courtyard_height/2,courtyard_depth+.10),(11.16,courtyard_height,.20),plaster,.012)
box('Courtyard_End_Coping',(0,courtyard_height+.0175,courtyard_depth+.10),(11.2,.185,.28),exterior_black,.012)
# The left return sits behind the last framed work, rather than crossing it.
box('Courtyard_Left_Return',(-3.66,1.80,-.55),(3.70,3.60,.24),plaster,.010)
box('Courtyard_Left_Return_Coping',(-3.66,3.645,-.55),(3.72,.09,.30),exterior_black,.010)
box('Courtyard_Left_Return_Floor',(-3.66,-.025,-.275),(3.70,.05,.55),stone,.002)
wall_panel('Gallery_Solid_Backing',(-3.04,-.44),(-3.72,2.65),.12,plaster,top=lambda z:2.90)
for z in [3.67,5.0,6.33]:
    box('Stone_Bench_Leg',(z-2.5,.29,11.60),(.14,.58,.83),plaster)
for x in [1.55,1.72,1.89,2.06,2.23]:
    box('Oak_Bench_Seat_Slat',(2.5,.62,11.60+x-1.9),(2.85,.055,.15),oak,.007)
for pot in GARDEN['roomTreePlanters']:
    x,z=pot['position'];size=pot['size']
    box('Stone_Planter',(x,size/2,z),(size,size,size),plaster,.015)
    box('Planter_Soil',(x,size+.007,z),(size-.07,.012,size-.07),soil,.002)
for pot in GARDEN['rightAtelier']['pots']:
    x,z=pot['position'];size=pot['size'];height=pot['height']
    box('Right_Atelier_Planter',(x,height/2,z),(size,height,size),planterstone if pot['finish']=='marble' else plaster,.007)
    box('Right_Atelier_Planter_Soil',(x,height+.006,z),(size-.044,.008,size-.044),soil,.002)
box('Desk_Tree_Planter',(-1.55,1.035,-6.35),(.24,.25,.25),whiteceramic,.007)
box('Desk_Tree_Soil',(-1.55,1.163,-6.35),(.20,.008,.20),soil,.002)

# Warm wall lights flank the shared aperture; no secondary portal is built.
for x in [-1.94,1.94]:
    cylinder('Wall_Light',(x,1.92,.205),.058,.23,charcoal,vertices=32)

# Mirror the pergola and its contents toward the pool, matching the terrace photo.
for obj in list(bpy.context.scene.objects):
    if obj.location.y > 4.0 and obj.name.startswith(('Workbench_', 'Storage_', 'Crate_', 'Paper_Book_', 'Stool_', 'Tool_', 'Brush_', 'Paper_Stack', 'Desk_Lamp')):
        obj.location.y += 1.0
for obj in list(bpy.context.scene.objects):
    if obj.name.startswith(('Pergola_', 'Exterior_Work_', 'Terrace_Worktable_', 'Terrace_Table_', 'Laptop_')) or (obj.location.y < -.2 and obj.name.startswith(('Stool_', 'Tool_', 'Brush_'))):
        obj.location.x = -obj.location.x-.4

for obj in list(bpy.context.scene.objects):
    if obj.name.startswith('Exterior_Work_Wall_Slat'):obj.location.x+=.75

# Remove the shallow decorative gallery and the visible extra pocket behind it.
for obj in list(bpy.context.scene.objects):
    gallery=obj.name.startswith(('Pergola_','Exterior_Work_','Terrace_','Laptop_','Linen_Canopy','Gallery_Solid_Backing','Courtyard_Left_Return'))
    if gallery or (obj.location.y<-.2 and obj.name.startswith(('Stool_','Tool_','Brush_'))):bpy.data.objects.remove(obj,do_unlink=True)

upper=SPACE['upperFloor'];ceiling=SPACE['upperCeiling'];roof_thickness=SPACE['upperRoofThickness']
outline=SPACE['upperOutline'];fa,fb=SPACE['balconyFront']
def facade_front(x):return fa[1]+(fb[1]-fa[1])*(x-fa[0])/(fb[0]-fa[0])
west=WEST;west_inner=west['wallCenterX']+west['wallThickness']/2
lower_west_x=west_inner+west['lowerColumnSize']/2
upper_west_x=west_inner+west['upperColumnSize']/2
def slab(name,polygon,bottom,top,mat):
    polygon=list(polygon)
    # Positive logical x/z winding points down after conversion to Blender.
    if sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(polygon,polygon[1:]+polygon[:1]))>0:polygon.reverse()
    count=len(polygon)
    verts=[(x,y,z) for y in [bottom,top] for x,z in polygon]
    faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
    faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
    return crafted_mesh(name,verts,faces,mat)
def clip_rect(poly,x0,x1,z0,z1):
    for axis,bound,sign in [(0,x0,1),(0,x1,-1),(1,z0,1),(1,z1,-1)]:
        result=[]
        for a,b in zip(poly,poly[1:]+poly[:1]):
            ia=(a[axis]-bound)*sign>=-1e-9;ib=(b[axis]-bound)*sign>=-1e-9
            if ia:result.append(a)
            if ia!=ib:
                t=(bound-a[axis])/(b[axis]-a[axis]);result.append(tuple(a[j]+(b[j]-a[j])*t for j in range(2)))
        poly=result
        if len(poly)<3:return []
    return poly
def tiled_surface(name,polygon,height):
    slab(name+'_Unbroken_Stone_Bed',polygon,height-.045,height-.006,stone)
    xa=math.floor(min(p[0] for p in polygon)/.6);xb=math.ceil(max(p[0] for p in polygon)/.6)
    za=math.floor(min(p[1] for p in polygon)/.6);zb=math.ceil(max(p[1] for p in polygon)/.6)
    for xi in range(xa,xb):
        for zi in range(za,zb):
            tile=clip_rect(polygon,xi*.6+.001,(xi+1)*.6-.001,zi*.6+.001,(zi+1)*.6-.001)
            if len(tile)>=3:slab(name+'_Limestone_Tile',tile,height-.006,height,stone)
# The east perimeter follows the exact outer stair edge. A single closed
# polygon wall has no exposed rectangular pockets at either directional bend.
east=SPACE['eastWall'];outer=[(x+.22,z) for x,z in reversed(east)]
slab('Courtyard_East_Angled_Wall',east+outer,0,SPACE['courtyardHeight'],plaster)
slab('Courtyard_East_Continuous_Coping',[(x-.025,z) for x,z in east]+[(x+.255,z) for x,z in reversed(east)],SPACE['courtyardHeight']-.075,SPACE['courtyardHeight']+.11,exterior_black)
slab('Lower_Facade_Stair_Corner_Infill',SPACE['lowerCornerClosure'],0,upper-.045,plaster)
tiled_surface('Lower_Stair_Corner_Infill_Cap',SPACE['lowerCornerClosure'],upper)
a,b,c,d=SPACE['upperClosure']
# One L-section extrusion joins the ground facade return and the filled upper
# east wing. Both exposed west/front faces are single planes without beveled
# overlapping rectangles, a 24cm nib or an external unsupported floor tongue.
section=[(0,d),(ceiling,d),(ceiling,c),(upper-.25,c),(upper-.25,-.12),(0,-.12)]
def east_inner(z):
    for pa,pb in zip(east,east[1:]):
        if pa[1]<=z<=pb[1]:return pa[0]+(pb[0]-pa[0])*(z-pa[1])/(pb[1]-pa[1])
    return east[0][0] if z<east[0][1] else east[-1][0]
verts=[(a,y,z) for y,z in section]+[(east_inner(z)+.22,y,z) for y,z in section];n=len(section)
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
corner=crafted_mesh('Unified_East_Facade_And_Upper_Closure',verts,faces,plaster)
import bmesh
bm=bmesh.new();bm.from_mesh(corner.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(corner.data);bm.free()
slab('Upper_Closure_Aligned_Coping',[(a,c),(east_inner(c)+.22,c),(east_inner(d)+.22,d),(a,d)],ceiling-.075,ceiling+.11,exterior_black)
slab('Upper_Deck_Slab',outline,upper-.25,upper-.045,plaster)
tiled_surface('Upper_Floor',outline,upper)
box('Upper_Back_Wall',(0,(upper+ceiling)/2,-3.45),(10.80,ceiling-upper,.22),plaster,.012)
# The shared west wall already encloses the upper library without a return nib.
# East alcove is solid masonry; its former inner return/pocket is removed.
roof=SPACE['upperRoof'];roof_end=fb[0]+roof['eastOverhang']
roof_outline=[(west_inner,roof['back']),(roof_end,roof['back']),(roof_end,facade_front(roof_end)+roof['frontOverhang']),(west_inner,facade_front(west_inner)+roof['frontOverhang'])]
decor=json.loads((ROOT/'src/scene/wall-decor.json').read_text(encoding='utf-8-sig'))
def sloped_slab(name,polygon,height,low,high,mat):
    polygon=list(polygon)
    if sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(polygon,polygon[1:]+polygon[:1]))>0:polygon.reverse()
    n=len(polygon);verts=[(x,height(z)+v,z) for v in [low,high] for x,z in polygon]
    obj=crafted_mesh(name,verts,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
def recessed_ceiling(name,polygon,height,zone,thickness=.10):
    # White structural backing closes the slots. The lower finish has actual
    # apertures, with the diffuser recessed 5mm into a 38mm-deep channel.
    channels=[]
    for strip in decor['interiorStrips']:
        if strip['name']!=zone:continue
        x,y,z=strip['position'];channels.append((x-strip['width']/2-.0175,x+strip['width']/2+.0175,z-.032,z+.032))
    if zone=='Atelier':
        for spot in decor['ceilingSpots']:
            x,y,z=spot['position'];channels.append((x-.118,x+.118,z-.118,z+.118))
    xa,xb=min(p[0] for p in polygon),max(p[0] for p in polygon);za,zb=min(p[1] for p in polygon),max(p[1] for p in polygon)
    xs=sorted(set([xa,xb]+[v for cut in channels for v in cut[:2] if xa<v<xb]));zs=sorted(set([za,zb]+([-3.4] if za<-3.4<zb else [])+[v for cut in channels for v in cut[2:] if za<v<zb]))
    for a,b in zip(xs,xs[1:]):
        for c,d in zip(zs,zs[1:]):
            patch=clip_rect(polygon,a,b,c,d)
            if len(patch)<3:continue
            sloped_slab(name+'_White_Back',patch,height,.038,thickness,ceiling_white)
            if not any(l<(a+b)/2<r and back<(c+d)/2<front for l,r,back,front in channels):
                sloped_slab(name+'_White_Finish',patch,height,0,.038,ceiling_white)
def continuous_recessed_ceiling(name,polygon,height,zone,thickness=.10):
    # One closed ceiling shell, with real recessed light channels. Former
    # touching patch boxes packed as separate lightmap islands and exposed a
    # checkerboard of baked radiance across an otherwise continuous finish.
    channels=[]
    for strip in decor['interiorStrips']:
        if strip['name']!=zone:continue
        x,y,z=strip['position']
        channels.append((x-strip['width']/2-.0175,x+strip['width']/2+.0175,z-.032,z+.032))
    if zone=='Atelier':
        for spot in decor['ceilingSpots']:
            x,y,z=spot['position'];channels.append((x-.118,x+.118,z-.118,z+.118))
    xa,xb=min(p[0] for p in polygon),max(p[0] for p in polygon)
    za,zb=min(p[1] for p in polygon),max(p[1] for p in polygon)
    xs=sorted(set([xa,xb]+[v for cut in channels for v in cut[:2] if xa<v<xb]))
    zs=sorted(set([za,zb]+([-3.4] if za<-3.4<zb else [])+[v for cut in channels for v in cut[2:] if za<v<zb]))
    vertices=[];faces=[];lookup={};edges={}
    base_height=height if callable(height) else lambda z:height
    def point(p,y):
        y+=base_height(p[1])
        key=(round(p[0],8),round(y,8),round(p[1],8))
        if key not in lookup:lookup[key]=len(vertices);vertices.append((p[0],y,p[1]))
        return lookup[key]
    for a,b in zip(xs,xs[1:]):
        for c,d in zip(zs,zs[1:]):
            patch=clip_rect(polygon,a,b,c,d)
            if len(patch)<3:continue
            low=.038 if any(l<(a+b)/2<r and back<(c+d)/2<front for l,r,back,front in channels) else 0
            faces.extend([tuple(point(p,low) for p in patch),tuple(point(p,thickness) for p in reversed(patch))])
            for p,q in zip(patch,patch[1:]+patch[:1]):
                key=tuple(sorted([(round(p[0],8),round(p[1],8)),(round(q[0],8),round(q[1],8))]))
                edges.setdefault(key,[]).append((p,q,low))
    for adjacent in edges.values():
        p,q,low=adjacent[0]
        high=thickness if len(adjacent)==1 else adjacent[1][2]
        if abs(high-low)>1e-8:faces.append((point(p,low),point(q,low),point(q,high),point(p,high)))
    obj=crafted_mesh(name+'_Continuous_White_Recessed_Ceiling',vertices,faces,ceiling_white)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    before=len(bm.faces)
    bmesh.ops.dissolve_limit(bm,angle_limit=.00001,verts=list(bm.verts),edges=list(bm.edges),delimit=set())
    assert all(edge.is_manifold for edge in bm.edges),'The recessed ceiling must remain a closed shell'
    bm.to_mesh(obj.data);bm.free()
    print('CONTINUOUS_RECESSED_CEILING',name,before,len(obj.data.polygons),flush=True)
continuous_recessed_ceiling('Atelier',[(-2.18,.16),(-2.54,-1.2),(-2.54,-7.26),(2.54,-7.26),(2.54,-1.2),(2.18,.16)],ground_finish,'Atelier')
continuous_recessed_ceiling('Library',roof_outline,ceiling,'Library',roof_thickness)
# The right upper support shares the exact ground-column center in x and z.
right_trim=SPACE['stairFacadeTrim'];right_corner=SPACE['lowerCornerClosure'][0]
upper_column_centers=[(upper_west_x,facade_front(upper_west_x)-.16),
                      (-2.55,facade_front(-2.55)-.16),
                      (right_corner[0]+right_trim['offset'][0],right_corner[1]+right_trim['offset'][1])]
for index,(x,front) in enumerate(upper_column_centers):
    size=west['upperColumnSize'];profile=SPACE['upperColumnBase']
    cylinder('Upper_Stone_Column',(x,(upper+ceiling)/2,front),size/2,ceiling-upper,column_stone,vertices=24)
    column_collar('Upper_Column_Base_Collar',x,front,size,size,
                  profile={**profile,'bottom':upper+profile['bottom']})
    column_head('Upper_Column_Capital',x,front,size,ceiling-profile['height'],ceiling,profile['border'])
# Upper timber rafters are replaced by the uninterrupted white recessed ceiling.
def offset_outline(poly,distance):
    winding=1 if sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1]))>0 else -1
    normals=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
        normals.append((-dz/length*winding,dx/length*winding))
    result=[]
    for i,p in enumerate(poly):
        a,b=normals[i-1],normals[i];denom=1+a[0]*b[0]+a[1]*b[1]
        result.append((p[0]+distance*(a[0]+b[0])/denom,p[1]+distance*(a[1]+b[1])/denom))
    return result
# One closed mitered ring covers every outside roof edge, including its corners.
# The white soffit and recessed slots remain inside the warm limestone fascia.
outer_rim=[(max(west_inner,x),z) for x,z in offset_outline(roof_outline,-.006)]
inner_rim=offset_outline(roof_outline,roof['fasciaWidth'])
n=len(roof_outline)
rim_vertices=[(x,y,z) for y in [ceiling-.065,ceiling+roof_thickness+.005] for loop in [outer_rim,inner_rim] for x,z in loop]
rim_faces=[]
for i in range(n):
    j=(i+1)%n
    rim_faces.extend([(i,j,2*n+j,2*n+i),(n+i,3*n+i,3*n+j,n+j),(2*n+i,2*n+j,3*n+j,3*n+i),(i,n+i,n+j,j)])
rim=crafted_mesh('Upper_Continuous_Ivory_Stone_Fascia',rim_vertices,rim_faces,stone)
bm=bmesh.new();bm.from_mesh(rim.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(rim.data);bm.free()
bevel=rim.modifiers.new('Refined_Fascia_Edges','BEVEL');bevel.width=.004;bevel.segments=3

# Match the ground ceiling's perimeter frame and shallow panel structure.
# Keep the satin fields continuous and leave every recessed light uninterrupted.
closed_rim('Library_White_Perimeter_Frame',offset_outline(roof_outline,roof['frameInset']),
           offset_outline(roof_outline,roof['frameInset']+roof['frameWidth']),
           ceiling-roof['frameDrop'],ceiling,ceiling_white,.004)
rib=roof['ribs'];rib_polygon=offset_outline(roof_outline,rib['inset'])
strip_zs=[s['position'][2] for s in decor['interiorStrips'] if s['name']=='Library']
for x in rib['x']:
    patch=clip_rect(rib_polygon,x-rib['width']/2,x+rib['width']/2,roof['back'],4)
    if not patch:continue
    spans=[(min(p[1] for p in patch),max(p[1] for p in patch))]
    for z,gap in [(z,rib['channelHalfGap']) for z in strip_zs]+[(z,rib['width']/2) for z in rib['z']]:
        spans=[part for a,b in spans for part in [(a,min(b,z-gap)),(max(a,z+gap),b)] if part[1]-part[0]>.015]
    for a,b in spans:
        segment=clip_rect(patch,x-rib['width']/2,x+rib['width']/2,a,b)
        if segment:sloped_slab('Library_White_Longitudinal_Rib',segment,lambda z:ceiling,-rib['drop'],0,ceiling_white)
for z in rib['z']:
    patch=clip_rect(rib_polygon,west_inner,roof_end,z-rib['width']/2,z+rib['width']/2)
    if patch:sloped_slab('Library_White_Transverse_Rib',patch,lambda z:ceiling,-rib['drop'],0,ceiling_white)

# Narrow planted soil channels sit on the actual exposed front/right roof edge.
# The shared garden's woody runners root here before bending over the fascia.
front_normal=Vector((-(fb[1]-fa[1])/(fb[0]-fa[0]),0,1)).normalized()
for a,b,normal in [
    ((west_inner+.055,facade_front(west_inner+.055)+roof['frontOverhang']),(roof_end-.055,facade_front(roof_end-.055)+roof['frontOverhang']),front_normal),
    ((roof_end,facade_front(roof_end)+roof['frontOverhang']-.055),(roof_end,SPACE['upperClosure'][3]+.055),Vector((1,0,0)))
]:
    a=(a[0]-normal.x*.065,a[1]-normal.z*.065);b=(b[0]-normal.x*.065,b[1]-normal.z*.065)
    wall_panel('Upper_Roof_Planting_Soil',a,b,.10,soil,bottom=lambda z:ceiling+roof_thickness-.002,top=lambda z:ceiling+roof_thickness+.008)

# The exposed right support below replaces its former buried duplicate.
for x in [lower_west_x,-2.65]:
    size=west['lowerColumnSize']
    front=facade_front(x)-west['lowerColumnInset']
    cylinder('Lower_Stone_Column',(x,3.43/2,front),size/2,3.43,column_stone,vertices=24)
    cap=.27
    column_collar('Lower_Column_Base_Collar',x,front,size,size,west_inner if x==lower_west_x else None)
    column_head('Lower_Column_Capital',x,front,size,3.50-SPACE['lowerColumnBase']['height'],3.50,SPACE['lowerColumnBase']['border'])
# Close the exposed underside of the projecting stone band with one slim
# graphite strip. The old round trim was completely buried inside the stone.
wall_panel('Lower_Balcony_Ivory_Soffit',tuple(fa),tuple(fb),.242,stone,bottom=lambda z:upper-.60,top=lambda z:upper-.577)
# A continuous timber soffit covers the exterior ground-floor veranda.
veranda_ceiling=SPACE['upperFloor']-.30
veranda_outline=clip_rect(outline,-5.3,fb[0],.16,3)
recessed_ceiling('Veranda',veranda_outline,lambda z:veranda_ceiling,'Veranda')

def finished_original_railing(stations):
    """Keep the original cylinders and .085 x 1.06 newels; fill only join voids."""
    rails=[];incident=[[] for _ in stations]
    for i,(a,b) in enumerate(zip(stations,stations[1:])):
        rail=rod('Original_Oak_Handrail',(a[0],a[1]+1.05,a[2]),(b[0],b[1]+1.05,b[2]),.042,oak)
        rails.append(rail);incident[i].append((rail,0));incident[i+1].append((rail,1))
        rod('Original_Bronze_Low_Rail',(a[0],a[1]+.10,a[2]),(b[0],b[1]+.10,b[2]),.010,metal)
        count=max(1,math.ceil(math.hypot(b[0]-a[0],b[2]-a[2])/.145))
        for step in range(count+1):
            if i and step==0:continue
            t=step/count;x,y,z=[a[j]+(b[j]-a[j])*t for j in range(3)]
            rod('Original_Rail_Baluster',(x,y+.10,z),(x,y+1.02,z),.009,metal)
    posts=[box('Original_Oak_Newel',(x,y+.53,z),(.085,1.06,.085),oak,.008) for x,y,z in stations]
    bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get()
    for i,((x,y,z),post) in enumerate(zip(stations,posts)):
        evaluated=post.evaluated_get(graph);data=evaluated.to_mesh()
        points=[post.matrix_world@v.co for v in data.vertices if (post.matrix_world@v.co).z>=y+1.045]
        evaluated.to_mesh_clear()
        for rail,end in incident[i]:
            endpoint=Vector(xyz((x,y+1.05,z)))
            axis=rail.matrix_world.to_3x3()@Vector((0,0,1))
            evaluated=rail.evaluated_get(graph);data=evaluated.to_mesh()
            points.extend(p for v in data.vertices if abs((p:=rail.matrix_world@v.co).dot(axis)-endpoint.dot(axis))<.012)
            evaluated.to_mesh_clear()
        bm=bmesh.new()
        for point in points:bm.verts.new(point)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0000001)
        result=bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        data=bpy.data.meshes.new('Fitted_Rail_Joint_Mesh');bm.to_mesh(data);bm.free()
        joint=bpy.data.objects.new('Fitted_Rail_Joint_'+str(i),data);bpy.context.collection.objects.link(joint);data.materials.append(oak)
        uv=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for li in poly.loop_indices:
                p=data.vertices[data.loops[li].vertex_index].co
                uv.data[li].uv=((p.x-x)/1.7+.5,(p.z-y-.53)/1.7+.5)
        # This shallow fitted cap follows the original post top and the round
        # rail ends. The post body, bevel and handrail cylinders stay intact.
        # A hair of overlap prevents coincident faces at the wood seams.
        for vertex in joint.data.vertices:
            vertex.co.z+=.00008
        bm=bmesh.new();bm.from_mesh(joint.data)
        assert all(edge.is_manifold for edge in bm.edges),('Open rail cap',i)
        bm.free()
        print('ORIGINAL_RAIL_FINISH',i,'post_width',.085,'post_height',1.06,'filler_faces',len(joint.data.polygons),flush=True)
        if not joint.data.polygons:bpy.data.objects.remove(joint,do_unlink=True)

# Three connected directions share mitered cross-sections, including the
# landing. No rotated rectangles or independently offset rail endpoints.
def edge_at(f,t):
    return [tuple(a[j]+(b[j]-a[j])*t for j in range(2)) for a,b in zip(f['startEdge'],f['endEdge'])]
def cross_at(edge,u):return tuple(edge[0][j]+(edge[1][j]-edge[0][j])*u for j in range(2))
def side_strip(name,a,b,ha,hb,left,mat,thickness=.13,base=0):
    # A consistent external X offset keeps every corner shared. Height is
    # parameterized on the edge itself, so a miter cannot leave a wedge.
    poly=[(a[0]-.065,a[1]),(a[0]+.065,a[1]),(b[0]+.065,b[1]),(b[0]-.065,b[1])]
    tops=[ha,ha,hb,hb];bottoms=[base]*4 if base==0 else [v-thickness for v in tops]
    verts=[(p[0],h,p[1]) for p,h in zip(poly,bottoms)]+[(p[0],h,p[1]) for p,h in zip(poly,tops)]
    obj=crafted_mesh(name,verts,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
    # Recalculate closed-volume normals after the affine logical conversion.
    import bmesh
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
for fi,f in enumerate(SPACE['stairs']['flights']):
    steps=f['steps'];columns=math.ceil(f['width']/.60)
    for i in range(steps):
        start,end=edge_at(f,i/steps),edge_at(f,(i+1)/steps)
        poly=[start[0],start[1],end[1],end[0]];h=f['bottom']+(i+1)*(f['top']-f['bottom'])/steps
        slab('Connected_Stair_Solid_Stone',poly,0,h-.006,stone)
        # Full stone substrate stays below the subtle transverse tile seams.
        for col in range(columns):
            lo=col/columns+(.0007 if col else 0);hi=(col+1)/columns-(.0007 if col<columns-1 else 0)
            tile=[cross_at(start,lo),cross_at(start,hi),cross_at(end,hi),cross_at(end,lo)]
            slab('Connected_Stair_Tiled_Tread',tile,h-.006,h,stone)
landing=SPACE['stairs']['landing'];level=SPACE['stairs']['landingHeight']
slab('Stair_Landing_Masonry',landing,0,level-.045,plaster)
tiled_surface('Stair_Landing',landing,level)
sections=SPACE['stairs']['sections']
for i,(a,b) in enumerate(zip(sections,sections[1:])):
    for side in [0]:
        pa,pb=a['edge'][side],b['edge'][side];ha,hb=a['height'],b['height']
        side_strip('Stair_Continuous_Mineral_Side',pa,pb,min(upper,ha+.14),min(upper,hb+.14),side==0,plaster)
        side_strip('Stair_Continuous_Stone_Cap',pa,pb,min(upper,ha+.18),min(upper,hb+.18),side==0,stone,.055,base=1)
rail_stations=[(fa[0],upper,fa[1])]+[(s['edge'][0][0],s['height'],s['edge'][0][1]) for s in reversed(sections)]
finished_original_railing(rail_stations)
# Tiled mineral band below the railing, with two aligned stone courses.
length=math.hypot(fb[0]-fa[0],fb[1]-fa[1]);tiles=math.ceil(length/.60)
for i in range(tiles):
    a=[fa[j]+(fb[j]-fa[j])*i/tiles for j in range(2)];b=[fa[j]+(fb[j]-fa[j])*(i+1)/tiles for j in range(2)]
    for row in range(2):
        low=upper-.58+row*.29
        wall_panel('Balcony_Limestone_Tile',tuple(a),tuple(b),.23,stone,bottom=lambda z,v=low:v+.003,top=lambda z,v=low:v+.287)
side_strip('Balcony_Floor_Level_Stone_Cap',tuple(fa),tuple(fb),upper,upper,True,stone,.055,base=1)
# A flush cross-section joins the final tread and upper tile substrate.
last=SPACE['stairs']['flights'][-1];dx=last['head'][0]-last['foot'][0];dz=last['head'][1]-last['foot'][1];length=math.hypot(dx,dz);dx*=.025/length;dz*=.025/length
l,r=last['endEdge']
slab('Flush_Upper_Stair_Threshold',[(l[0]-dx,l[1]-dz),(r[0]-dx,r[1]-dz),(r[0]+dx,r[1]+dz),(l[0]+dx,l[1]+dz)],upper-.024,upper,stone)
# The solid lower return already joins the stair cheek. A raised wall/cap across
# this upper floor was a curb; keep the connected tile substrate flush instead.

# The left room is a real, open-front studio, with one continuous rear wall.
box('Gallery_Rear_Wall',(-3.99,1.76,-3.44),(3.02,3.52,.22),plaster,.012)
# The studio uses the same uninterrupted west wall as the upper library.

studio_roof=[(-5.54,-3.54),(-2.42,-3.54),(-2.42,.16),(-5.54,.16)]
# Same continuous oak ceiling and transverse beam section as the main atelier.
verts=[(x,roof_height(z)+rise,z) for rise in [0,.08] for x,z in studio_roof]
continuous_recessed_ceiling('Studio',studio_roof,ground_finish,'Studio')
# Studio fixture geometry is declared alongside the other shared interior strips.
box('Gallery_Worktable_Top',(-4.0,.86,-2.0),(2.50,.09,.75),porcelain,.022)
for x in [-5.05,-2.95]:
    for z in [-2.28,-1.71]:box('Gallery_Desk_Leg',(x,.41,z),(.065,.82,.065),blacksteel,.008)
box('Gallery_Low_Shelf',(-4.0,.24,-2.0),(2.3,.055,.60),lacquer,.007)
stool(-4.3,-1.1);stool(-3.4,-1.1)
for x in [-4.93,-3.12]:tools(x,-2.17)
# The interactive profile volume owns the clear centre of this desk at runtime.

# Join the perimeter beds geometrically; only exposed boundaries receive rims.
def union_bed(rectangles):
    xs=sorted(set(x for a,b,c,d in rectangles for x in [a,b]));zs=sorted(set(z for a,b,c,d in rectangles for z in [c,d]))
    cells={(i,j) for i in range(len(xs)-1) for j in range(len(zs)-1) if any(a<=(xs[i]+xs[i+1])/2<=b and c<=(zs[j]+zs[j+1])/2<=d for a,b,c,d in rectangles)}
    edges={}
    for i,j in sorted(cells):
        a,b,c,d=xs[i],xs[i+1],zs[j],zs[j+1]
        for neighbor,p,q in [((i,j-1),(a,c),(b,c)),((i+1,j),(b,c),(b,d)),((i,j+1),(b,d),(a,d)),((i-1,j),(a,d),(a,c))]:
            if neighbor not in cells:edges[p]=q
    while edges:
        start=min(edges);loop=[start];point=edges.pop(start)
        while point!=start:loop.append(point);point=edges.pop(point)
        # Remove collinear grid stations before making corresponding offsets.
        loop=[p for i,p in enumerate(loop) if abs((p[0]-loop[i-1][0])*(loop[(i+1)%len(loop)][1]-p[1])-(p[1]-loop[i-1][1])*(loop[(i+1)%len(loop)][0]-p[0]))>1e-8]
        outer=offset_outline(loop,-.025);inner=offset_outline(loop,.025)
        slab('Connected_Perimeter_Bed',loop,0,.18,planterstone)
        slab('Connected_Perimeter_Soil',inner,.18,.225,soil)
        closed_rim('Continuous_Bed_Rim',outer,inner,0,.28,stone,.005)
union_bed(GARDEN['beds'][:GARDEN['courtyardBedCount']])
for a,b,c,d in GARDEN['beds'][GARDEN['courtyardBedCount']:]:
    union_bed([(a,b,c,d)])
east_bed=GARDEN['eastBed']
slab('Continuous_East_Garden',east_bed,0,.18,planterstone)
slab('Continuous_East_Soil',GARDEN['eastSoil'],.18,.225,soil)
for a,b in zip(east_bed[:-1],east_bed[1:]):
    if abs(b[1]-a[1])>1e-8:
        # Share the stair rim's exact X cross-section at the ground junction.
        side_strip('East_Bed_Limestone_Rim',a,b,.28,.28,True,stone,base=0)
    else:
        length=math.hypot(b[0]-a[0],b[1]-a[1]);angle=math.atan2(b[0]-a[0],b[1]-a[1])
        box('East_Bed_Limestone_Rim',((a[0]+b[0])/2,.14,(a[1]+b[1])/2),(.055,.28,length),stone,.005,rot=-angle)
stair_bed=GARDEN['stairBed']
def rising_bed(name,aa,bb,ha,hb,mat,depth=None):
    poly=[aa[0],aa[1],bb[1],bb[0]];tops=[ha,ha,hb,hb]
    bottoms=[0]*4 if depth is None else [h-depth for h in tops]
    verts=[(p[0],h,p[1]) for p,h in zip(poly,bottoms)]+[(p[0],h,p[1]) for p,h in zip(poly,tops)]
    obj=crafted_mesh(name,verts,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
bed_sections=GARDEN['stairBedSections']
for a,b in zip(bed_sections,bed_sections[1:]):
    rising_bed('Continuous_Rising_Stair_Plaster_Base',a['edge'],b['edge'],a['height']+.14,b['height']+.14,plaster)
    rising_bed('Continuous_Rising_Stair_Planter',a['edge'],b['edge'],a['height']+.18,b['height']+.18,planterstone,.20)
    rising_bed('Continuous_Rising_Stair_Soil',a['soil'],b['soil'],a['height']+.225,b['height']+.225,soil,.035)
    for side in [0,1]:
        pa,pb=a['edge'][side],b['edge'][side]
        # A solid stone cheek reaches the ground beneath the entire rim,
        # including its overhang and the shared miter at the first section.
        side_strip('Continuous_Rising_Stair_Rim',pa,pb,a['height']+.28,b['height']+.28,True,stone,base=0)
# The first section shares its entire soil/rim edge with the ground east bed.
# Do not close that junction with a transverse rim.
for section in [bed_sections[-1]]:
    wall_panel('Stair_Planter_End_Rim',section['edge'][0],section['edge'][1],.055,stone,bottom=lambda z,h=section['height']:h+.13,top=lambda z,h=section['height']:h+.28)

for pot in GARDEN['stairWallPots']:
    x,z=pot['position'];h=pot['potHeight'];r=pot['radius']
    cylinder('Stair_Wall_Glazed_Pot',(x,h/2,z),r*.76,h,whiteceramic,radius_top=r,vertices=48)
    cylinder('Stair_Wall_Pot_Rim',(x,h-.009,z),r+.009,.027,whiteceramic,vertices=48)
    cylinder('Stair_Wall_Pot_Soil',(x,h+.004,z),r-.020,.012,soil,vertices=32)

# Built-in bookcases, a writing table, linen chair and a woven reading rug.
for x in [-4.6,-3.5,-2.4,-1.3,-.2,.9,1.55]:
    box('Upper_Bookcase_Back',(x,upper+1.36,-3.22),(.98,2.64,.07),oak_dark,.004)
    for xx in [x-.50,x+.50]:box('Upper_Bookcase_Post',(xx,upper+1.38,-3.06),(.075,2.76,.37),oak,.008)
    for level in range(6):
        y=upper+.12+level*.51
        box('Upper_Bookcase_Shelf',(x,y,-3.06),(1.04,.055,.38),oak,.008)
        if level>0:box('Upper_Shelf_Amber_Strip',(x,y-.035,-2.88),(.89,.012,.015),shelf_light,.003)
        for i in range(8):
            h=random.uniform(.23,.37)
            box('Upper_Library_Book',(x-.41+i*.105,y+.035+h/2,-3.04),(.075,h,.24),book_mats[(i+level+round(x))%6],.002)
# One long, three-cushion ivory sofa faces into the room, clear of the rear books.
sofa=GARDEN['library']['sofa'];sx,sz=sofa['center'];depth,length=sofa['size']
box('Upper_Sofa_Recessed_Platform',(sx,upper+.14,sz),(depth-.13,.18,length-.13),blacksteel,.018)
box('Upper_Sofa_Upholstered_Base',(sx,upper+.30,sz),(depth,.24,length),leather,.06)
box('Upper_Sofa_Back',(sofa['backFaceX']+.085,upper+.69,sz),(.17,.78,length),leather,.07)
for zz in [sz-length/2+.10,sz+length/2-.10]:
    box('Upper_Sofa_Arm',(sx+.01,upper+.55,zz),(depth-.02,.38,.20),leather,.055)
for i in range(3):
    zz=sz+(i-1)*(length-.43)/3
    box('Upper_Sofa_Seat_Cushion',(sx+.055,upper+sofa['seatHeight'],zz),(depth-.24,.19,(length-.43)/3-.015),leather,.060)
    box('Upper_Sofa_Back_Cushion',(sx-.285,upper+.73,zz),(.16,.58,(length-.43)/3-.018),leather,.065)
furniture_start=set(bpy.data.objects)
box('Upper_Writing_Desk',(-2.98,upper+.79,-1.55),(2.2,.08,.78),porcelain,.022)
for x in [-3.95,-2.01]:
    for z in [-1.86,-1.23]:box('Upper_Desk_Leg',(x,upper+.375,z),(.065,.75,.065),blacksteel,.008)
for i in range(5):box('Upper_Desk_Book',(-3.6,upper+.85+i*.026,-1.5),(.33,.024,.25),book_mats[i],.003)
cylinder('Upper_Pencil_Cup',(-2.14,upper+.89,-1.7),.07,.15,ceramic)
cylinder('Upper_Ceramic_Vase',(-3.95,upper+.99,-1.76),.105,.32,whiteceramic,radius_top=.07)
box('Upper_Jute_Rug',(-3.08,upper+.014,-.91),(2.40,.022,1.65),jute,.004)
box('Upper_Chair_Seat',(-3.1,upper+.44,-.45),(.69,.17,.69),leather,.065)
box('Upper_Chair_Back',(-3.1,upper+.82,-.12),(.69,.76,.12),leather,.055)
for x in [-3.49,-2.71]:
    box('Upper_Chair_Arm',(x,upper+.66,-.43),(.095,.10,.69),leather,.020)
    for z in [-.74,-.13]:box('Upper_Chair_Leg',(x,upper+.30,z),(.045,.60,.045),blacksteel,.009)
shift=GARDEN['library']['deskShift']
for obj in set(bpy.data.objects)-furniture_start:
    obj.location.x+=shift[0];obj.location.y-=shift[1]
box('Upper_Plant_Pot',(1.58,upper+.29,-2.36),(.58,.58,.58),planterstone,.015)
box('Upper_Plant_Soil',(1.58,upper+.585,-2.36),(.51,.014,.51),soil,.002)

# Bronze sconces and stone stair lamps share positions with the live lighting.
decor=json.loads((ROOT/'src/scene/wall-decor.json').read_text(encoding='utf-8-sig'))
for lamp in decor['lamps']:
    x,y,z,rotation=lamp
    obj=cylinder('Antique_Wall_Sconce',(x,y,z),.071,.33,metal,vertices=24)
    cylinder('Sconce_Luminous_Upper',(x,y+.168,z),.049,.009,warm_light,vertices=24)
    cylinder('Sconce_Luminous_Lower',(x,y-.168,z),.049,.009,warm_light,vertices=24)
    if lamp==decor['studioPendant']:
        top=ground_finish(z)
        cylinder('Studio_Pendant_Ceiling_Rose',(x,top-.020,z),.060,.040,metal)
        rod('Studio_Pendant_Suspension_Cord',(x,top-.040,z),(x,y+.166,z),.006,charcoal)
for x,y,z,angle in decor['stepLights']:
    box('Stair_Embedded_Light',(x,y,z),(.025,.085,.12),warm_light,.005,rot=angle)
for x,y,z,rotation in decor['stairLamps']:
    cylinder('Stair_Side_Bronze_Sconce',(x,y,z),.065,.31,metal,vertices=24)
    for side in [-1,1]:cylinder('Stair_Side_Opal',(x,y+side*.158,z),.051,.012,warm_light,vertices=24)

for strip in decor['interiorStrips']:
    x,y,z=strip['position']
    box(strip['name']+'_Recessed_Linear_Housing',(x,y+.010,z),(strip['width']+.035,.024,.060),metal,.002)
    box(strip['name']+'_Warm_Linear_Diffuser',(x,y-.004,z),(strip['width'],.010,.035),ceiling_opal if strip['name']=='Library' else studio_ceiling_opal if strip['name']=='Studio' else ground_ceiling_opal,.001)

# Every visible pool of ceiling light has a modeled fitting, flush to the roof.
for fitting in decor['ceilingSpots']:
    x,y,z=fitting['position']
    cylinder('Atelier_Flush_White_Spot_Rim',(x,y-.010,z),.117,.014,ceiling_white,vertices=32)
    cylinder('Atelier_Recessed_Spot_Back',(x,y+.015,z),.106,.015,metal,vertices=32)
    cylinder('Atelier_Recessed_Spot_Opal',(x,y-.004,z),.079,.008,ground_ceiling_opal,vertices=32)

# One antique ceiling pendant, centered above the upper reading room.
px,py,pz=decor['ceilingLight']['position']
cylinder('Pendant_Ceiling_Rose',(px,ceiling-.035,pz),.11,.055,metal,vertices=32)
rod('Pendant_Bronze_Stem',(px,ceiling-.06,pz),(px,py+.15,pz),.010,metal)
cylinder('Pendant_Bronze_Shade',(px,py+.12,pz),.27,.17,metal,vertices=48,radius_top=.11)
cylinder('Pendant_Opal_Diffuser',(px,py+.022,pz),.245,.05,warm_light,vertices=48)
cylinder('Pendant_Bronze_Rim',(px,py-.004,pz),.253,.022,metal,vertices=48)

# Angle only the outside gallery timber and furniture; the inner gallery stays
# square to its original artwork wall and shared passage.
outside_prefixes=('Pergola_','Exterior_Work_','Terrace_','Laptop_','Linen_Canopy','Gallery_Solid_Backing','Stool_','Tool_','Brush_')
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH' or not obj.name.startswith(outside_prefixes) or (obj.location.y>=0 and not obj.name.startswith(('Linen_Canopy','Gallery_Solid_Backing'))):continue
    matrix=obj.matrix_world.copy();inverse=matrix.inverted()
    for vertex in obj.data.vertices:
        p=matrix@vertex.co;z=-p.y
        p.y-=(facade_front(p.x)-1.6)*max(0,min(1,z/2.45))
        vertex.co=inverse@p

# Continuous vertical oak slat interiors, on recessed dark oak backing.
# Segment order places the normal toward the room. Real slim boards, 35mm gaps,
# softly rounded edges and scanned longitudinal grain match the selected detail.
def slatted_wall(name,a,b,bottom,ceiling_top,cornice=True):
    dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);nx,nz=-dz/length,dx/length
    top=lambda z:ceiling_top(z)-.24
    # Split the genuine ceiling pitch break so every top and cornice follows it.
    stations=[0,1]
    if dz and 0<(-3.4-a[1])/dz<1:stations.insert(1,(-3.4-a[1])/dz)
    for t0,t1 in zip(stations,stations[1:]):
        aa=(a[0]+dx*t0,a[1]+dz*t0);bb=(a[0]+dx*t1,a[1]+dz*t1)
        wall_panel(name+'_Recessed_Back',aa,bb,.018,oak_dark,bottom=lambda z:bottom,top=top)
        if cornice:wall_panel(name+'_White_Ceiling_Cornice',(aa[0]+nx*.026,aa[1]+nz*.026),(bb[0]+nx*.026,bb[1]+nz*.026),.075,ceiling_white,bottom=top,top=lambda z:ceiling_top(z)+.002)
    count=max(1,round(length/.078));pitch=length/count
    for i in range(count):
        t=(i+.5)/count;half=.043/length/2
        aa=(a[0]+dx*(t-half)+nx*.030,a[1]+dz*(t-half)+nz*.030)
        bb=(a[0]+dx*(t+half)+nx*.030,a[1]+dz*(t+half)+nz*.030)
        wall_panel(name+'_Vertical_Oak_Slat',aa,bb,.048,oak,bottom=lambda z:bottom,top=top)
    wall_panel(name+'_Floor_Finish',a,b,.070,oak_dark,bottom=lambda z:bottom,top=lambda z:bottom+.065)

def fitted_cornice(name,path,height):
    # One open U-shaped, closed-volume molding. Shared miter sections turn
    # through the entry bends and rear corners without overlapping bar ends.
    normals=[]
    for a,b in zip(path,path[1:]):
        dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
        normals.append((-dz/length,dx/length))
    sections=[]
    for i,p in enumerate(path):
        a=normals[max(0,i-1)];b=normals[min(i,len(normals)-1)]
        denom=1+a[0]*b[0]+a[1]*b[1]
        sections.append([tuple(p[j]+offset*(a[j]+b[j])/denom for j in range(2)) for offset in [-.016,.066]])
    verts=[];faces=[];lookup={};edges={}
    def vertex(p,offset):
        key=(round(p[0],8),round(height(p[1])+offset,8),round(p[1],8))
        if key not in lookup:lookup[key]=len(verts);verts.append(key)
        return lookup[key]
    for a,b in zip(sections,sections[1:]):
        footprint=[a[0],b[0],b[1],a[1]]
        # Split at the real pitch change, without tilted end caps in the soffit.
        for lo,hi in [(-20,-3.4),(-3.4,20)]:
            patch=clip_rect(footprint,-20,20,lo,hi)
            if not patch:continue
            faces.extend([tuple(vertex(p,-.24) for p in patch),tuple(vertex(p,.008) for p in reversed(patch))])
            for p,q in zip(patch,patch[1:]+patch[:1]):
                edge=tuple(sorted([(round(p[0],8),round(p[1],8)),(round(q[0],8),round(q[1],8))]))
                edges.setdefault(edge,[]).append((p,q))
    for adjacent in edges.values():
        assert len(adjacent)<=2,'Cornice edges must be shared only by adjacent sections'
        if len(adjacent)==1:
            p,q=adjacent[0];faces.append((vertex(p,-.24),vertex(q,-.24),vertex(q,.008),vertex(p,.008)))
    obj=crafted_mesh(name,verts,faces,ceiling_white)
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bmesh.ops.dissolve_limit(bm,angle_limit=.00001,verts=list(bm.verts),edges=list(bm.edges),delimit=set())
    assert all(e.is_manifold for e in bm.edges),'The fitted cornice must be watertight'
    bm.to_mesh(obj.data);bm.free()
    print('FITTED_CORNICE',name,'shared_sections',len(sections),'closed_faces',len(obj.data.polygons),flush=True)

atelier_walls=[(-1.919,-.13),(-2.289,-1.20),(-2.289,-6.989),(2.289,-6.989),(2.289,-1.20),(1.919,-.13)]
for name,a,b in zip(['Left_Entry','Left','Back','Right','Right_Entry'],atelier_walls,atelier_walls[1:]):
    slatted_wall('Atelier_'+name,a,b,.006,ground_finish,cornice=False)
fitted_cornice('Atelier_Continuous_Mitered_Cornice',atelier_walls,ground_finish)
slatted_wall('Studio_Artwork',(-5.28,-2.586),(-2.71,-2.586),.006,ground_finish)
slatted_wall('Studio_Rear',(-5.302,-3.321),(-2.553,-3.321),.006,ground_finish)
# Stop the wood at the moved column's rear face. The existing continuous
# exterior wall is exposed up to that junction, without overlapping wall skins.
studio_wood_end=facade_front(lower_west_x)-west['lowerColumnInset']-west['lowerColumnSize']/2
slatted_wall('Studio_Left',(-5.302,studio_wood_end),(-5.302,-3.321),.006,ground_finish)
slatted_wall('Studio_Right',(-2.553,-3.321),(-2.553,-1.20),.006,ground_finish)
slatted_wall('Studio_Entry',(-2.553,-1.20),(-2.18,.13),.006,ground_finish)
slatted_wall('Stair_Facade_Return',(2.18,.169),(east_inner(.16)-.025,.169),.006,lambda z:veranda_ceiling)
# Follow the same exposed masonry edge from the ground return through every
# stair bend. Nothing projects above the upper walking floor, and the backing
# and timber boards continue over the former infill/cheek seam.
def slatted_stair_face(name,a,b,ha,hb,floor_join=False):
    dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);nx,nz=-dz/length,dx/length
    def height(z):
        y=ha+(hb-ha)*(z-a[1])/dz if abs(dz)>1e-8 else ha
        # Entrance wall cladding stops below the existing continuous marble.
        return y-.045 if floor_join else y
    wall_panel(name+'_Dark_Back',a,b,.018,oak_dark,bottom=lambda z:.006,top=height)
    count=max(1,round(length/.078));pitch=length/count
    for i in range(count):
        t=(i+.5)/count;half=.043/length/2
        aa=(a[0]+dx*(t-half)+nx*.030,a[1]+dz*(t-half)+nz*.030)
        bb=(a[0]+dx*(t+half)+nx*.030,a[1]+dz*(t+half)+nz*.030)
        wall_panel(name+'_Oak_Slat',aa,bb,.048,oak,bottom=lambda z:.006,top=lambda z:max(.075,height(z)-.055))
    if not floor_join:
        wall_panel(name+'_Flush_Dark_Crown',a,b,.075,oak_dark,bottom=lambda z:max(.075,height(z)-.055),top=height)
wa,wb=SPACE['lowerCornerClosure'][3],SPACE['lowerCornerClosure'][0]
slatted_stair_face('Stair_Return_West',tuple(wa),tuple(wb),upper,upper,floor_join=True)
# One full-size right column emerges just behind the projecting balcony band.
# The round shaft and mineral top/foot profiles match the central column.
trim=SPACE['stairFacadeTrim'];corner=SPACE['lowerCornerClosure'][0]
trim_x=corner[0]+trim['offset'][0];trim_z=corner[1]+trim['offset'][1]
cylinder('Lower_Right_Stone_Column',(trim_x,(trim['base']+trim['top'])/2,trim_z),
         min(trim['width'],trim['depth'])/2,trim['top']-trim['base'],column_stone,vertices=24)
column_collar('Stair_Facade_Base_Collar',trim_x,trim_z,trim['width'],trim['depth'])
column_head('Stair_Facade_Column_Capital',trim_x,trim_z,trim['width'],3.50-SPACE['lowerColumnBase']['height'],3.50,SPACE['lowerColumnBase']['border'])

for i in range(len(sections)-1,0,-1):
    a,b=sections[i],sections[i-1]
    aa=(a['edge'][0][0]-.065,a['edge'][0][1]);bb=(b['edge'][0][0]-.065,b['edge'][0][1])
    slatted_stair_face('Connected_Stair_Exterior_'+str(i),aa,bb,min(upper,a['height']+.14),min(upper,b['height']+.14))
upper_roof=lambda z:ceiling
slatted_wall('Library_Rear',(-5.302,-3.329),(2.149,-3.329),upper+.006,upper_roof)
slatted_wall('Library_Left',(-5.302,facade_front(-5.302)-.19),(-5.302,-3.329),upper+.006,upper_roof)
slatted_wall('Library_Right',(2.149,-3.329),(2.149,.149),upper+.006,upper_roof)

# Apply small bevels and merge by material for a compact renderer scene.
print('TWO_STOREY_GEOMETRY_READY',len(bpy.context.scene.objects),flush=True)
depsgraph=bpy.context.evaluated_depsgraph_get()
groups={}
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH': continue
    evaluated=obj.evaluated_get(depsgraph)
    mesh=bpy.data.meshes.new_from_object(evaluated,depsgraph=depsgraph)
    mesh.transform(obj.matrix_world)
    new=bpy.data.objects.new(obj.name+'_baked',mesh)
    bpy.context.collection.objects.link(new)
    if obj.data.materials: new.data.materials.append(obj.data.materials[0])
    groups.setdefault(new.data.materials[0].name if new.data.materials else 'none',[]).append(new)
    bpy.data.objects.remove(obj,do_unlink=True)
for name,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1: bpy.ops.object.join()
    bpy.context.object.name=name+'_Geometry'

ASSETS.mkdir(exist_ok=True)
for image in bpy.data.images:
    if image.size[0]>2048 or image.size[1]>2048:
        scale=2048/max(image.size)
        image.scale(int(image.size[0]*scale),int(image.size[1]*scale))
kwargs={'filepath':str(ROOT/'tools/generated/architecture-base.glb'),'export_format':'GLB','export_yup':True,'export_draco_mesh_compression_enable':True,'export_draco_mesh_compression_level':6}
source_dir=ROOT/'tools'/'generated'
source_dir.mkdir(exist_ok=True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source_dir/'connected-atelier.blend'))
bpy.ops.export_scene.gltf(**kwargs)
print('ARCHITECTURE_EXPORTED',len(bpy.context.scene.objects),(ROOT/'tools/generated/architecture-base.glb').stat().st_size,flush=True)
