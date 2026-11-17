"""Slice generated artwork for the renderer; keep the generated masters intact.

This only packs/resamples generated assets, not a substitute for image generation.
Hand-audited pose anchors prevent generative sheet spacing from causing foot drift.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/imagegen/ashen-cloister'
DEST = ROOT / 'assets/art/ashen-cloister'
DEST.mkdir(parents=True, exist_ok=True)
generation = json.loads((SOURCE / 'generation.json').read_text(encoding='utf-8'))
images = {}
for name, source in generation['source_paths'].items():
    target = SOURCE / (name + '-master.png')
    if not target.exists():
        shutil.copyfile(source, target)
    images[name] = Image.open(target).convert('RGBA')

def cut(image, rect):
    tile = image.crop(rect)
    # Generated sheets contain faint translucent halos. Alpha thresholding keeps
    # the original coloured pixels while removing the soft matte for crisp sprites.
    tile.putalpha(tile.getchannel('A').point(lambda a: 255 if a >= 140 else 0))
    return tile

meta = {}
def actor(name, anchors, baseline, scale, width=176, height=112, rects=None, airborne=False):
    image = images[name]
    sheet = Image.new('RGBA', (width * 8, height))
    for j in range(8):
        rect = rects[j] if rects else ((j % 4) * 384, (j // 4) * 512, (j % 4 + 1) * 384, (j // 4 + 1) * 512)
        tile = cut(image, rect)
        if name == 'warden' and j == 5:
            # The extended blade crosses the generated cell boundary. Keep its
            # narrow row while excluding the neighbouring pose's cape and sword.
            for py in range(tile.height):
                gy = py + rect[1]
                if gy < 680 or gy > 760:
                    for px in range(max(0,384-rect[0])):
                        tile.putpixel((px,py),(0,0,0,0))
        tile = tile.resize((round(tile.width * scale), round(tile.height * scale)), Image.Resampling.NEAREST)
        anchor_x, anchor_y = anchors[j], baseline[j]
        px = round(width / 2 - (anchor_x - rect[0]) * scale)
        py = round((height / 2 if airborne else height - 4) - (anchor_y - rect[1]) * scale)
        frame = Image.new('RGBA', (width, height)); frame.paste(tile, (px, py), tile)
        sheet.paste(frame, (j * width, 0))
    sheet.save(DEST / (name + '.png'), optimize=True)
    meta[name] = dict(frameWidth=width, frameHeight=height, frames=8, anchorX=width / 2, anchorY=height / 2 if airborne else height - 4)

actor('root', [215,600,995,1370,210,610,990,1380], [472]*4+[984]*4, .17)
actor('rock', [210,593,976,1360,210,570,977,1360], [423]*4+[923]*4, .17)
warden_rects = [(0,0,384,512),(384,0,768,512),(768,0,1152,512),(1152,0,1536,512),(0,512,384,1024),(294,512,785,1024),(780,512,1152,1024),(1152,512,1536,1024)]
actor('warden', [235,620,1005,1385,210,620,1000,1390], [445]*4+[959]*4, .185, rects=warden_rects)
bat_rects = [(0,0,375,520),(375,80,700,550),(700,160,1205,570),(1205,170,1536,600),(0,610,375,1024),(375,610,770,1024),(770,550,1152,1024),(1152,600,1536,1024)]
actor('bat', [170,542,820,1315,175,545,950,1325], [340,350,356,380,850,850,825,840], .19, width=176, height=128, rects=bat_rects, airborne=True)

props = ['crate', 'crate-broken', 'shrine-off', 'shrine-on', 'vial', 'seed', 'chest', 'chest-open']
sizes = [(40,26),(42,27),(33,72),(33,72),(12,28),(30,16),(46,28),(46,40)]
for j, (name, size) in enumerate(zip(props, sizes)):
    y0, y1 = (0,550) if j < 4 else (550,1024)
    tile = cut(images['props'], ((j % 4) * 384,y0,(j % 4 + 1) * 384,y1))
    bbox = tile.getbbox()
    if not bbox: raise ValueError(name)
    tile = tile.crop(bbox).resize(size, Image.Resampling.NEAREST)
    tile.save(DEST / (name + '.png'), optimize=True)

terrain = images['terrain']; midx, midy = terrain.width//2, terrain.height//2
for name, rect in [('stone',(0,0,midx,midy)),('foundation',(midx,0,terrain.width,midy)),('timber',(0,midy,midx,terrain.height)),('iron',(midx,midy,terrain.width,terrain.height))]:
    terrain.crop(rect).resize((128,128), Image.Resampling.NEAREST).convert('RGB').save(DEST / (name + '.png'), optimize=True)
images['background'].resize((1152,768), Image.Resampling.NEAREST).convert('RGB').save(DEST / 'background.png', optimize=True)
(DEST / 'atlas.json').write_text(json.dumps(meta, indent=2)+'\n', encoding='utf-8')
records = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in DEST.glob('*.png')}
(DEST / 'sources.json').write_text(json.dumps(dict(generator=generation['generator'], promptRecord='output/imagegen/ashen-cloister/generation.json', processing='Nearest-neighbour slicing and alpha threshold, manual pose anchors. No existing Dead Cells artwork used.', files=records), indent=2)+'\n', encoding='utf-8')
print(f'Prepared {len(records)} generated game textures at {DEST}')
