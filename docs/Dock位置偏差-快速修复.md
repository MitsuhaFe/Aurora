# Dock 位置偏差 - 快速修复指南

## 问题

Dock 栏保存和重新加载时位置有偏差，不是同一个位置。

## 已添加的诊断工具

我已经在代码中添加了详细的日志，帮助定位问题：

### 拖动时的日志

```
📍 拖动前位置: { x: xxx, y: yyy }
📍 拖动后位置（outerPosition）: { x: xxx, y: yyy }
📍 拖动后位置（innerPosition）: { x: xxx, y: yyy }
📊 位置差异: { x差异: ?, y差异: ? }
💾 位置已保存: xxx yyy
```

### 创建时的日志

```
🪟 [createDockWindow] 从 settings 读取的位置: { x: xxx, y: yyy }
✅ [createDockWindow] 使用保存的位置: { x: xxx, y: yyy }
🔍 [createDockWindow] 位置验证:
  期望位置: { x: xxx, y: yyy }
  实际位置: { x: xxx, y: yyy }
  偏差: { x: ?, y: ? }
⚠️ 位置偏差超过阈值！可能需要校正。
```

## 测试步骤

### 第 1 步：拖动测试

1. 打开应用，显示 Dock
2. **拖动 Dock** 到屏幕左上角（或任何明显位置）
3. **查看控制台**，记录：
   - 保存的位置：`{ x: ?, y: ? }`
   - outerPosition 和 innerPosition 的差异

### 第 2 步：重新加载测试

1. **关闭 Dock**（在设置中）
2. **重新打开 Dock**
3. **查看控制台**，记录：
   - 期望位置：`{ x: ?, y: ? }`
   - 实际位置：`{ x: ?, y: ? }`
   - 偏差：`{ x: ?, y: ? }`

### 第 3 步：视觉确认

1. 用眼睛观察 Dock 的位置
2. **关闭前**：记住 Dock 相对于屏幕边缘的位置
3. **打开后**：对比位置是否改变
4. 估计偏差：上下左右大约移动了多少像素？

## 修复方案（待选择）

根据诊断结果，我会应用以下其中一个修复方案：

### 方案 A：创建后自动校正（如果偏差固定）

如果每次偏差都相同（如始终向右下偏移），在窗口创建后强制校正位置：

```typescript
// 创建后立即校正
await dockWindow.value.show();
await dockWindow.value.setPosition(new LogicalPosition(x, y));
```

### 方案 B：保存时添加补偿（如果偏差是系统边框）

如果偏差是由于 Windows 边框导致（通常是 8px 和 31px），在保存时减去偏移量：

```typescript
// 保存时补偿
const OFFSET_X = 8;
const OFFSET_Y = 31;
await dockStore.savePosition(
  position.x - OFFSET_X,
  position.y - OFFSET_Y
);
```

### 方案 C：使用 setAlwaysOnTop 修复（Tauri 特定问题）

某些 Tauri 版本在创建窗口时位置可能不准确，设置 alwaysOnTop 后重新定位：

```typescript
await dockWindow.value.setAlwaysOnTop(settings.value.alwaysOnTop);
await dockWindow.value.setPosition(new LogicalPosition(x, y));
```

### 方案 D：延迟设置位置

窗口创建后立即设置位置可能不稳定，延迟后再设置：

```typescript
await dockWindow.value.show();
await new Promise(resolve => setTimeout(resolve, 100));
await dockWindow.value.setPosition(new LogicalPosition(x, y));
```

## 你需要提供的信息

请运行测试并告诉我：

1. **位置差异日志**（从控制台复制）：
   ```
   📊 位置差异: { x差异: ?, y差异: ? }
   ```

2. **位置偏差日志**（从控制台复制）：
   ```
   偏差: { x: ?, y: ? }
   ```

3. **视觉估计**：
   - 向左/右移动了约 ? 像素
   - 向上/下移动了约 ? 像素

4. **你的系统信息**：
   - 操作系统：Windows 10/11 / macOS / Linux
   - DPI 缩放：100% / 125% / 150% / 其他
   - 屏幕分辨率：? x ?

## 快速验证命令

在浏览器控制台运行（当 Dock 窗口打开时）：

```javascript
// 获取当前位置
const pos = await window.__TAURI__.window.appWindow.outerPosition();
console.log('当前位置:', pos);

// 检查 localStorage 中保存的位置
const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('保存的位置:', { x: saved.x, y: saved.y });

// 对比
console.log('差异:', {
  x: pos.x - saved.x,
  y: pos.y - saved.y
});
```

## 临时解决方案（如果偏差不大）

如果偏差只有几个像素（≤ 5px），你可以：

1. 把 Dock 拖到你想要的位置
2. 稍微往相反方向偏移一点（补偿偏差）
3. 这样重新打开时，Dock 会偏移回你想要的位置

例如：如果发现每次向右偏移 5px，就在拖动时故意往左偏移 5px。

## 预期修复时间

- 收到诊断信息：1 分钟
- 应用修复方案：3-5 分钟
- 测试验证：2 分钟
- **总计：约 10 分钟**

## 文件修改

根据方案不同，可能修改以下文件：

- `src/views/Dock.vue` - 拖动保存逻辑
- `src/stores/dockStore.ts` - 窗口创建和位置设置逻辑

## 详细文档

更多技术细节请查看：[Dock 位置偏差诊断和修复](./Dock位置偏差诊断和修复.md)

---

**现在请执行测试步骤，并将控制台日志和观察结果告诉我！** 🎯

