# Dock 栏自动隐藏功能实现说明

## 🎯 功能概述

Dock 栏自动隐藏功能已完整实现，支持以下特性：
- ✅ 鼠标离开 2 秒后自动隐藏
- ✅ 保留 5px 边缘作为触发区域
- ✅ 鼠标移入立即显示
- ✅ 平滑的动画过渡
- ✅ 可通过设置开关控制

## 🔧 实现原理

### 1. 状态管理（dockStore.ts）

#### 新增状态
```typescript
const isAutoHidden = ref(false); // 是否处于自动隐藏状态
```

#### 核心逻辑

**鼠标进入时：**
```typescript
function handleMouseEnter() {
  isHovered.value = true;
  
  // 清除隐藏计时器
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value);
    hideTimeout.value = null;
  }
  
  // 如果启用了自动隐藏且当前隐藏，则显示
  if (settings.value.autoHide && isAutoHidden.value) {
    isAutoHidden.value = false;
    console.log('🔼 Dock 显示');
  }
}
```

**鼠标离开时：**
```typescript
function handleMouseLeave() {
  isHovered.value = false;
  
  // 如果启用了自动隐藏，启动隐藏计时器
  if (settings.value.autoHide && !isAutoHidden.value) {
    hideTimeout.value = window.setTimeout(() => {
      isAutoHidden.value = true;
      console.log('🔽 Dock 隐藏');
    }, 2000); // 2秒后隐藏
  }
}
```

**重置状态：**
```typescript
function resetAutoHide() {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value);
    hideTimeout.value = null;
  }
  isAutoHidden.value = false;
}
```

### 2. 视图层（Dock.vue）

#### 动态 CSS 类
```vue
<div
  class="dock-container"
  :class="{ 
    'is-pinned': dockStore.settings.pinPosition,
    'is-auto-hidden': dockStore.isAutoHidden && dockStore.settings.autoHide
  }"
>
```

#### 开关监听
```typescript
watch(
  () => dockStore.settings.autoHide,
  (newValue) => {
    if (!newValue) {
      // 关闭自动隐藏时，重置状态
      dockStore.resetAutoHide();
      console.log('✅ 自动隐藏已关闭');
    } else {
      console.log('✅ 自动隐藏已开启');
    }
  }
);
```

### 3. 样式层（dock.css）

#### 隐藏动画
```css
.dock-container.is-auto-hidden {
  /* 向下移动，只保留顶部 5px 可见作为触发区域 */
  transform: translateY(calc(100% - 5px));
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 自动隐藏状态下鼠标悬浮时立即恢复 */
.dock-container.is-auto-hidden:hover {
  transform: translateY(0);
}
```

## 🎨 工作流程

### 完整流程图

```
用户鼠标在 Dock 上
        ↓
handleMouseEnter() 触发
        ↓
清除隐藏计时器
        ↓
isAutoHidden = false
        ↓
CSS: transform: translateY(0)
        ↓
Dock 完全显示 ✅
        ↓
用户鼠标离开 Dock
        ↓
handleMouseLeave() 触发
        ↓
启动 2 秒计时器
        ↓
2 秒后...
        ↓
isAutoHidden = true
        ↓
CSS: transform: translateY(calc(100% - 5px))
        ↓
Dock 滑出屏幕，保留 5px 边缘 ✅
        ↓
用户鼠标移到边缘
        ↓
CSS hover 触发
        ↓
Dock 立即滑入 ✅
```

## 🔄 与其他功能的交互

### 1. 固定位置 + 自动隐藏

**行为：** 两个功能独立工作
- 固定位置：禁用拖动
- 自动隐藏：控制显示/隐藏

### 2. 始终置顶 + 自动隐藏

**行为：** 完美配合
- 始终置顶：确保 Dock 在最上层
- 自动隐藏：需要时隐藏，不占用空间

### 3. 开关状态变化

**场景 1：开启自动隐藏**
```
用户开启开关
  ↓
settings.autoHide = true
  ↓
2 秒后开始生效
  ↓
Dock 自动隐藏
```

**场景 2：关闭自动隐藏**
```
用户关闭开关
  ↓
settings.autoHide = false
  ↓
watch 监听触发
  ↓
resetAutoHide() 调用
  ↓
清除计时器
  ↓
isAutoHidden = false
  ↓
Dock 立即显示
```

## 🧪 测试验证

### 测试步骤

#### 1. 基础功能测试

**步骤：**
1. 启动应用：`npm run tauri:dev`
2. 打开设置 → Dock 栏
3. 开启"自动隐藏"开关
4. 将鼠标移到 Dock 上
5. 鼠标离开 Dock

**预期结果：**
- ✅ 2 秒后 Dock 向下滑动
- ✅ 顶部保留 5px 边缘可见
- ✅ 动画平滑流畅
- ✅ 控制台输出：`🔽 Dock 隐藏`

#### 2. 重新显示测试

**步骤：**
1. Dock 处于隐藏状态
2. 将鼠标移到屏幕底部（Dock 的位置）
3. 鼠标触碰到 5px 边缘

**预期结果：**
- ✅ Dock 立即向上滑入
- ✅ 完全显示
- ✅ 控制台输出：`🔼 Dock 显示`

#### 3. 计时器取消测试

**步骤：**
1. 鼠标离开 Dock
2. 在 2 秒内再次将鼠标移回 Dock
3. 重复几次

**预期结果：**
- ✅ Dock 不会隐藏
- ✅ 计时器被正确取消
- ✅ 没有重复的隐藏/显示闪烁

#### 4. 开关切换测试

**步骤：**
1. 开启自动隐藏
2. 等待 Dock 隐藏
3. 关闭自动隐藏开关

**预期结果：**
- ✅ Dock 立即完全显示
- ✅ 控制台输出：`✅ 自动隐藏已关闭`
- ✅ 鼠标离开后不再自动隐藏

#### 5. 边缘触发测试

**步骤：**
1. 开启自动隐藏，等待 Dock 隐藏
2. 快速将鼠标移到底部边缘
3. 观察触发灵敏度

**预期结果：**
- ✅ 触碰到 5px 边缘立即显示
- ✅ 不需要精确定位
- ✅ 响应迅速

### 测试清单

- [ ] 自动隐藏开启后生效
- [ ] 2 秒延迟准确
- [ ] 边缘触发区域工作正常
- [ ] 动画流畅无卡顿
- [ ] 关闭开关立即恢复
- [ ] 与固定位置功能不冲突
- [ ] 与始终置顶功能不冲突
- [ ] 重启应用后设置保持
- [ ] 控制台日志正确输出

## 📊 性能优化

### 1. 使用 CSS Transform

**为什么不用 `top` 或 `margin`？**

❌ **不推荐：**
```css
.is-auto-hidden {
  top: calc(100vh - 5px); /* 触发重排 */
}
```

✅ **推荐：**
```css
.is-auto-hidden {
  transform: translateY(calc(100% - 5px)); /* GPU 加速 */
}
```

**优势：**
- GPU 加速渲染
- 不触发页面重排
- 动画更流畅
- 性能更好

### 2. 防抖处理

**2 秒延迟的作用：**
- 避免误触发
- 防止频繁显示/隐藏
- 用户体验更好

### 3. 计时器管理

**清理策略：**
```typescript
// 鼠标进入时清除计时器
if (hideTimeout.value) {
  clearTimeout(hideTimeout.value);
  hideTimeout.value = null;
}
```

**防止内存泄漏：**
- 及时清除未使用的计时器
- 组件卸载时清理资源

## 🎨 视觉效果

### 正常状态
```
┌─────────────────────────────┐
│                             │
│    Dock 完全显示            │
│    [💻] [⚙️] [🎛️] [➕]    │
│                             │
└─────────────────────────────┘
```

### 自动隐藏状态
```
                               ← 用户看到的屏幕边缘
─────────────────────────────
█████████████████████████████  ← 5px 触发区域
（Dock 主体隐藏在屏幕外）
```

### 动画过程
```
状态 1: 完全显示
┌─────────────────────┐
│   [💻] [⚙️] [🎛️]  │
└─────────────────────┘

        ↓ 0.15s

状态 2: 滑动中
┌─────────────────────┐
│   [💻] [⚙️] [🎛️]  │ ← 正在向下移动
─────────────────────────

        ↓ 0.15s

状态 3: 隐藏完成
─────────────────────────
█████████████████████████  ← 5px 可见
```

## 🔍 调试技巧

### 1. 控制台日志

**正常工作时应该看到：**
```
✅ 自动隐藏已开启
[2秒后...]
🔽 Dock 隐藏
[鼠标移入...]
🔼 Dock 显示
```

### 2. 开发者工具

**检查 CSS 类：**
```html
<!-- 隐藏时 -->
<div class="dock-container is-auto-hidden">

<!-- 显示时 -->
<div class="dock-container">
```

**检查 Transform：**
```css
/* 隐藏 */
transform: translateY(calc(100% - 5px));

/* 显示 */
transform: translateY(0px);
```

### 3. 测试边缘触发

**方法 1：使用鼠标**
- 慢慢将鼠标移到底部
- 观察 Dock 何时弹出

**方法 2：检查触发区域**
- 在浏览器开发者工具中检查元素
- 查看 `.is-auto-hidden:hover` 是否生效

## ❓ 常见问题

### Q1: Dock 隐藏后无法再显示？

**A:** 检查以下几点：
1. 是否保留了 5px 边缘？
   ```css
   transform: translateY(calc(100% - 5px)); /* 不是 100% */
   ```
2. 是否有 `:hover` 样式？
   ```css
   .is-auto-hidden:hover {
     transform: translateY(0);
   }
   ```
3. 鼠标是否真的移到了边缘？

### Q2: 自动隐藏反应太快/太慢？

**A:** 调整延迟时间：
```typescript
hideTimeout.value = window.setTimeout(() => {
  isAutoHidden.value = true;
}, 2000); // 修改这里的时间（毫秒）
```

推荐值：
- 快速：1000ms (1秒)
- 标准：2000ms (2秒)
- 慢速：3000ms (3秒)

### Q3: 边缘触发区域太小？

**A:** 增加可见边缘：
```css
.dock-container.is-auto-hidden {
  transform: translateY(calc(100% - 10px)); /* 改为 10px */
}
```

### Q4: 动画不够流畅？

**A:** 调整过渡函数：
```css
transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    ↑ 时间    ↑ 缓动函数
```

可选缓动函数：
- `ease`: 默认
- `linear`: 线性
- `ease-in-out`: 缓入缓出
- `cubic-bezier(0.4, 0, 0.2, 1)`: 自定义（推荐）

### Q5: 与固定位置冲突？

**A:** 不冲突！两个功能完全独立：
- 固定位置：控制是否可拖动
- 自动隐藏：控制是否自动隐藏

可以同时启用两者。

## 📝 修改文件汇总

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `src/stores/dockStore.ts` | 添加 isAutoHidden 状态 + 修改自动隐藏逻辑 + resetAutoHide | ~35 行 |
| `src/views/Dock.vue` | 添加 is-auto-hidden 类 + watch 监听 | ~20 行 |
| `src/styles/dock.css` | 修改自动隐藏动画样式 | ~10 行 |

## ✅ 验证清单

- [x] 添加 isAutoHidden 状态
- [x] 修改 handleMouseEnter 逻辑
- [x] 修改 handleMouseLeave 逻辑
- [x] 添加 resetAutoHide 方法
- [x] 在 Dock.vue 中应用 CSS 类
- [x] 添加 watch 监听开关变化
- [x] 更新 CSS 动画样式
- [x] 保留 5px 触发边缘
- [x] 代码无 linter 错误
- [x] 添加控制台日志

## 🎉 完成状态

**Dock 栏自动隐藏功能已完整实现！**

核心特性：
1. ✅ 2 秒延迟自动隐藏
2. ✅ 保留 5px 边缘触发
3. ✅ 平滑动画过渡
4. ✅ 鼠标移入立即显示
5. ✅ 可通过设置控制
6. ✅ 与其他功能不冲突

立即运行 `npm run tauri:dev` 测试吧！🚀

---

**实现日期：** 2025-11-01  
**测试状态：** ✅ 可立即测试  
**相关功能：** Dock 栏自动隐藏

