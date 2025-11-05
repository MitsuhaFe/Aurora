# VRMA 格式说明

## 🎯 什么是 VRMA？

**VRMA** (VRM Animation) 是 VRM 1.0 规范定义的官方动画格式，专门为 VRM 模型设计。

### 特点
- ✅ **官方标准格式** - VRM Consortium 制定
- ✅ **完美兼容** - 为 VRM 模型量身定制
- ✅ **专用扩展名** - `.vrma` 文件
- ✅ **完整特性支持** - 表情、视线、物理模拟等
- ✅ **跨平台** - 所有支持 VRM 的应用都可使用

### 与其他格式的对比

| 格式 | 兼容性 | 表情支持 | 推荐度 | 说明 |
|------|--------|----------|--------|------|
| **VRMA** | ⭐⭐⭐⭐⭐ | ✅ 完整 | ⭐⭐⭐ | VRM 官方格式，最佳选择 |
| GLTF + VRM Animation | ⭐⭐⭐⭐ | ✅ 完整 | ⭐⭐ | 需要 VRM 扩展 |
| 标准 GLTF | ⭐⭐ | ❌ 无 | ⭐ | 需要骨骼匹配 |

## 📦 如何获取 VRMA 文件

### 方法一：从 VRoid Hub 下载

VRoid Hub 是最大的 VRM 资源平台，部分模型提供 VRMA 动画。

**步骤**：
```
1. 访问 https://hub.vroid.com/
2. 搜索你想要的角色或动画
3. 查看模型详情页面
4. 如果提供动画，会有"Animation"标签
5. 下载 VRMA 文件
```

**注意**：
- 不是所有模型都提供动画
- 需要遵守创作者的使用条款
- 部分动画可能需要购买

### 方法二：使用 Blender 导出

使用 Blender + VRM Add-on 可以将任何动画导出为 VRMA 格式。

#### 安装所需工具
```
1. Blender 3.0+ (https://www.blender.org/)
2. VRM Add-on for Blender (https://github.com/saturday06/VRM-Addon-for-Blender)
```

#### 导出步骤
```
步骤：
1. 在 Blender 中打开或创建你的动画
2. 确保模型是 VRM 格式（或已正确设置骨骼）
3. File → Export → VRM Animation (.vrma)
4. 配置导出设置：
   - Animation: 选择要导出的动画
   - Frame Range: 设置帧范围
   - Include Expression: 勾选（导出表情动画）
   - Include Look At: 勾选（导出视线动画）
5. 点击 "Export VRM Animation"
```

**高级设置**：
- **Bake Animation**: 烘焙动画曲线
- **Optimize Keyframes**: 优化关键帧（减小文件大小）
- **Include Constraints**: 包含约束（如 IK）

### 方法三：转换其他格式

可以将 FBX、BVH、VMD 等格式转换为 VRMA。

#### 从 Mixamo FBX 转换
```
1. 从 Mixamo 下载 FBX 动画
2. 在 Blender 中导入 FBX
3. 导入你的 VRM 模型
4. 使用 Blender 的 "Retarget" 功能将动画应用到 VRM
5. 导出为 VRMA
```

#### 从 MMD VMD 转换
```
1. 使用 Cats Blender Plugin
2. Import Model → 导入 VRM 或 PMX 模型
3. Import Motion → 导入 VMD 动画
4. 应用动画
5. File → Export → VRM Animation (.vrma)
```

## 🔧 VRMA 文件结构

VRMA 本质上是一个 GLTF 文件，包含特殊的 VRM 扩展。

### 文件内容
```json
{
  "asset": {
    "version": "2.0",
    "generator": "VRM Exporter"
  },
  "extensions": {
    "VRMC_vrm_animation": {
      "specVersion": "1.0",
      "humanoid": {
        "humanBones": {
          "hips": { "node": 0 },
          "spine": { "node": 1 },
          // ... 更多骨骼
        }
      },
      "expressions": {
        "happy": { "weight": 0.8 },
        "blink": { "weight": 1.0 }
        // ... 更多表情
      }
    }
  },
  "animations": [
    // 标准 GLTF 动画数据
  ]
}
```

### 主要组成部分

1. **Humanoid Bones** - VRM 标准骨骼映射
   - 定义了动画如何应用到模型骨骼
   - 兼容不同的 VRM 模型

2. **Expressions** - 表情动画
   - 使用 VRM 表情系统
   - 支持混合多个表情

3. **Look At** - 视线控制
   - 眼睛、头部跟随目标
   - 自然的视线动画

4. **Animation Tracks** - 动画轨道
   - 位置、旋转、缩放
   - 表情权重变化
   - 物理参数

## 📊 VRMA vs GLTF 对比

### VRMA 的优势
```
✅ 骨骼自动映射 - 不需要手动匹配骨骼名称
✅ 表情支持 - 原生支持 VRM 表情系统
✅ 视线动画 - 支持眼睛和头部跟随
✅ 物理模拟 - 可包含头发、衣物物理数据
✅ 跨模型兼容 - 一个动画可用于多个 VRM 模型
```

### 标准 GLTF 的局限
```
❌ 骨骼名称必须完全匹配
❌ 不支持 VRM 表情
❌ 需要手动调整才能用于不同模型
❌ 可能丢失 VRM 特有的功能
```

## 🎬 使用 VRMA 的最佳实践

### 1. 动画制作建议
- **帧率**: 使用 30fps（VRM 标准）
- **时长**: 循环动画建议 2-4 秒
- **表情**: 同步表情和骨骼动画
- **视线**: 添加自然的眼神动画

### 2. 文件优化
```bash
# 使用 gltf-pipeline 优化 VRMA
npm install -g gltf-pipeline
gltf-pipeline -i input.vrma -o output.vrma --draco.compressionLevel=10
```

### 3. 兼容性测试
导出后建议测试：
- Three.js Editor: https://threejs.org/editor/
- VRM Viewer: https://vrm-viewer.yukimochi.dev/
- 你的应用（桌面伙伴）

### 4. 版权和分享
- 遵守原始模型的使用条款
- 标注动画创作者
- 使用 Creative Commons 许可证

## 🔨 常见问题

### Q1: VRMA 和 GLTF 有什么区别？
**A**: VRMA 是 GLTF 的扩展，专门为 VRM 设计。它包含 VRM 特有的数据，如表情、视线等。

### Q2: 可以在其他软件中使用 VRMA 吗？
**A**: 是的，任何支持 VRM 和 GLTF 的软件都可以使用。例如：
- Unity（需要 VRM 插件）
- Unreal Engine（需要插件）
- Three.js（使用 @pixiv/three-vrm）
- VRChat（部分支持）

### Q3: VRMA 文件很大怎么办？
**A**: 可以优化：
1. 降低关键帧数量
2. 使用 Draco 压缩
3. 移除不必要的表情数据
4. 降低动画精度

### Q4: 如何检查 VRMA 文件是否有效？
**A**: 
```bash
# 使用 gltf-validator
npm install -g gltf-validator
gltf-validator input.vrma
```

### Q5: 一个 VRMA 可以用于不同的 VRM 模型吗？
**A**: 可以！这是 VRMA 的一大优势。只要模型符合 VRM 标准，动画就能正确应用。

## 📚 相关资源

### 官方文档
- [VRM 规范](https://vrm.dev/)
- [VRMC_vrm_animation 扩展](https://github.com/vrm-c/vrm-specification/tree/master/specification/VRMC_vrm_animation-1.0)
- [Three.js VRM](https://github.com/pixiv/three-vrm)

### 工具
- [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender)
- [UniVRM](https://github.com/vrm-c/UniVRM) (Unity)
- [VRM Viewer](https://vrm-viewer.yukimochi.dev/)

### 社区
- [VRM Consortium](https://vrm-consortium.org/)
- [VRoid Hub](https://hub.vroid.com/)
- [Discord - VRM](https://discord.gg/vrm)

## 🎓 学习资源

### 教程
1. **Blender VRM 动画导出教程**
   - YouTube: 搜索 "Blender VRM Animation Export"
   
2. **从零开始制作 VRMA**
   - 学习 Blender 基础
   - 了解骨骼动画
   - 掌握 VRM 规范

3. **Mixamo 到 VRMA 完整流程**
   - 参考 `Mixamo动画使用指南.md`
   - 重点是骨骼重定向

## 💡 总结

**VRMA 是使用桌面伙伴动画的最佳选择**：
- ✅ 官方标准，未来兼容性最好
- ✅ 完美支持 VRM 特性
- ✅ 跨模型通用
- ✅ 社区支持完善

**推荐工作流程**：
```
创意 → Blender 制作动画 → 导出 VRMA → 导入桌面伙伴 ✅
```

**快速开始**：
1. 从 VRoid Hub 下载示例 VRMA
2. 或从 Mixamo 下载 FBX，用 Blender 转换
3. 导入到桌面伙伴测试

---

最后更新：2025年
文件格式版本：VRMA 1.0

