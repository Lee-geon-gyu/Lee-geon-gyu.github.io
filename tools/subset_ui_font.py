"""Build the local Atelier Sans subset from the official Pretendard variable font.

Requires fonttools and brotli. Pass the downloaded upstream WOFF2 as --source.
Regenerate after adding UI copy or portfolio content. The original OFL notice
is distributed beside the renamed derivative in public/fonts.
"""
import argparse, json, pathlib
from fontTools.ttLib import TTFont
from fontTools import subset

root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--source',required=True)
args=parser.parse_args()
texts=[json.dumps(json.loads((root/'public/portfolio-content.json').read_text(encoding='utf-8-sig')),ensure_ascii=False)]
texts.extend(p.read_text(encoding='utf-8-sig') for p in (root/'src').rglob('*') if p.suffix in ['.jsx','.js','.css','.json'])
characters=set(''.join(texts))|set(chr(i) for i in range(32,256))
font=TTFont(args.source);available=font.getBestCmap()
codepoints={ord(c) for c in characters if ord(c) in available}
options=subset.Options();options.flavor='woff2';options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
subsetter=subset.Subsetter(options=options);subsetter.populate(unicodes=codepoints);subsetter.subset(font)
for record in font['name'].names:
    if record.nameID not in [0,7,8,9,11,12,13,14] and 'Pretendard' in record.toUnicode():
        value=record.toUnicode().replace('Pretendard','AtelierSans' if record.nameID in [3,6,25] or record.nameID>=256 else 'Atelier Sans')
        record.string=value.encode(record.getEncoding())
font.flavor='woff2'
target=root/'public/fonts/AtelierSans-Variable.woff2';font.save(target)
assert codepoints<=set(TTFont(target).getBestCmap()),'The subset must retain all supported current content characters'
print('UI_FONT_SUBSET',len(codepoints),'characters',target.stat().st_size,'bytes')
