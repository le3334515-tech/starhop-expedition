"""Pack generated 16-pose shield and six 24-frame VFX sheets for the game.

Masters stay intact. Processing only slices, aligns, and nearest-neighbour resizes.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil

root = Path(__file__).resolve().parents[1]
source = root / 'output/imagegen/shield-vfx'
dest = root / 'assets/art/ashen-vfx'
dest.mkdir(parents=True, exist_ok=True)
record = json.loads((source / 'generation.json').read_text(encoding='utf-8'))
manifest = {}
for name, original in record['source_paths'].items():
    master = source / (name + '-master.png')
    if not master.exists():
        shutil.copyfile(original, master)
    image = Image.open(master).convert('RGBA')
    if name == 'shield':
        cols, rows, fw, fh = 4, 4, 128, 112
    else:
        cols, rows, fw, fh = 6, 4, 128, 128
    sheet = Image.new('RGBA', (cols * rows * fw, fh))
    hashes, occupied = [], []
    for j in range(cols * rows):
        x, y = j % cols, j // cols
        rect = (round(x * image.width / cols), round(y * image.height / rows), round((x + 1) * image.width / cols), round((y + 1) * image.height / rows))
        tile = image.crop(rect)
        if name == 'shield':
            tile.putalpha(tile.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
            tile = tile.resize((round(tile.width * .27), round(tile.height * .27)), Image.Resampling.NEAREST)
            frame = Image.new('RGBA', (fw, fh))
            # Same sheet-space pelvis and sole anchors, not per-pose bbox fitting.
            baseline = [283,598,912,1228][y] - rect[1]
            anchor_x = [156,471,785,1098][x] - rect[0]
            frame.paste(tile, (round(64-anchor_x*.27),round(108-baseline*.27)), tile)
        else:
            # Keep the generated translucent emissive edges. Discard only near-zero
            # alpha noise; never colour-key white cores or paint new in-between frames.
            tile.putalpha(tile.getchannel('A').point(lambda a: 0 if a <= 8 else a))
            frame = tile.resize((fw,fh), Image.Resampling.NEAREST)
        occupied.append(sum(a > 16 for a in frame.getchannel('A').getdata()))
        hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
        sheet.paste(frame, (j*fw,0))
    if len(set(hashes)) != cols*rows:
        raise ValueError(f'{name}: duplicate or blank resampled animation frames')
    sheet.save(dest / (name+'.png'), optimize=True)
    manifest[name] = dict(frameWidth=fw,frameHeight=fh,frames=cols*rows,uniqueFrames=len(set(hashes)),nonemptyFrames=sum(n>0 for n in occupied),occupiedPixels=occupied,sha256=hashlib.sha256((dest/(name+'.png')).read_bytes()).hexdigest())
(dest / 'atlas.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({name:{k:v for k,v in meta.items() if k in ['frames','uniqueFrames','nonemptyFrames']} for name,meta in manifest.items()},indent=2))
