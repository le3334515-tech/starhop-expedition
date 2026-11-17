"""Pack original generated hero poses, without changing the saved masters."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil

root=Path(__file__).resolve().parents[1]
source=root/'output/imagegen/ashen-hero'
dest=root/'assets/art/ashen-hero'
dest.mkdir(parents=True,exist_ok=True)
record=json.loads((source/'generation.json').read_text(encoding='utf-8'))
layout={'run':(6,4),'guard':(6,4),'jump':(6,4),'blade':(6,6),'cast':(6,4),'dodge':(4,4),'hurt':(4,4)}
atlas={}
for name,(cols,rows) in layout.items():
    master=source/(name+'-master.png')
    if not master.exists():shutil.copyfile(record['source_paths'][name],master)
    image=Image.open(master).convert('RGBA')
    fw,fh=128,112
    sheet=Image.new('RGBA',(cols*rows*fw,fh));hashes=[];counts=[]
    # Normalise cell scale rather than pose bbox, so crouching is not enlarged.
    scale=76/(image.height/rows)
    for j in range(cols*rows):
        col,row=j%cols,j//cols
        rect=(round(col*image.width/cols),round(row*image.height/rows),round((col+1)*image.width/cols),round((row+1)*image.height/rows))
        tile=image.crop(rect)
        tile.putalpha(tile.getchannel('A').point(lambda a:255 if a>=168 else 0))
        anchor_x=tile.width*.60;anchor_y=tile.height*.90
        if name=='jump' and 4<=j<=19:
            # The generated jump plate moves the whole figure within each cell.
            # Centre the head for airborne poses; actual altitude comes from physics.
            candidates=[]
            bbox=tile.getbbox()
            if bbox:
                for py in range(bbox[1],min(bbox[3],bbox[1]+round(tile.height*.32))):
                    for px in range(tile.width):
                        r,g,b,a=tile.getpixel((px,py))
                        if a and r>155 and g>140 and r>b+10 and g>b+8:candidates.append((px,py))
            if candidates:
                candidates.sort(key=lambda p:p[1]);head=candidates[:max(1,len(candidates)//2)]
                head_x=sum(p[0] for p in head)/len(head);head_y=sum(p[1] for p in head)/len(head)
                anchor_x=head_x-8/scale;anchor_y=head_y+52/scale
        tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.NEAREST)
        frame=Image.new('RGBA',(fw,fh));frame.paste(tile,(round(64-anchor_x*scale),round(108-anchor_y*scale)),tile)
        hashes.append(hashlib.sha256(frame.tobytes()).hexdigest());counts.append(sum(a>0 for a in frame.getchannel('A').getdata()))
        sheet.paste(frame,(j*fw,0))
    if len(set(hashes))!=cols*rows or not all(counts):raise ValueError((name,'duplicate or empty frames'))
    sheet.save(dest/(name+'.png'),optimize=True)
    atlas[name]=dict(frameWidth=fw,frameHeight=fh,frames=cols*rows,uniqueFrames=len(set(hashes)),nonemptyFrames=sum(n>0 for n in counts),anchorX=64,anchorY=108,sha256=hashlib.sha256((dest/(name+'.png')).read_bytes()).hexdigest())
(dest/'atlas.json').write_text(json.dumps(atlas,indent=2)+'\n',encoding='utf-8')
Image.open(dest/'guard.png').crop((65,42,88,65)).resize((64,64),Image.Resampling.NEAREST).save(dest/'portrait.png',optimize=True)
print(json.dumps({k:v['frames'] for k,v in atlas.items()}))
