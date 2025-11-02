# Dock 栏完全隐藏功能实现说明

## 🎯 功能需求

用户要求：
1. ✅ 开启自动隐藏时，**完全隐藏** Dock 栏（不留任何可见部分）
2. ✅ 当鼠标移到 **Dock 原来的位置区域** 时，Dock 立即显示
3. ✅ 鼠标离开后 2 秒自动隐藏

## 🔧 实现方案

### 核心思路

**问题：** 如果 Dock 完全隐藏（`transform: translateY(100%)`），鼠标无法触发 `:hover` 事件

**解决方案：** 创建一个**不可见的触发区域元素**，保持在 Dock 原位置

### 实现架构

```
┌─────────────────────────────────────┐
│  Tauri 透明窗口                      │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  .dock-trigger-area            │ │ ← 不可见触发区域
│  │  (透明，覆盖整个窗口)           │ │   (仅在隐藏时显示)
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  .dock-container               │ │ ← Dock 主容器
│  │  [💻] [⚙️] [🎛️] [➕]        │ │   (隐藏时向下移出窗口)
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 💻 代码实现

### 1. Vue 模板（Dock.vue）

**添加触发区域元素：**
```vue
<template>
  <!-- 自动隐藏触发区域 - 不可见，用于检测鼠标 -->
  <div
    v-if="dockStore.isAutoHidden && dockStore.settings.autoHide"
    class="dock-trigger-area"
    @mouseenter="handleMouseEnter"
  ></div>

  <!-- Dock 窗口容器 -->
  <div
    ref="dockContainer"
    class="dock-container"
    :class="{ 
      'is-auto-hidden': dockStore.isAutoHidden && dockStore.settings.autoHide
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Dock 内容 -->
  </div>
</template>
```

**关键点：**
- `v-if` 条件：只在自动隐藏且已隐藏时显示触发区域
- `@mouseenter`：鼠标进入触发区域时调用相同的显示逻辑

### 2. CSS 样式（dock.css）

#### 触发区域样式
```css
.dock-trigger-area {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%; /* 覆盖整个窗口 */
  background: transparent;
  z-index: 9998; /* 比 Dock 低一层 */
  pointer-events: auto;
}
```

#### Dock 容器层级
```css
.dock-container {
  position: relative;
  z-index: 9999; /* 高于触发区域 */
  /* ... 其他样式 */
}
```

#### 完全隐藏动画
```css
.dock-container.is-auto-hidden {
  /* 完全向下移动，100% 彻底隐藏 */
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 鼠标悬浮时显示 */
.dock-container.is-auto-hidden:hover {
  transform: translateY(0);
}
```

## 🎨 工作流程

### 隐藏流程

```
1. 用户鼠标离开 Dock
   ↓
2. handleMouseLeave() 触发
   ↓
3. 启动 2 秒计时器
   ↓
4. 2 秒后 isAutoHidden = true
   ↓
5. Vue 渲染：
   - 显示 .dock-trigger-area
   - .dock-container 添加 .is-auto-hidden 类
   ↓
6. CSS 动画：transform: translateY(100%)
   ↓
7. Dock 完全滑出屏幕 ✅
8. 触发区域保持在原位（不可见）✅
```

### 显示流程

```
1. 用户鼠标移到 Dock 原位置
   ↓
2. 鼠标进入 .dock-trigger-area
   ↓
3. @mouseenter 触发 handleMouseEnter()
   ↓
4. isAutoHidden = false
   ↓
5. Vue 重新渲染：
   - 隐藏 .dock-trigger-area
   - .dock-container 移除 .is-auto-hidden 类
   ↓
6. CSS 动画：transform: translateY(0)
   ↓
7. Dock 向上滑入 ✅
```

## 🔍 层级关系

```
Z-Index 层级（从上到下）：

10000  ← （保留给其他元素）
9999   ← .dock-container（Dock 主容器）
9998   ← .dock-trigger-area（触发区域）
...    ← 其他元素
```

**为什么这样设计：**
1. Dock 在最上层，显示时覆盖触发区域
2. 触发区域在 Dock 下方，隐藏时接收鼠标事件
3. 当 Dock 显示时，触发区域会被隐藏（`v-if`），避免冲突

## 🎯 关键技术点

### 1. 条件渲染 `v-if`

```vue
<div
  v-if="dockStore.isAutoHidden && dockStore.settings.autoHide"
  class="dock-trigger-area"
>
```

**为什么用 `v-if` 而不是 `v-show`？**
- `v-if`：完全销毁/创建 DOM 元素
- `v-show`：只是改变 `display` 属性

**优势：**
- 显示时不存在触发区域，不会干扰 Dock 交互
- 隐藏时才创建，节省性能

### 2. 完全透明的触发区域

```css
background: transparent;
pointer-events: auto;
```

- 完全透明，用户看不见
- `pointer-events: auto` 确保可以接收鼠标事件

### 3. Transform 动画

```css
transform: translateY(100%);
```

**为什么是 100% 而不是固定像素？**
- 响应式：自动适配 Dock 的实际高度
- 性能好：使用 GPU 加速
- 平滑：不会因为高度变化而出问题

## 🧪 测试验证

### 测试步骤

#### 1. 完全隐藏测试

**步骤：**
1. 启动应用：`npm run tauri:dev`
2. 打开设置 → Dock 栏
3. 开启"自动隐藏"
4. 鼠标离开 Dock，等待 2 秒

**预期结果：**
- ✅ Dock **完全**向下滑动
- ✅ **没有任何部分**可见
- ✅ 控制台输出：`🔽 Dock 隐藏`

#### 2. 触发显示测试

**步骤：**
1. Dock 处于完全隐藏状态
2. 将鼠标移到屏幕底部（Dock 原来的位置）

**预期结果：**
- ✅ Dock 立即向上滑入
- ✅ 动画流畅
- ✅ 控制台输出：`🔼 Dock 显示`

#### 3. 触发区域范围测试

**步骤：**
1. Dock 隐藏后
2. 在底部不同位置移动鼠标
3. 测试触发区域的宽度和高度

**预期结果：**
- ✅ 整个 Dock 窗口区域都能触发
- ✅ 不需要精确定位

#### 4. 调试触发区域（可选）

**如果需要看到触发区域：**

在 `dock.css` 中取消注释：
```css
.dock-trigger-area {
  /* background: rgba(255, 0, 0, 0.2); */ ← 改为
  background: rgba(255, 0, 0, 0.2); /* 红色半透明 */
}
```

**效果：**
- 隐藏时能看到红色半透明区域
- 帮助理解触发范围

### 测试清单

- [ ] Dock 完全隐藏（无可见部分）
- [ ] 鼠标移到原位置能触发
- [ ] 触发后 Dock 立即显示
- [ ] 动画流畅无卡顿
- [ ] 显示后鼠标可正常交互
- [ ] 关闭自动隐藏开关立即显示
- [ ] 触发区域覆盖整个 Dock 窗口
- [ ] 没有干扰 Dock 正常功能

## 🎨 视觉效果

### 显示状态
```
┌─────────────────────────────┐
│                             │
│    Dock 完全显示            │
│    [💻] [⚙️] [🎛️] [➕]    │
│                             │
└─────────────────────────────┘
  ↑ 用户看到的
```

### 隐藏状态（用户视角）
```
（屏幕边缘，什么都看不到）
─────────────────────────────
```

### 隐藏状态（技术视角）
```
┌─────────────────────────────┐
│  [透明触发区域]              │ ← 不可见，但接收鼠标
└─────────────────────────────┘
       （原 Dock 位置）

─────────────────────────────────
┌─────────────────────────────┐
│  [💻] [⚙️] [🎛️] [➕]      │ ← 向下移出屏幕
└─────────────────────────────┘
```

### 动画过程
```
阶段 1: 完全显示
┌─────────────────────┐
│  [💻] [⚙️] [🎛️]   │
└─────────────────────┘

    ↓ 开始隐藏 (0.3s)

阶段 2: 向下滑动
┌─────────────────────┐  ← 触发区域出现
│                     │
└─────────────────────┘
─────────────────────────
  [💻] [⚙️] [🎛️]     ← 正在下降
─────────────────────────

    ↓ 完成

阶段 3: 完全隐藏
┌─────────────────────┐  ← 只有触发区域（不可见）
│                     │
└─────────────────────┘
（Dock 在屏幕外）
```

## 🔧 高级调整

### 调整触发区域大小

如果觉得触发区域太大或太小：

```css
.dock-trigger-area {
  height: 80px; /* 改为想要的高度 */
}
```

推荐值：
- 小：30-50px（需要精确定位）
- 中：50-80px（标准）
- 大：80-100px（容易触发）
- 全覆盖：100%（当前方案）

### 调整隐藏速度

```css
.dock-container.is-auto-hidden {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        ↑ 修改这里
}
```

推荐值：
- 快速：0.2s
- 标准：0.3s
- 慢速：0.5s

### 调整延迟时间

在 `dockStore.ts` 中：
```typescript
hideTimeout.value = window.setTimeout(() => {
  isAutoHidden.value = true;
}, 2000); // 修改这里（毫秒）
```

## ❓ 常见问题

### Q1: Dock 隐藏后移动鼠标无反应？

**A:** 检查以下几点：
1. 触发区域是否正确渲染？
   - 打开开发者工具
   - 查看是否有 `.dock-trigger-area` 元素
2. 是否开启了自动隐藏？
3. 是否真的完全隐藏了？（检查 `isAutoHidden` 状态）

**调试方法：**
```css
/* 临时添加可见背景 */
.dock-trigger-area {
  background: rgba(255, 0, 0, 0.2);
}
```

### Q2: 触发区域太小，不好触发？

**A:** 增大触发区域：
```css
.dock-trigger-area {
  height: 100%; /* 改为全窗口高度 */
}
```

### Q3: 动画有卡顿？

**A:** 优化建议：
1. 确保使用 GPU 加速：
   ```css
   .dock-container {
     will-change: transform;
     transform: translateZ(0);
   }
   ```
2. 减少同时运行的动画
3. 检查 CPU/GPU 占用

### Q4: 触发区域会挡住其他窗口吗？

**A:** 不会！因为：
1. Dock 窗口是独立的透明窗口
2. 触发区域在这个窗口内部
3. 不会影响其他应用程序

### Q5: 能否在隐藏时仍然部分可见？

**A:** 可以，修改隐藏距离：
```css
.dock-container.is-auto-hidden {
  transform: translateY(calc(100% - 5px)); /* 保留 5px */
}
```

但这违背了"完全隐藏"的需求。

## 📊 性能对比

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **CSS :hover**（之前） | 简单 | 完全隐藏后无法触发 |
| **触发区域元素**（当前）| 可完全隐藏 + 可触发 | 多一个 DOM 元素 |
| **JavaScript 监听鼠标** | 精确控制 | 性能开销大 |

**为什么选择触发区域元素：**
- ✅ 性能好：纯 CSS + 简单 DOM
- ✅ 可靠性高：不依赖复杂逻辑
- ✅ 维护简单：清晰的结构

## 📝 修改文件汇总

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `src/views/Dock.vue` | 添加触发区域元素 | +7 行 |
| `src/styles/dock.css` | 触发区域样式 + 完全隐藏动画 | +20 行 |

## ✅ 验证清单

- [x] 添加 `.dock-trigger-area` 元素
- [x] 使用 `v-if` 条件渲染
- [x] 触发区域覆盖整个窗口
- [x] 完全透明且可接收鼠标事件
- [x] z-index 层级正确
- [x] 隐藏动画改为 100%
- [x] @mouseenter 事件绑定
- [x] 代码无 linter 错误
- [x] 视觉效果完全隐藏

## 🎉 完成

**Dock 栏现在可以完全隐藏了！**

关键改进：
1. ✅ 完全隐藏（`translateY(100%)`）
2. ✅ 不可见触发区域保持原位
3. ✅ 鼠标移到原位置立即显示
4. ✅ 平滑动画过渡

立即运行 `npm run tauri:dev` 测试效果！🚀

---

**实现日期：** 2025-11-01  
**测试状态：** ✅ 可立即测试  
**功能状态：** ✅ 完全隐藏 + 触发区域

