"""Pack original generated campaign art; preserve masters and actual alpha."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json, shutil, hashlib
root=Path(__file__).resolve().parents[1]
source=root/'output/imagegen/campaign'; dest=root/'assets/art/campaign'
dest.mkdir(parents=True,exist_ok=True)
record=json.loads((source/'generation.json').read_text(encoding='utf8'))
manifest={}
for name,data in record.items():
    master=source/(name+'-master.png')
    if not master.exists(): shutil.copyfile(data['source'],master)
    image=Image.open(master).convert('RGBA')
    if name.startswith('bg-'):
        folder=dest/('theme-'+name.split('-')[1]);folder.mkdir(exist_ok=True)
        # Native crisp pixel clusters remain intact; no smoothing.
        image.resize((1152,768),Image.Resampling.NEAREST).convert('RGB').save(folder/'background.png',optimize=True)
        manifest[name]={'sourceSize':image.size,'runtime':'background.png'}
    elif name.startswith('tiles-'):
        folder=dest/('theme-'+name.split('-')[1]);folder.mkdir(exist_ok=True)
        for n,tile in enumerate(['stone','foundation','timber','iron']):
            x,y=n%2,n//2
            image.crop((round(x*image.width/2),round(y*image.height/2),round((x+1)*image.width/2),round((y+1)*image.height/2))).resize((128,128),Image.Resampling.NEAREST).convert('RGB').save(folder/(tile+'.png'),optimize=True)
        manifest[name]={'sourceSize':image.size,'runtime':'four materials'}
    else:
        boss=name.startswith('boss-');fw,fh=(256,192) if boss else (176,128)
        alpha=image.getchannel('A')
        if alpha.getextrema()[0]>16: raise ValueError(f'{name} lacks a transparent background: {alpha.getextrema()}')
        sheet=Image.new('RGBA',(fw*16,fh));hashes=[];occupied=[]
        for n in range(16):
            x,y=n%4,n//4;box=(round(x*image.width/4),round(y*image.height/4),round((x+1)*image.width/4),round((y+1)*image.height/4))
            tile=image.crop(box)
            tile.putalpha(tile.getchannel('A').point(lambda a:255 if a>=160 else 0))
            # Fixed sheet-space anchors: no per-frame bbox rescaling or fake frames.
            scale=min((fw-10)/tile.width,(fh-12)/(tile.height*.92))
            resized=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',(fw,fh));frame.alpha_composite(resized,(round(fw/2-tile.width*.5*scale),round(fh-8-tile.height*.9*scale)))
            hashes.append(hashlib.sha256(frame.tobytes()).hexdigest());occupied.append(sum(a>0 for a in frame.getchannel('A').getdata()))
            sheet.paste(frame,(n*fw,0))
        if len(set(hashes))!=16 or not min(occupied)>100: raise ValueError(f'{name} blank or duplicate frames')
        sheet.save(dest/(name+'.png'),optimize=True)
        manifest[name]={'frames':16,'frameWidth':fw,'frameHeight':fh,'sourceSize':image.size,'uniqueFrames':len(set(hashes)),'occupiedPixels':occupied,'sha256':hashlib.sha256((dest/(name+'.png')).read_bytes()).hexdigest()}
(dest/'atlas.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
# Review contact sheets are outside the runtime asset folder.
bosses=[n for n in manifest if n.startswith('boss-')]
if bosses:
    preview=Image.new('RGB',(1000,240*((len(bosses)+4)//5)), '#0a111d');draw=ImageDraw.Draw(preview)
    for j,n in enumerate(bosses):
        image=Image.open(dest/(n+'.png'));pose=image.crop((0,0,256,192));pose.thumbnail((195,190),Image.Resampling.NEAREST)
        x=(j%5)*200;y=(j//5)*240;preview.paste(pose,(x+(200-pose.width)//2,y+15),pose);draw.text((x+12,y+215),n,fill='#dcc39b')
    preview.save(source/'boss-contact.png')
print(json.dumps({n:{k:v for k,v in d.items() if k!='occupiedPixels'} for n,d in manifest.items()},indent=2))
