"""Restore source-resolution textures without restoring expensive source meshes.

Run after build_runtime_models.py / prepare_runtime_images.py. Geometry, UVs,
lightmaps and original artwork are untouched; only texture buffer views change.
"""
import io,json,struct
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/runtime'

def read_glb(path):
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+length]),data[28+length:]

def slots(material):
    return {'base':material.get('pbrMetallicRoughness',{}).get('baseColorTexture'),
            'normal':material.get('normalTexture')}

def image_index(doc,texture):
    item=doc['textures'][texture['index']]
    return item.get('source',item.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))

def restore_glb(name,source):
    path=OUT/name;doc,binary=read_glb(path);original,source_binary=read_glb(ROOT/'public/assets'/source)
    originals={m['name']:m for m in original['materials']};replacements={}
    for material in doc['materials']:
        native=originals.get(material['name'])
        if native is None:continue
        for kind,texture in slots(material).items():
            source_texture=slots(native)[kind]
            if texture is None or source_texture is None:continue
            index=image_index(doc,texture);source_index=image_index(original,source_texture)
            view=original['bufferViews'][original['images'][source_index]['bufferView']]
            raw=source_binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
            with Image.open(io.BytesIO(raw)) as image:
                output=io.BytesIO()
                # Keep native normal bytes exactly: re-encoding already compressed
                # normal channels losslessly can inflate them several times.
                if kind=='normal':
                    encoded=raw;mime=original['images'][source_index]['mimeType']
                else:
                    image.save(output,'WEBP',quality=95,method=6)
                    encoded=output.getvalue();mime='image/webp'
                replacements[doc['images'][index]['bufferView']]=encoded
                doc['images'][index]['mimeType']=mime
    # Runtime foliage uses diffuse Lambert lighting. Drop normal textures it
    # never samples, retaining every original-resolution color/silhouette map.
    if name!='atelier.glb':
        for material in doc['materials']:material.pop('normalTexture',None)
        used=sorted({t['index'] for m in doc['materials'] for t in slots(m).values() if t is not None})
        texture_map={old:new for new,old in enumerate(used)}
        for material in doc['materials']:
            for texture in slots(material).values():
                if texture is not None:texture['index']=texture_map[texture['index']]
        doc['textures']=[doc['textures'][i] for i in used]
        used_images=sorted({image_index(doc,{'index':i}) for i in range(len(doc['textures']))})
        image_map={old:new for new,old in enumerate(used_images)}
        removed_views={image['bufferView'] for i,image in enumerate(doc['images']) if i not in used_images}
        for texture in doc['textures']:
            if 'source' in texture:texture['source']=image_map[texture['source']]
            elif 'EXT_texture_webp' in texture.get('extensions',{}):
                extension=texture['extensions']['EXT_texture_webp'];extension['source']=image_map[extension['source']]
        doc['images']=[doc['images'][i] for i in used_images]
    else:removed_views=set()
    result=bytearray()
    view_map={i:new for new,i in enumerate(i for i in range(len(doc['bufferViews'])) if i not in removed_views)}
    for i,view in enumerate(doc['bufferViews']):
        if i in removed_views:continue
        raw=replacements.get(i,binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])
        view['byteOffset']=len(result);view['byteLength']=len(raw);result.extend(raw);result.extend(b'\0'*(-len(result)%4))
    doc['bufferViews']=[view for i,view in enumerate(doc['bufferViews']) if i not in removed_views]
    def remap_views(node):
        if isinstance(node,dict):
            for key,value in node.items():
                if key=='bufferView':node[key]=view_map[value]
                else:remap_views(value)
        elif isinstance(node,list):
            for value in node:remap_views(value)
    remap_views(doc)
    for i,texture in enumerate(doc['textures']):
        index=image_index(doc,{'index':i})
        if doc['images'][index]['mimeType']=='image/webp':
            texture.pop('source',None);texture.setdefault('extensions',{})['EXT_texture_webp']={'source':index}
        else:
            texture['source']=index;texture.get('extensions',{}).pop('EXT_texture_webp',None)
    for key in ['extensionsUsed','extensionsRequired']:
        doc[key]=list(dict.fromkeys(doc.get(key,[])+['EXT_texture_webp']))
    doc['buffers'][0]['byteLength']=len(result)
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*(-len(js)%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(result))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(result),0x004e4942)+result)
    print(name,path.stat().st_size)

if __name__=='__main__':
    for name,source in [('atelier.glb','connected-atelier.glb'),('garden.glb','rooted-garden.glb'),('tree.glb','tree-small.glb')]:
        restore_glb(name,source)
    manifest=json.loads((ROOT/'src/scene/runtime-assets.json').read_text())
    content=json.loads((ROOT/'public/portfolio-content.json').read_text(encoding='utf-8-sig'))
    for project in content['projects']:
        with Image.open(ROOT/'public'/project['representativeImage']) as image:
            # Mounted pages have a 1395px image region; the detail dialog still
            # uses the untouched original. Avoid decoding unused 4K pixels.
            image.thumbnail((2048,2048),Image.Resampling.LANCZOS)
            image.convert('RGB').save(OUT/(project['id']+'.webp'),'WEBP',quality=96,method=6)
    for source,target in manifest['textures'].items():
        with Image.open(ROOT/'public/assets'/source) as image:
            image.save(ROOT/'public'/target,'WEBP',quality=96,method=6)
