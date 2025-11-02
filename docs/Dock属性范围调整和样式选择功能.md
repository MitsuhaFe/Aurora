# Dock 属性范围调整和样式选择功能

## 更新日期
2025-11-01

## 修改概述

根据用户需求，对 Dock 栏的属性范围进行了调整，并新增了两个样式选择开关（阴影效果和毛玻璃效果）。

## 1. 属性范围调整

### 调整前后对比

| 属性 | 调整前 | 调整后 |
|------|--------|--------|
| **长度（宽度）** | 200-800px | 120-1200px |
| **高度** | 60-120px | 40-200px |
| **透明度** | 0.5-1.0 (50-100%) | 0-1.0 (0-100%) |
| **圆角值** | 0-30px | 0-80px |
| **图标大小** | 32-72px | 32-160px |

### 修改说明

1. **长度范围扩大**：支持更小的迷你 Dock（120px）和更大的超宽 Dock（1200px）
2. **高度范围扩大**：支持更扁平的 Dock（40px）和更高的 Dock（200px）
3. **透明度范围扩大**：支持完全透明（0%），适合特殊场景
4. **圆角值范围扩大**：支持更大的圆角（80px），可以实现接近圆形的 Dock
5. **图标大小范围扩大**：支持更大的图标（160px），适合高分辨率屏幕

## 2. 新增样式选择功能

### 2.1 阴影效果开关

**功能描述：** 控制 Dock 栏是否显示阴影

**实现细节：**
- 新增 `hasShadow` 布尔属性（默认值：`true`）
- 开启时：`box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)`
- 关闭时：`box-shadow: none`

**使用场景：**
- 开启阴影：增强 Dock 的立体感和层次感
- 关闭阴影：实现扁平化设计风格

### 2.2 毛玻璃效果开关

**功能描述：** 控制 Dock 栏是否应用背景模糊（毛玻璃）效果

**实现细节：**
- 新增 `hasGlassEffect` 布尔属性（默认值：`true`）
- 开启时：`backdrop-filter: blur(20px)` 和 `-webkit-backdrop-filter: blur(20px)`
- 关闭时：`backdrop-filter: none` 和 `-webkit-backdrop-filter: none`

**使用场景：**
- 开启毛玻璃：实现半透明模糊背景，具有现代化的视觉效果
- 关闭毛玻璃：纯色背景，降低性能消耗

## 3. 技术实现

### 3.1 接口修改

**文件：** `src/stores/dockStore.ts`

在 `DockSettings` 接口中新增两个属性：

```typescript
export interface DockSettings {
  // ... 其他属性 ...
  
  // 样式效果
  hasShadow: boolean;
  hasGlassEffect: boolean;
  
  // ... 其他属性 ...
}
```

默认值设置：

```typescript
const settings = ref<DockSettings>({
  // ... 其他设置 ...
  hasShadow: true,
  hasGlassEffect: true,
  // ... 其他设置 ...
});
```

### 3.2 设置页面修改

**文件：** `src/views/Settings/Index.vue`

#### 属性范围调整

```vue
<!-- 长度 -->
<input type="range" min="120" max="1200" step="10" v-model.number="dockStore.settings.width" />

<!-- 高度 -->
<input type="range" min="40" max="200" step="5" v-model.number="dockStore.settings.height" />

<!-- 透明度 -->
<input type="range" min="0" max="1" step="0.01" v-model.number="dockStore.settings.opacity" />

<!-- 圆角值 -->
<input type="range" min="0" max="80" step="2" v-model.number="dockStore.settings.borderRadius" />

<!-- 图标大小 -->
<input type="range" min="32" max="160" step="4" v-model.number="dockStore.settings.iconSize" />
```

#### 新增样式效果开关

```vue
<!-- 样式效果 -->
<div class="setting-section-title">样式效果</div>

<!-- 阴影效果 -->
<div class="setting-item">
  <div class="setting-label">
    <h3>阴影效果</h3>
    <p>为 Dock 栏添加阴影</p>
  </div>
  <div class="setting-control">
    <label class="switch">
      <input type="checkbox" v-model="dockStore.settings.hasShadow" />
      <span class="switch-slider"></span>
    </label>
    <span class="value-display">{{ dockStore.settings.hasShadow ? '开启' : '关闭' }}</span>
  </div>
</div>

<!-- 毛玻璃效果 -->
<div class="setting-item">
  <div class="setting-label">
    <h3>毛玻璃效果</h3>
    <p>为 Dock 栏添加毛玻璃背景模糊</p>
  </div>
  <div class="setting-control">
    <label class="switch">
      <input type="checkbox" v-model="dockStore.settings.hasGlassEffect" />
      <span class="switch-slider"></span>
    </label>
    <span class="value-display">{{ dockStore.settings.hasGlassEffect ? '开启' : '关闭' }}</span>
  </div>
</div>
```

### 3.3 Dock 样式应用

**文件：** `src/views/Dock.vue`

使用计算属性动态生成样式，并通过 CSS 变量支持自动隐藏状态：

```typescript
const dockContainerStyle = computed(() => {
  const style: Record<string, string> = {
    width: `${dockStore.settings.width}px`,
    height: `${dockStore.settings.height}px`,
    backgroundColor: dockStore.settings.backgroundColor,
    opacity: String(dockStore.settings.opacity),
    borderRadius: `${dockStore.settings.borderRadius}px`,
    
    // CSS 变量 - 用于自动隐藏 hover 状态恢复
    '--dock-opacity': String(dockStore.settings.opacity),
  };

  // 阴影效果
  if (dockStore.settings.hasShadow) {
    style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    style['--dock-shadow'] = '0 8px 32px rgba(0, 0, 0, 0.3)';
  } else {
    style.boxShadow = 'none';
    style['--dock-shadow'] = 'none';
  }

  // 毛玻璃效果
  if (dockStore.settings.hasGlassEffect) {
    style.backdropFilter = 'blur(20px)';
    style.webkitBackdropFilter = 'blur(20px)';
    style['--dock-backdrop'] = 'blur(20px)';
  } else {
    style.backdropFilter = 'none';
    style.webkitBackdropFilter = 'none';
    style['--dock-backdrop'] = 'none';
  }

  return style;
});
```

**关键技术点：**

1. **CSS 变量传递**：通过 `--dock-shadow`、`--dock-backdrop`、`--dock-opacity` 变量将设置值传递给 CSS
2. **自动隐藏兼容**：当 Dock 自动隐藏后 hover 显示时，CSS 会使用这些变量来恢复正确的样式

### 3.4 CSS 样式更新

**文件：** `src/styles/dock.css`

#### 移除固定样式

从 `.dock-container` 中移除固定的 `backdrop-filter` 和 `box-shadow`，改为由 inline style 动态控制：

```css
.dock-container {
  /* ... 其他样式 ... */
  
  /* 外观 - 阴影和毛玻璃效果由 inline style 根据设置动态控制 */
  
  /* ... 其他样式 ... */
}
```

#### 自动隐藏 hover 状态

使用 CSS 变量恢复用户设置的样式：

```css
/* 鼠标悬浮在 Dock 上时显示（防止隐藏动画执行中误触） */
.dock-container.is-auto-hidden:hover {
  transform: translateY(0);
  /* 恢复设置中的值 */
  opacity: var(--dock-opacity, 1) !important;
  box-shadow: var(--dock-shadow, 0 8px 32px rgba(0, 0, 0, 0.3)) !important;
  backdrop-filter: var(--dock-backdrop, blur(20px)) !important;
  -webkit-backdrop-filter: var(--dock-backdrop, blur(20px)) !important;
  pointer-events: auto;
}
```

**说明：**
- 使用 `var(--dock-shadow, 默认值)` 读取设置中的样式
- 确保自动隐藏功能与样式开关完全兼容

## 4. 即时生效

所有设置修改都是**即时生效**的，无需重启应用：

1. **响应式计算属性**：`dockContainerStyle` 会自动响应 `dockStore.settings` 的变化
2. **Vue 响应式系统**：修改设置后，计算属性立即重新计算并应用到 DOM
3. **跨窗口同步**：通过 `localStorage` `storage` 事件，设置窗口和 Dock 窗口实时同步

## 5. 兼容性说明

### 浏览器兼容性

- **阴影效果**：所有现代浏览器完全支持 `box-shadow`
- **毛玻璃效果**：
  - `backdrop-filter` 支持 Chromium 76+（Tauri 基于 WebView2/WebKit，完全支持）
  - 使用 `-webkit-backdrop-filter` 作为 Safari/WebKit 前缀
  - 在 Tauri 环境中表现良好

### 性能考虑

- **毛玻璃效果性能消耗**：`backdrop-filter: blur()` 是 GPU 加速的，但在低端设备上可能影响性能。用户可以选择关闭该效果。
- **阴影效果性能消耗**：`box-shadow` 性能消耗较低，但在频繁重绘时可能有轻微影响。

## 6. 修改的文件清单

1. **`src/stores/dockStore.ts`**
   - 新增 `hasShadow` 和 `hasGlassEffect` 属性
   - 设置默认值

2. **`src/views/Settings/Index.vue`**
   - 调整所有滑块的 `min`、`max`、`step` 属性
   - 新增"样式效果"区块，包含两个开关

3. **`src/views/Dock.vue`**
   - 修改 `dockContainerStyle` 计算属性
   - 根据设置动态应用阴影和毛玻璃效果
   - 通过 CSS 变量支持自动隐藏状态

4. **`src/styles/dock.css`**
   - 移除 `.dock-container` 中固定的阴影和毛玻璃样式
   - 更新 `.dock-container.is-auto-hidden:hover` 使用 CSS 变量

## 7. 测试验证

### 测试场景 1：调整属性范围

1. 打开设置页面
2. 依次调整长度、高度、透明度、圆角值、图标大小
3. 观察 Dock 栏是否实时响应变化

**预期结果：** 所有属性在调整时立即生效，Dock 栏外观随滑块变化

### 测试场景 2：阴影效果开关

1. 打开设置页面
2. 开启/关闭"阴影效果"开关
3. 观察 Dock 栏阴影是否立即出现/消失

**预期结果：** 开关切换时，阴影立即生效

### 测试场景 3：毛玻璃效果开关

1. 打开设置页面
2. 开启/关闭"毛玻璃效果"开关
3. 观察 Dock 栏背景模糊效果是否立即出现/消失

**预期结果：** 开关切换时，毛玻璃效果立即生效

### 测试场景 4：自动隐藏与样式开关兼容性

1. 开启自动隐藏
2. 关闭阴影和毛玻璃效果
3. 等待 Dock 隐藏后，将鼠标移到隐藏区域
4. 观察 Dock 显示时是否保持无阴影、无毛玻璃的状态

**预期结果：** Dock 显示时，遵循用户设置的样式（无阴影、无毛玻璃）

### 测试场景 5：极限值测试

1. 将长度设置为 120px，高度设置为 40px
2. 将长度设置为 1200px，高度设置为 200px
3. 将透明度设置为 0%
4. 将圆角值设置为 80px
5. 将图标大小设置为 32px 和 160px

**预期结果：** 所有极限值都能正常工作，Dock 栏外观正确

## 8. 相关文档

- [Dock 栏开发需求](./Dock栏开发需求.md)
- [Dock 自动隐藏 Bug 修复](./Dock自动隐藏bug修复.md)
- [Dock 完全隐藏实现说明](./Dock完全隐藏实现说明.md)

## 9. 技术要点总结

1. **响应式设计**：使用 Vue 的计算属性实现设置的即时生效
2. **CSS 变量传递**：通过 CSS 变量在 JS 和 CSS 之间传递动态值
3. **样式隔离**：阴影和毛玻璃效果由 inline style 控制，避免 CSS 样式冲突
4. **兼容性处理**：使用 `-webkit-` 前缀确保跨浏览器兼容
5. **性能优化**：允许用户关闭性能消耗较高的效果（毛玻璃）

## 10. 后续优化建议

1. **可定制阴影**：允许用户自定义阴影的颜色、大小、偏移量
2. **可定制模糊度**：允许用户调整毛玻璃的模糊程度（blur 值）
3. **预设样式方案**：提供多种预设样式方案（现代、扁平、毛玻璃、经典等）
4. **主题支持**：支持深色/浅色主题自动切换
5. **性能监控**：检测设备性能，自动建议关闭高性能消耗的效果

