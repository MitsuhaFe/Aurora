# Mixamo 动画使用指南

## 🎯 什么是 Mixamo？

**Adobe Mixamo** 是一个免费的在线角色动画库，提供数千个高质量的 3D 动画。虽然不是专门为 VRM 设计，但导出的 GLTF 动画可以用于桌面伙伴！

**官网**：https://www.mixamo.com/

## ✅ 优势

- 🆓 **完全免费**
- 🎨 **数千个动画**（走路、跑步、跳舞、战斗等）
- 📦 **直接导出 FBX**（可转换为 GLTF）
- 🎛️ **可调节参数**（速度、幅度等）
- 💯 **高质量动作捕捉**

## 📝 使用步骤

### 1. 准备 VRM 模型

Mixamo 不直接支持 VRM，需要先转换：

#### 方法 A：使用在线转换器
```
1. 访问 VRM to FBX 转换器
2. 上传你的 VRM 文件
3. 下载转换后的 FBX 文件
```

#### 方法 B：使用 Blender
```
1. 安装 Blender + VRM 插件
2. 导入 VRM 文件
3. 导出为 FBX（保持骨骼结构）
```

### 2. 上传到 Mixamo

```
1. 访问 https://www.mixamo.com/
2. 登录 Adobe 账号（免费注册）
3. 点击 "Upload Character"
4. 上传你的 FBX 模型
5. Mixamo 会自动识别骨骼（Rigging）
6. 等待处理完成（通常 1-2 分钟）
```

### 3. 选择动画

```
1. 在左侧动画库中浏览
2. 点击动画即可预览
3. 可调节参数：
   - Speed: 动画速度
   - Character Arm-Space: 手臂摆动幅度
   - In Place: 是否原地动作
```

**推荐动画分类**：
- **Idle** - 待机动画（呼吸、左顾右盼）
- **Dancing** - 舞蹈动作
- **Walking** - 走路动画
- **Running** - 跑步动画
- **Jumping** - 跳跃动画
- **Waving** - 挥手打招呼
- **Salute** - 敬礼、致意
- **Sitting** - 坐下动作

### 4. 下载动画

```
1. 点击 "Download"
2. 设置导出参数：
   - Format: FBX (.fbx)
   - Skin: With Skin（如果要保留模型）或 Without Skin（只要动画）
   - Frames per second: 30（推荐）
   - Keyframe Reduction: None（保留所有关键帧）
3. 点击 "Download"
```

### 5. 转换为 GLTF

使用 Blender 转换：

```
步骤：
1. 打开 Blender
2. File → Import → FBX (.fbx)
3. 选择从 Mixamo 下载的 FBX 文件
4. （可选）调整动画：
   - 打开 Timeline 查看动画
   - 在 Dope Sheet 中编辑关键帧
   - 调整动画速度或循环
5. File → Export → glTF 2.0 (.gltf/.glb)
6. 导出设置：
   - Format: GLB（二进制，推荐）
   - Remember Export Settings: 勾选
   - Include > Animation: 勾选 ✅
   - Animation > Shape Keys: 勾选（如果有）
   - Animation > Skinning: 勾选 ✅
   - Animation > Bake All Objects Animations: 勾选
7. 点击 "Export glTF 2.0"
```

### 6. 导入到桌面伙伴

```
1. 打开桌面伙伴设置
2. 进入"动画设置" → "自定义动画"
3. 点击"选择动画"
4. 选择转换后的 GLB 文件
5. 点击播放按钮 ▶ 测试
```

## ⚙️ 高级技巧

### 骨骼名称映射

如果动画不生效，可能是骨骼名称不匹配：

```python
# Blender Python 脚本：重命名骨骼
import bpy

# Mixamo 骨骼名称映射到 VRM 标准名称
bone_mapping = {
    'mixamorig:Hips': 'hips',
    'mixamorig:Spine': 'spine',
    'mixamorig:Spine1': 'chest',
    'mixamorig:Spine2': 'upperChest',
    'mixamorig:Neck': 'neck',
    'mixamorig:Head': 'head',
    'mixamorig:LeftShoulder': 'leftShoulder',
    'mixamorig:LeftArm': 'leftUpperArm',
    'mixamorig:LeftForeArm': 'leftLowerArm',
    'mixamorig:LeftHand': 'leftHand',
    # ... 更多映射
}

armature = bpy.data.objects['Armature']
for old_name, new_name in bone_mapping.items():
    if old_name in armature.pose.bones:
        armature.pose.bones[old_name].name = new_name
```

### 循环动画优化

让动画无缝循环：

```
在 Blender 中：
1. 选择动画轨道
2. Graph Editor → Channel → Extrapolation Mode → Make Cyclic (F-Modifier)
3. 或者手动调整首尾帧，使其一致
```

### 批量下载和转换

```bash
# 使用 FBX2glTF 批量转换
for file in *.fbx; do
    FBX2glTF -b "$file"
    echo "✅ 转换完成: $file"
done
```

## 🎨 推荐动画列表

### 基础动作
- **Breathing Idle** - 自然呼吸待机
- **Standing Idle** - 站立待机
- **Sitting Idle** - 坐姿待机

### 社交互动
- **Waving** - 挥手打招呼
- **Waving Gesture** - 招手示意
- **Salute** - 敬礼
- **Thank You** - 感谢手势
- **Talking** - 交谈手势
- **Clapping** - 鼓掌

### 情绪表达
- **Happy Idle** - 开心状态
- **Sad Idle** - 悲伤状态
- **Excited** - 兴奋跳跃
- **Defeated** - 沮丧低头
- **Laughing** - 大笑

### 动作
- **Walking** - 自然行走
- **Running** - 跑步
- **Jumping** - 跳跃
- **Dancing** - 各种舞蹈（推荐：Hip Hop Dancing）

### 特殊动作
- **Typing** - 打字动作
- **Thinking** - 思考状态
- **Look Around** - 环顾四周
- **Stretching** - 伸懒腰

## ⚠️ 注意事项

### 1. 骨骼兼容性
- Mixamo 使用 `mixamorig:` 前缀
- VRM 使用标准化的骨骼名称
- 可能需要在 Blender 中重命名骨骼

### 2. 动画缩放
- Mixamo 的角色比例可能与你的 VRM 不同
- 在桌面伙伴中调整"缩放"参数

### 3. T-Pose 问题
- 如果模型显示为 T-Pose，说明骨骼不匹配
- 需要在 Blender 中调整骨骼映射

### 4. 动画方向
- Mixamo 动画可能面向不同方向
- 在桌面伙伴中调整"旋转"参数

## 🔧 故障排除

### 问题 1：动画不播放
**解决方案**：
1. 确认 GLB 文件包含动画数据
2. 在 Three.js Editor 中预览文件
3. 检查骨骼名称是否匹配

### 问题 2：动画效果奇怪
**解决方案**：
1. 尝试调整动画速度（0.5x - 2.0x）
2. 检查模型缩放是否正确
3. 在 Blender 中检查动画轨道

### 问题 3：只有部分骨骼动画
**解决方案**：
1. 骨骼名称部分匹配
2. 使用 Blender 脚本重命名骨骼
3. 或选择"Without Skin"只导出动画，然后在 Blender 中重定向

## 🌟 替代方案

如果 Mixamo 不适合，还可以尝试：

1. **ActorCore** - 类似 Mixamo 的平台
2. **Rokoko Studio** - 动作捕捉库
3. **Maximo** - 角色动画市场
4. **TurboSquid** - 付费高质量动画

## 📚 相关资源

- [Mixamo 官网](https://www.mixamo.com/)
- [Mixamo 教程视频](https://www.youtube.com/results?search_query=mixamo+tutorial)
- [Blender VRM 插件](https://github.com/saturday06/VRM-Addon-for-Blender)
- [FBX2glTF 工具](https://github.com/facebookincubator/FBX2glTF)

## 💡 总结

使用 Mixamo 为桌面伙伴添加动画的完整流程：

```
VRM 模型 
  → 转换为 FBX 
    → 上传到 Mixamo 
      → 选择动画 
        → 下载 FBX 
          → Blender 转换为 GLB 
            → 导入到桌面伙伴 ✅
```

虽然步骤较多，但一次设置后可以重复使用，而且 Mixamo 的动画质量非常高！

---

最后更新：2025年

