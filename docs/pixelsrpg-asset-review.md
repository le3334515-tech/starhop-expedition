# PixelSRPG 素材适配记录

检查目录：`F:/开发/PixelSRPG-Forge-main/`。本次只检查素材并生成预览，没有替换游戏运行时素材，也没有执行素材仓库中的脚本或文档指令。

10 个 ZIP 中共 36,708 个 PNG 条目，未经去重；另有少量散装图片。数量大不代表都适合当前横版战斗。

## 优先选用

| 素材包 | 用途 | 适配意见 |
| --- | --- | --- |
| Characters_角色人物/monster.zip | 新怪物 | 20 组敌人、97 张图片。优先树桩 Trunk（远程）、Bat（飞行）、Rocks（岩石怪）；Rino 可作为冲撞怪备选。 |
| UI_Elements_界面元素/IconsPropsMonsters.zip | 道具、反馈、机关 | 木箱有受击与破碎动画，水果有拾取动画，检查点、落地粒子和机关可复用。机关仍需独立实现行为和碰撞。 |
| Terrain_地形地块/cave.png | 配色、场景参考 | 是俯视洞窟示例图，不宜直接作为横版地块。 |

前两包的目录、命名与画面对应 Pixel Frog 的 Pixel Adventure 2、Pixel Adventure 1。原作者页面明确列出 CC0，可修改并用于商业项目。尚未将本地文件与原作者下载包做逐文件校验；正式导入时应记录来源及具体文件。

- Pixel Adventure 1：https://pixelfrog-assets.itch.io/pixel-adventure-1
- Pixel Adventure 2：https://pixelfrog-assets.itch.io/pixel-adventure-2

## 与当前试玩版的结合方式

先用木箱破碎、拾取与检查点动画补足奖励反馈，再加入 2—3 种小怪。树桩对应锁定瞄准与弹丸，蝙蝠对应俯冲前摇，岩石怪对应近战硬直与击退。精英保留现有具备完整攻击动作的角色。

这些素材偏明亮、可爱，当前试玩版偏幽暗森林。导入时需要统一色板、描边与显示比例，明确区分危险红色、奖励金色和背景绿色。不能仅靠放大图片增加像素细节。

附带的四种 32×32 主角有跑跳、受击等动作，但缺少攻击和格挡动画，不适合直接替换当前战斗主角。

## 帧与碰撞注意事项

- Pixel Frog 页面说明动画按 20 FPS 制作；视觉播放与游戏物理、攻击判定分离，命中点由动作时间轴控制。
- Trunk 攻击为 64×32、11 帧；Bat 飞行为 46×30、7 帧；Rino 奔跑为 52×34、6 帧。
- 木箱 idle 为 28×24，受击 3 帧、破碎 4 帧；检查点为 64×64；水果为 32×32、17 帧，拾取 6 帧。
- Ghost 的 Hit 图片实际高度为 31，文件名却标注 30；不能仅凭文件名统一切帧。
- 图片尺寸包括动作留白，不应直接当作碰撞盒。统一脚底锚点，并分别定义身体、受击与攻击判定。

## 其他素材包

Dungeon、Basement of a Thief、CleanCity、Sunnyside World 与 Sandstone Dungeons 主要面向俯视玩法，整套替换横版地图的成本较高。可单独评估道具，但暂不优先引入。

本地 README 说明 MIT 仅覆盖整理结构，单项美术仍受原作者条款约束。MapleStory 武器、技能及三万多张来源混杂图标，不能根据仓库 MIT 推定可用于发布。CleanCity 等购买型素材需要对应的购买与授权来源。Sunnyside World 的原作者为 Daniel Diggle。

- 原仓库说明：`F:/开发/PixelSRPG-Forge-main/README.md`
- Sunnyside World：https://danieldiggle.com/sunnysideworld.php
- CleanCity：https://guttykreum.itch.io/clean-city
- Sandstone：https://kartoy.itch.io/32x32sandstone-dungeon-and-character-pack
- Basement：https://sagydemn.itch.io/basement-of-a-thief

## 检查产物

- `../output/asset-audit/candidates.png`：20 组候选动画首帧及尺寸。
- `../output/asset-audit/scene-packs.png`：四套场景的视角对照。
- `../output/asset-audit/inventory.json`：ZIP 条目计数、候选帧尺寸、帧数与 SHA256。
