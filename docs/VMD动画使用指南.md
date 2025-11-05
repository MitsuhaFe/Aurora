# VMD 动画使用指南

## 📖 概述

VMD (Vocaloid Motion Data) 是 MikuMikuDance (MMD) 的官方动画格式，拥有海量免费资源。

⚠️ **重要提示**：VMD 格式与 VRM 模型的骨骼结构不同，需要转换后才能使用。本指南将教你如何转换和使用 VMD 动画。

## ✨ 特点

- 🆓 **海量免费资源** - 日本 MMD 社区数十万个免费 VMD 文件
- 🎨 **高质量** - 专业制作的舞蹈、动作、表情动画
- 🕺 **种类丰富** - 涵盖各种风格和类型
- 🔄 **需要转换** - 使用 Blender + Cats 插件转换为 VRMA 格式

## 📥 获取 VMD 动画

### 推荐资源站

#### 1. **BowlRoll** ⭐⭐⭐ 最推荐
- **网址**: https://bowlroll.net/
- **特点**: 日本最大的 MMD 资源分享站
- **资源量**: 数十万个 VMD 文件
- **注意**: 需要注册账号才能下载

**使用步骤**:
```
1. 访问 BowlRoll 网站
2. 注册账号（免费）
3. 搜索 "モーション配布" 或 "モーション"
4. 点击下载链接
5. 输入密码（通常在说明中）
6. 下载 VMD 文件
```

#### 2. **NicoNico 动画**
- **网址**: https://www.nicovideo.jp/
- **特点**: 日本视频分享网站，许多创作者在这里分享 VMD
- **搜索关键词**: 
  - `MMD モーション配布`
  - `モーション 配布`
  - `汎用モーション`

#### 3. **VPVP Wiki**
- **网址**: http://www6.atwiki.jp/vpvpwiki/
- **特点**: MMD 资源汇总站
- **内容**: 包含大量 VMD 下载链接和教程

#### 4. **GitHub**
- **搜索**: "mmd motion" 或 "vmd animation"
- **特点**: 开源社区分享的 VMD 文件

### 搜索关键词

使用以下日文关键词搜索，可以找到更多资源：

| 日文 | 中文 | 说明 |
|------|------|------|
| モーション配布 | 动作分发 | 最常用 |
| 汎用モーション | 通用动作 | 适用于各种模型 |
| 全ての親モーション | 全父骨骼动作 | 兼容性好 |
| ダンスモーション | 舞蹈动作 | 舞蹈类 |
| アクションモーション | 动作类 | 战斗、跑步等 |
| 表情モーション | 表情动作 | 面部表情 |

## 🎬 动画类型

### 1. **舞蹈动画** 🕺
- 流行歌曲舞蹈（如：极乐净土、千本樱）
- 偶像舞蹈
- 现代舞、街舞

**推荐搜索**: `踊り モーション配布`

### 2. **日常动作** 🚶
- 走路、跑步、跳跃
- 坐、站、躺
- 手势、挥手

**推荐搜索**: `汎用 モーション 日常`

### 3. **战斗动作** ⚔️
- 攻击、防御
- 魔法施放
- 跳跃、翻滚

**推荐搜索**: `アクション モーション 戦闘`

### 4. **表情动画** 😊
- 喜怒哀乐
- 眨眼、呼吸
- 说话口型

**推荐搜索**: `表情 モーション リップ`

### 5. **互动动作** 🤝
- 握手、拥抱
- 指向、招手
- 点头、摇头

**推荐搜索**: `汎用 モーション ポーズ`

## 🔧 使用方法

### 完整流程

```
VMD 文件 → Blender 转换 → VRMA 文件 → 桌面伙伴
```

### 详细步骤

#### 步骤 1: 下载 VMD 文件

从上述资源站下载 `.vmd` 文件到本地。

#### 步骤 2: 使用 Blender 转换（必需）

**安装工具**:
1. 下载并安装 Blender: https://www.blender.org/
2. 安装 Cats Blender Plugin:
   - 下载: https://github.com/absolute-quantum/cats-blender-plugin
   - 在 Blender 中: Edit → Preferences → Add-ons → Install
   - 选择下载的 ZIP 文件并启用

**转换步骤**:
```
1. 打开 Blender
2. 导入你的 VRM 模型
   - File → Import → VRM
3. 导入 VMD 动画
   - Cats → Import Model → Import Motion（选择 VMD 文件）
4. 导出为 VRMA
   - File → Export → VRM Animation (.vrma)
5. 保存 VRMA 文件
```

**详细教程视频**:
- YouTube 搜索: "Blender Cats Plugin VMD to VRMA"
- BiliBili 搜索: "Blender MMD 转 VRM 动画"

#### 步骤 3: 导入到桌面伙伴

```
1. 打开桌面伙伴设置
2. 进入"动画设置"
3. 点击"选择动画"按钮
4. 选择转换后的 VRMA 文件
5. 点击"打开"
```

#### 步骤 4: 播放动画

```
1. 在"自定义动画"列表中找到导入的动画
2. 点击 ▶ 播放按钮
3. 动画将自动应用到你的 VRM 模型上
```

#### 步骤 5: 调整播放速度

```
1. 播放动画后，会显示"动画播放速度"滑块
2. 拖动滑块调整速度（0.5x - 2.0x）
3. 实时生效，无需重新加载
```

## 💡 实用技巧

### 1. 选择兼容性好的 VMD

- 优先选择标注为 **"汎用モーション"**（通用动作）的 VMD
- 选择 **"全ての親対応"**（全父骨骼对应）的 VMD
- 避免选择专门为特定模型设计的 VMD

### 2. 处理骨骼不匹配

如果 VMD 动画效果不理想，可能是骨骼名称不匹配：

**解决方案**:
- 尝试其他 VMD 文件
- 使用 VRMA 格式的动画（100% 兼容）
- 使用 Blender + Cats 插件转换 VMD 到 VRMA

### 3. 优化动画效果

- **速度调整**: 舞蹈动画可以调慢一些观看细节
- **循环播放**: 所有 VMD 默认循环播放
- **组合使用**: 可以配合内置的呼吸、眨眼动画

### 4. 批量管理动画

```
1. 创建一个专门的文件夹存放 VMD 文件
2. 按类型分类（舞蹈/日常/战斗等）
3. 文件命名使用中文，方便识别
4. 在桌面伙伴中导入时，会显示文件名
```

## ⚠️ 常见问题

### Q1: VMD 动画加载失败

**可能原因**:
- VMD 文件损坏
- 文件格式不正确
- 骨骼结构不兼容

**解决方案**:
```
1. 重新下载 VMD 文件
2. 确认文件扩展名是 .vmd
3. 尝试其他 VMD 文件
4. 使用 VRMA 格式（推荐）
```

### Q2: 动画效果不正确

**可能原因**:
- VMD 是为特定模型设计的
- 骨骼名称不匹配
- 模型骨骼结构特殊

**解决方案**:
```
1. 选择"汎用モーション"（通用动作）
2. 尝试其他 VMD 文件
3. 使用 VRMA/GLTF 格式的动画
```

### Q3: 动画播放卡顿

**可能原因**:
- VMD 文件过大
- 系统资源不足
- 复杂的动画数据

**解决方案**:
```
1. 降低动画播放速度
2. 关闭其他程序
3. 选择较简单的 VMD 文件
```

### Q4: 找不到想要的动画

**解决方案**:
```
1. 使用日文关键词搜索（见上方关键词表）
2. 访问多个资源站
3. 在 NicoNico 上搜索视频，查看说明
4. 加入 MMD 社区，寻求推荐
```

## 📚 推荐 VMD 动画

### 热门舞蹈动画

| 动画名称 | 说明 | 搜索关键词 |
|---------|------|-----------|
| 极乐净土 | 最流行的 MMD 舞蹈之一 | 極楽浄土 モーション |
| 千本樱 | 经典 Vocaloid 歌曲舞蹈 | 千本桜 モーション |
| Tell Your World | 优美的舞蹈动作 | Tell Your World モーション |
| 恋舞 | 可爱的恋爱主题舞蹈 | 恋ダンス モーション |
| LUVORATORRRRRY! | 动感十足的舞蹈 | ラブラトリー モーション |

### 实用日常动作

- **走路循环**: 自然的走路动画
- **站立idle**: 站立时的微动作
- **坐姿**: 各种坐姿
- **挥手**: 打招呼动作
- **思考**: 思考的姿势

## 🔄 VMD 转换工具

如果需要将 VMD 转换为其他格式，可以使用：

### Blender + Cats Plugin

**步骤**:
```
1. 安装 Blender (https://www.blender.org/)
2. 安装 Cats Blender Plugin
   - 下载：https://github.com/absolute-quantum/cats-blender-plugin
3. 导入 VRM 模型（File → Import → VRM）
4. 导入 VMD 动画（Cats → Import Model → Import Motion）
5. 导出为 VRMA（File → Export → VRM Animation）
```

### Unity + VRM Exporter

**步骤**:
```
1. 安装 Unity
2. 安装 UniVRM 插件
3. 导入 VRM 模型和 VMD 动画
4. 导出为 VRM Animation
```

## 🌟 进阶使用

### 1. 混合多个动画

在 Blender 中可以混合多个 VMD 动画：
- 上半身使用一个 VMD
- 下半身使用另一个 VMD
- 表情单独使用一个 VMD

### 2. 编辑 VMD 动画

使用 MikuMikuDance（MMD）软件：
- 下载：https://sites.google.com/view/vpvp/
- 可以编辑 VMD 的关键帧
- 调整动作速度和幅度
- 添加相机和灯光动画

### 3. 自制 VMD 动画

- 使用 MMD 手工制作关键帧
- 使用动作捕捉设备录制
- 使用 AI 动作捕捉（如 XR Animator）

## 📖 相关资源

### 学习资源
- [MMD 基础教程](https://www.youtube.com/results?search_query=mmd+tutorial)
- [VMD 格式规范](http://blog.goo.ne.jp/torisu_tetosuki/e/bc9f1c4d597341b394bd02b64597499d)
- [Cats Plugin 教程](https://www.youtube.com/watch?v=0gu0kEj2xwA)

### 社区
- [VPVP Wiki](http://www6.atwiki.jp/vpvpwiki/)
- [MMD Reddit](https://www.reddit.com/r/mikumikudance/)
- [NicoNico MMD Tag](https://www.nicovideo.jp/tag/MikuMikuDance)

### 工具
- [MikuMikuDance](https://sites.google.com/view/vpvp/)
- [Blender](https://www.blender.org/)
- [Cats Blender Plugin](https://github.com/absolute-quantum/cats-blender-plugin)
- [PmxEditor](https://kkhk22.seesaa.net/category/14045227-1.html)

## 💡 总结

VMD 格式是获取高质量动画的最佳途径之一：
- ✅ 海量免费资源
- ✅ 直接支持，无需转换
- ✅ 专业制作，质量高
- ✅ 社区活跃，更新快

开始探索 VMD 动画的世界吧！🎉

