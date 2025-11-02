# Dock 关闭时位置追踪

## 问题描述

用户发现：
- ✅ 拖动 Dock 后，位置正确保存
- ❌ 但关闭 Dock 栏时，保存的位置似乎被重置
- ✅ 如果直接清理程序再启动（不关闭 Dock），保存的坐标生效

这说明问题出在**关闭 Dock** 的过程中。

## 追踪步骤

### 第 1 步：拖动并保存位置

1. 启动应用，打开 Dock
2. 拖动 Dock 到新位置
3. 观察控制台日志：

```
🖱️ 开始拖动 Dock...
✅ 拖动结束，保存位置...
📍 保存 Dock 位置: { x: 500, y: 900 }
💾 保存设置到 localStorage: { 位置: { x: 500, y: 900 }, ... }
✅ 设置已保存
```

4. 在控制台验证保存：

```javascript
const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('保存的位置:', { x: saved.x, y: saved.y });
// 应该显示：{ x: 500, y: 900 }
```

### 第 2 步：关闭 Dock 并观察

1. 在设置中关闭"显示 Dock 栏"
2. 观察控制台日志（已添加新的追踪日志）：

```
🔄 [toggleDock] 切换 Dock 状态: 关闭
📍 [toggleDock] 切换前的位置: { x: 500, y: 900 }
🔒 [closeDockWindow] 关闭前的位置: { x: 500, y: 900 }
✅ [closeDockWindow] Dock 窗口已关闭
📍 [closeDockWindow] 位置保持为: { x: 500, y: 900 }
📍 [toggleDock] 切换后的位置: { x: 500, y: 900 }
```

**关键检查点：**
- ✅ 如果所有日志显示位置都是 500, 900 → 关闭过程正常
- ❌ 如果某个日志显示位置变成 -1, -1 → 找到了问题所在

3. 同时观察是否有保存日志：

```
📝 设置已变化，触发自动保存
💾 保存设置到 localStorage: { 位置: { x: ???, y: ??? }, ... }
```

**关键：** 检查这里保存的位置是什么！

### 第 3 步：验证 localStorage

在关闭 Dock 后，立即检查 localStorage：

```javascript
const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('关闭后 localStorage 中的位置:', { x: saved.x, y: saved.y });
```

**对比：**
- 关闭前：`{ x: 500, y: 900 }`
- 关闭后：`{ x: ???, y: ??? }`

**如果关闭后变成了 -1：**
- ❌ 说明关闭时触发了保存，并覆盖了正确的位置
- 需要找出是什么代码在关闭时重置了位置

### 第 4 步：重新打开 Dock

1. 在设置中重新开启"显示 Dock 栏"
2. 观察控制台日志：

```
🔄 [toggleDock] 切换 Dock 状态: 开启
📍 [toggleDock] 切换前的位置: { x: ???, y: ??? }
🪟 [createDockWindow] 从 settings 读取的位置: { x: ???, y: ??? }
```

**关键：** 这里显示的位置是什么？

- 如果是 500, 900 → ✅ 位置保留正常
- 如果是 -1, -1 → ❌ 位置被重置

## 可能的问题原因

### 原因 1：watch 在关闭时触发并覆盖位置

**场景：**

```
1. 拖动 Dock → 位置保存为 { x: 500, y: 900 }
2. 关闭 Dock → settings.value.enabled = false
3. watch 触发 → saveSettings()
4. 但此时某处代码已将位置重置为 -1
5. localStorage 被覆盖为 { x: -1, y: -1 }
```

**解决方案：**

在 `toggleDock()` 中，暂时禁用 watch：

```typescript
async function toggleDock(enabled: boolean) {
  isLoadingSettings = true; // 暂时禁用 watch
  
  settings.value.enabled = enabled;
  
  if (enabled) {
    await createDockWindow();
  } else {
    await closeDockWindow();
  }
  
  setTimeout(() => {
    isLoadingSettings = false;
  }, 100);
}
```

### 原因 2：关闭窗口时某处重置了位置

**检查是否有代码在窗口关闭时执行：**

1. Tauri 窗口关闭事件监听器
2. Vue 组件的 `onUnmounted` 钩子
3. 其他清理逻辑

### 原因 3：Store 状态被重置

**可能在关闭时，store 的某些状态被重置为默认值。**

检查是否有代码在 `closeDockWindow()` 后重置了 settings。

## 测试脚本

复制以下脚本到控制台，监控整个关闭过程：

```javascript
// 监控位置变化
const dockStore = useDockStore();
let lastX = dockStore.settings.x;
let lastY = dockStore.settings.y;

// 每 100ms 检查一次位置是否变化
const interval = setInterval(() => {
  const currentX = dockStore.settings.x;
  const currentY = dockStore.settings.y;
  
  if (currentX !== lastX || currentY !== lastY) {
    console.log('⚠️ 位置发生变化:', {
      从: { x: lastX, y: lastY },
      到: { x: currentX, y: currentY },
      时间: new Date().toLocaleTimeString(),
      调用栈: new Error().stack
    });
    
    lastX = currentX;
    lastY = currentY;
  }
}, 100);

// 监控 localStorage 变化
window.addEventListener('storage', (e) => {
  if (e.key === 'aurora-dock-settings') {
    const newData = JSON.parse(e.newValue);
    console.log('📦 localStorage 被修改:', {
      位置: { x: newData.x, y: newData.y },
      时间: new Date().toLocaleTimeString()
    });
  }
});

console.log('✅ 监控已启动');
console.log('现在请关闭 Dock 栏');
console.log('完成后运行：clearInterval(interval) 停止监控');
```

## 预期的正常流程

### 关闭 Dock（正确的）

```
1. 用户点击关闭
   └─> toggleDock(false)
         ├─> settings.value.enabled = false
         ├─> watch 触发
         │     └─> saveSettings() 
         │           └─> 保存当前 settings（位置应该是 500, 900）
         └─> closeDockWindow()
               └─> 关闭窗口
```

### 重新打开 Dock（正确的）

```
1. 用户点击打开
   └─> toggleDock(true)
         ├─> settings.value.enabled = true
         └─> createDockWindow()
               ├─> 从 settings 读取位置（应该是 500, 900）
               ├─> 不是 -1，使用保存的位置
               └─> 创建窗口在 (500, 900)
```

## 快速验证命令

```javascript
// 1. 拖动 Dock 后检查
const saved1 = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('拖动后:', { x: saved1.x, y: saved1.y });

// 2. 关闭 Dock 后检查
const saved2 = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('关闭后:', { x: saved2.x, y: saved2.y });

// 3. 对比
if (saved1.x === saved2.x && saved1.y === saved2.y) {
  console.log('✅ 位置保持一致');
} else {
  console.log('❌ 位置被修改了！');
  console.log('变化:', {
    x: `${saved1.x} → ${saved2.x}`,
    y: `${saved1.y} → ${saved2.y}`
  });
}
```

## 解决方案

### 方案 1：在关闭时禁用 watch（推荐）

修改 `toggleDock()` 函数，在修改 `enabled` 时暂时禁用 watch 监听器。

### 方案 2：不在关闭时保存

确保 `closeDockWindow()` 不会触发任何导致位置被重置的代码。

### 方案 3：关闭前显式保存位置

在关闭窗口之前，先获取并保存当前窗口位置：

```typescript
async function closeDockWindow() {
  if (dockWindow.value) {
    // 关闭前保存当前窗口位置
    try {
      const position = await dockWindow.value.outerPosition();
      settings.value.x = position.x;
      settings.value.y = position.y;
      saveSettings();
    } catch (error) {
      console.warn('无法获取窗口位置:', error);
    }
    
    await dockWindow.value.close();
    dockWindow.value = null;
  }
}
```

## 下一步

1. **运行监控脚本** - 追踪关闭时的位置变化
2. **查看日志** - 找出位置在哪里被修改
3. **应用解决方案** - 根据问题原因选择合适的修复方案

