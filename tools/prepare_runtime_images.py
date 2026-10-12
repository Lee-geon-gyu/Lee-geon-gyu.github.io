"""Compress scene previews; original portfolio artwork and content stay intact."""
import json,struct,io
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/runtime';OUT.mkdir(parents=True,exist_ok=True)
content=json.loads((ROOT/'public/portfolio-content.json').read_text(encoding='utf-8-sig'))
manifest={'previews':{},'textures':{}}
def preview(source,target,limit,quality=85):
    with Image.open(ROOT/'public'/source) as image:
        image=image.convert('RGB');image.thumbnail((limit,limit),Image.Resampling.LANCZOS)
        image.save(OUT/target,'WEBP',quality=quality,method=6)
    return 'assets/runtime/'+target
for project in content['projects']:
    source=project['representativeImage']
    manifest['previews'][source]=preview(source,project['id']+'.webp',1024)
source=content['profile']['portrait'];manifest['previews'][source]=preview(source,'portrait.webp',512)
for name,limit in [('afternoon-sky.png',1774),('jute-rug.png',1024),('ivory-marble.png',1024),('book-spines.png',1536),('pool-caustics.png',768),('foliage-light-mask.png',768)]:
    manifest['textures'][name]=preview('assets/'+name,Path(name).stem+'.webp',limit,90)
(ROOT/'src/scene/runtime-assets.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({p.name:p.stat().st_size for p in OUT.iterdir() if p.suffix=='.webp'},indent=2))

def compact_glb(path,limit):
    # Blender can retain packed source image bytes despite image.scale(). Repack
    # embedded textures explicitly, leaving compressed geometry and UVs intact.
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+length]);source=data[28+length:];images={i['bufferView']:i for i in doc.get('images',[])}
    binary=bytearray()
    for index,view in enumerate(doc['bufferViews']):
        start=view.get('byteOffset',0);raw=source[start:start+view['byteLength']]
        if index in images:
            with Image.open(io.BytesIO(raw)) as image:
                image.thumbnail((limit,limit),Image.Resampling.LANCZOS);output=io.BytesIO()
                alpha='A' in image.getbands()
                image.save(output,'PNG' if alpha else 'JPEG',**({'optimize':True} if alpha else {'quality':86,'optimize':True}))
                raw=output.getvalue();images[index]['mimeType']='image/png' if alpha else 'image/jpeg'
        view['byteOffset']=len(binary);view['byteLength']=len(raw);binary.extend(raw)
        binary.extend(b'\0'*((-len(binary))%4))
    doc['buffers'][0]['byteLength']=len(binary)
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)
    print('COMPACT_GLB',path.name,len(data),path.stat().st_size)

for name,limit in [('atelier.glb',1024),('garden.glb',512),('tree.glb',512)]:
    path=OUT/name
    if path.exists():compact_glb(path,limit)

# Keep runtime builds reproducible at the approved original visual quality.
import runpy
runpy.run_path(str(ROOT/'tools/restore_runtime_quality.py'),run_name='__main__')
