# Dock 自动隐藏 Bug 修复说明

## 问题描述

开启自动隐藏功能时出现两个 Bug：

1. **Dock 自动移动到默认位置**：开启自动隐藏开关后，Dock 会从当前位置移动到默认位置
2. **需要点击才隐藏**：开启自动隐藏后，需要用户再点击一次 Dock 才会开始自动隐藏逻辑

## 问题原因

### Bug 1：位置被重置

在 `dockStore.ts` 中，`watch` 监听 `settings` 的变化：

```typescript
watch(
  settings,
  async (newSettings) => {
    saveSettings();
    if (dockWindow.value) {
      await applySettingsToWindow(); // 这会调用 setPosition()
    }
  },
  { deep: true }
);
```

当用户开启或关闭自动隐藏时，`settings.autoHide` 变化，触发 `applySettingsToWindow()`，该函数会执行：

```typescript
// 设置位置（如果没有固定）
if (!settings.value.pinPosition) {
  await dockWindow.value.setPosition(new LogicalPosition(settings.value.x, settings.value.y));
}
```

这导致 Dock 被强制移动到存储的 `x, y` 坐标（可能是默认值或旧值），而不是保持在当前位置。

### Bug 2：隐藏逻辑未立即启动

在 `Dock.vue` 中，监听自动隐藏开关变化：

```typescript
watch(
  () => dockStore.settings.autoHide,
  (newValue) => {
    if (!newValue) {
      dockStore.resetAutoHide();
    } else {
      console.log('✅ 自动隐藏已开启');
      // 没有启动隐藏逻辑
    }
  }
);
```

开启自动隐藏时，只是打印了日志，但没有调用 `handleMouseLeave()` 来启动隐藏计时器。用户需要手动触发鼠标离开事件才能启动隐藏。

## 解决方案

### 修复 Bug 1：避免不必要的位置更新

#### 方案 1：优化 watch 监听条件

在 `src/stores/dockStore.ts` 中，修改 `watch` 逻辑，只在特定属性变化时才应用设置到窗口：

```typescript
watch(
  settings,
  async (newSettings, oldSettings) => {
    saveSettings();
    
    // 只有非位置相关的设置变化时才应用到窗口
    // 避免开关自动隐藏等设置时意外移动 Dock
    const shouldApply = 
      newSettings.width !== oldSettings?.width ||
      newSettings.height !== oldSettings?.height ||
      newSettings.alwaysOnTop !== oldSettings?.alwaysOnTop;
    
    if (dockWindow.value && shouldApply) {
      await applySettingsToWindow();
    }
  },
  { deep: true }
);
```

**说明：**
- 只有 `width`、`height`、`alwaysOnTop` 变化时，才调用 `applySettingsToWindow()`
- 其他设置变化（如 `autoHide`、`pinPosition` 等）不会触发窗口位置更新

#### 方案 2：移除 `applySettingsToWindow()` 中的位置设置

在 `src/stores/dockStore.ts` 中，从 `applySettingsToWindow()` 函数移除位置设置逻辑：

```typescript
async function applySettingsToWindow() {
  if (!dockWindow.value) return;
  
  try {
    const { LogicalSize, LogicalPosition } = await import('@tauri-apps/api/window');
    
    // 设置窗口大小
    await dockWindow.value.setSize(new LogicalSize(settings.value.width, settings.value.height));
    
    // 设置始终置顶
    await dockWindow.value.setAlwaysOnTop(settings.value.alwaysOnTop);
    
    // 注意：不在这里设置位置，避免意外移动
    // 位置只在以下情况设置：
    // 1. 创建窗口时（createDockWindow）
    // 2. 拖动结束后（savePosition）
    
    console.log('设置已应用到窗口:', {
      width: settings.value.width,
      height: settings.value.height,
      alwaysOnTop: settings.value.alwaysOnTop
    });
    
  } catch (error) {
    console.error('应用设置到窗口失败:', error);
  }
}
```

**说明：**
- 彻底移除位置设置逻辑，确保 Dock 位置只在以下两种情况更新：
  1. 创建窗口时（`createDockWindow()`）
  2. 用户拖动结束后（`savePosition()`）

### 修复 Bug 2：立即启动隐藏逻辑

在 `src/views/Dock.vue` 中，修改 `watch` 逻辑，开启自动隐藏时立即启动隐藏计时器：

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
      // 开启自动隐藏时，立即启动隐藏逻辑
      // 延迟一小段时间后开始隐藏（给用户反应时间）
      setTimeout(() => {
        if (dockStore.settings.autoHide && !dockStore.isHovered) {
          dockStore.handleMouseLeave();
        }
      }, 100);
    }
  }
);
```

**说明：**
- 开启自动隐藏时，延迟 100ms 后检查鼠标状态
- 如果自动隐藏仍然开启且鼠标未悬浮在 Dock 上，调用 `handleMouseLeave()` 启动隐藏计时器
- 延迟 100ms 的目的：
  1. 给用户反应时间，避免立即隐藏导致的突兀感
  2. 确保状态已正确同步

## 测试验证

### 测试场景 1：开启自动隐藏，验证位置不变

1. 将 Dock 拖动到屏幕任意位置
2. 打开设置，开启"自动隐藏"开关
3. 观察 Dock 位置

**预期结果：** Dock 保持在当前位置，不会移动到默认位置

### 测试场景 2：开启自动隐藏，验证立即隐藏

1. 将鼠标移出 Dock 区域
2. 打开设置，开启"自动隐藏"开关
3. 观察 Dock 行为

**预期结果：** 开启开关后 100ms 左右，Dock 自动启动隐藏计时器，2 秒后隐藏

### 测试场景 3：开启自动隐藏，鼠标在 Dock 上

1. 将鼠标移到 Dock 上
2. 打开设置，开启"自动隐藏"开关
3. 观察 Dock 行为

**预期结果：** Dock 不会立即隐藏，因为鼠标在 Dock 上

## 相关文件

- `src/stores/dockStore.ts`：修复位置重置问题
- `src/views/Dock.vue`：修复隐藏逻辑启动问题

## 技术要点

1. **响应式监听的副作用**：`watch` 深度监听时，任何属性变化都会触发回调，需要精确控制哪些变化需要触发哪些操作
2. **位置管理的单一职责**：窗口位置应该只在必要时更新，避免意外移动
3. **用户体验优化**：开启自动隐藏时，延迟一小段时间再启动隐藏逻辑，避免突兀感

## 更新日期

2025-11-01

