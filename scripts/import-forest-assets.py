"""Import only the selected Pixel Frog sprites; leave the source archives untouched."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
source = root.parent / 'PixelSRPG-Forge-main'
dest = root / 'assets/art/forest-creatures'
dest.mkdir(parents=True, exist_ok=True)
records = []
packs = [
    ('Characters_角色人物/monster.zip', 'https://pixelfrog-assets.itch.io/pixel-adventure-2', {
        'trunk-idle': 'monster/Trunk/Idle', 'trunk-run': 'monster/Trunk/Run', 'trunk-attack': 'monster/Trunk/Attack', 'trunk-hit': 'monster/Trunk/Hit', 'trunk-bullet': 'monster/Trunk/Bullet',
        'bat-fly': 'monster/Bat/Flying', 'bat-hit': 'monster/Bat/Hit',
        'rock-idle': 'monster/Rocks/Rock1_Idle', 'rock-run': 'monster/Rocks/Rock1_Run', 'rock-hit': 'monster/Rocks/Rock1_Hit',
    }),
    ('UI_Elements_界面元素/IconsPropsMonsters.zip', 'https://pixelfrog-assets.itch.io/pixel-adventure-1', {
        'crate-idle': 'IconsPropsMonsters/Items/Boxes/Box1/Idle', 'crate-hit': 'IconsPropsMonsters/Items/Boxes/Box1/Hit', 'crate-break': 'IconsPropsMonsters/Items/Boxes/Box1/Break',
        'flag-idle': 'IconsPropsMonsters/Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)',
        'flag-raise': 'IconsPropsMonsters/Items/Checkpoints/Checkpoint/Checkpoint (Flag Out)',
        'flag-off': 'IconsPropsMonsters/Items/Checkpoints/Checkpoint/Checkpoint (No Flag)',
        'apple': 'IconsPropsMonsters/Items/Fruits/Apple', 'collected': 'IconsPropsMonsters/Items/Fruits/Collected',
    }),
]
for archive, url, selections in packs:
    with zipfile.ZipFile(source / archive) as pack:
        for name, prefix in selections.items():
            matches = [prefix + '.png'] if prefix + '.png' in pack.namelist() else [n for n in pack.namelist() if n.startswith(prefix) and n[len(prefix):].lstrip().startswith('(') and n.lower().endswith('.png')]
            if len(matches) != 1:
                raise ValueError((prefix, matches))
            data = pack.read(matches[0])
            (dest / (name + '.png')).write_bytes(data)
            records.append(dict(file=name + '.png', archive=archive, entry=matches[0], source=url, author='Pixel Frog', license='CC0', sha256=hashlib.sha256(data).hexdigest()))
(dest / 'sources.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(records)} sprite strips to {dest}')
