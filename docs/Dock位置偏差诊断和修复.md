# Dock 位置偏差诊断和修复

## 问题描述

用户反馈：Dock 栏保存时和重新加载时的位置存在偏差，导致不是同一个位置。

## 可能的原因

### 1. API 坐标系统不一致

Tauri 提供了两种获取窗口位置的 API：

- **`outerPosition()`** - 获取窗口外部位置（包括边框、阴影等）
- **`innerPosition()`** - 获取窗口内容区域的位置

在创建窗口时：
- **`new WebviewWindow({ x, y })`** - 可能使用的是某一种特定的坐标系统

如果保存和创建使用的坐标系统不一致，就会导致位置偏差。

### 2. Windows DPI 缩放

在 Windows 系统上，如果启用了 DPI 缩放（如 125%、150%），窗口坐标可能会受到影响。

### 3. 窗口装饰

虽然 Dock 窗口设置了 `decorations: false`（无边框），但系统可能仍然在内部保留一些边距。

### 4. 窗口初始化时机

窗口创建后，实际显示位置可能与设置的位置有微小差异。

## 诊断步骤

### 第 1 步：测试位置偏差

1. **启动应用并打开 Dock**
2. **拖动 Dock** 到一个明显的位置（如屏幕左上角）
3. **观察控制台日志**：

```
🖱️ 开始拖动 Dock...
📍 拖动前位置: { x: xxx, y: yyy }
✅ 拖动结束，保存位置...
📍 拖动后位置（outerPosition）: { x: xxx, y: yyy }
📍 拖动后位置（innerPosition）: { x: xxx, y: yyy }
📊 位置差异: { x差异: 0, y差异: 0 }
💾 位置已保存: xxx yyy
```

**重点检查：**
- `outerPosition` 和 `innerPosition` 的差异是多少？
- 如果有差异，说明 Tauri 的两个 API 返回的坐标系统不同

### 第 2 步：测试创建偏差

1. **关闭 Dock**（在设置中）
2. **重新打开 Dock**
3. **观察控制台日志**：

```
🪟 [createDockWindow] 从 settings 读取的位置: { x: xxx, y: yyy }
✅ [createDockWindow] 使用保存的位置: { x: xxx, y: yyy }
🔍 [createDockWindow] 位置验证:
  期望位置: { x: xxx, y: yyy }
  实际位置: { x: xxx, y: yyy }
  偏差: { x: 0, y: 0 }
```

**重点检查：**
- 期望位置和实际位置的偏差是多少？
- 如果偏差 > 5 像素，会显示警告

### 第 3 步：测量实际偏差

1. 在屏幕上做一个标记（如放置一个窗口）
2. 拖动 Dock 到标记位置
3. 关闭并重新打开 Dock
4. 观察 Dock 是否精确回到标记位置
5. 如果有偏差，估计偏差的像素数量（上下左右）

## 根据诊断结果的修复方案

### 方案 A：outerPosition 和 innerPosition 有差异

如果日志显示这两个 API 返回的位置不同，说明需要统一使用一个 API。

**修复：** 统一使用 `outerPosition()`（已经在使用）。

### 方案 B：创建时位置有固定偏差

如果日志显示创建后的实际位置与期望位置有固定偏差（如始终偏移 8px），这可能是窗口边框导致的。

**修复 1：创建后自动校正位置**

```typescript
// 在 createDockWindow() 中
await dockWindow.value.show();

// 等待窗口完全显示
await new Promise(resolve => setTimeout(resolve, 100));

// 获取实际位置
const actualPosition = await dockWindow.value.outerPosition();

// 如果有偏差，校正位置
if (actualPosition.x !== x || actualPosition.y !== y) {
  console.log('🔧 检测到位置偏差，正在校正...');
  await dockWindow.value.setPosition(new LogicalPosition(x, y));
}
```

**修复 2：保存时添加偏移量**

如果发现固定偏差（如 x 偏移 8px，y 偏移 31px），可以在保存时添加补偿：

```typescript
// 在 Dock.vue 的 handleMouseDown 中
const position = await appWindow.outerPosition();

// Windows 系统边框补偿（根据实际测试调整）
const BORDER_OFFSET_X = 8;  // 左右边框
const BORDER_OFFSET_Y = 31; // 标题栏高度

await dockStore.savePosition(
  position.x - BORDER_OFFSET_X,
  position.y - BORDER_OFFSET_Y
);
```

### 方案 C：使用 setPosition 校正

如果创建窗口时的位置总是不准确，可以在创建后使用 `setPosition` 重新设置：

```typescript
// 在 createDockWindow() 中
await dockWindow.value.show();

// 强制设置到精确位置
await dockWindow.value.setPosition(new LogicalPosition(x, y));

// 等待位置稳定
await new Promise(resolve => setTimeout(resolve, 50));

// 验证位置
const finalPosition = await dockWindow.value.outerPosition();
console.log('最终位置:', finalPosition);
```

## 快速测试脚本

复制以下脚本到浏览器控制台：

```javascript
// 测试位置精度
async function testDockPositionAccuracy() {
  console.log('='.repeat(60));
  console.log('🧪 Dock 位置精度测试');
  console.log('='.repeat(60));
  
  // 获取当前位置
  const currentPos = await window.__TAURI__.window.appWindow.outerPosition();
  console.log('当前位置:', currentPos);
  
  // 模拟保存和恢复
  console.log('\n请执行以下步骤:');
  console.log('1. 拖动 Dock 到屏幕左上角');
  console.log('2. 观察保存的坐标');
  console.log('3. 关闭并重新打开 Dock');
  console.log('4. 对比实际位置和保存的坐标');
  console.log('5. 测量偏差（如果有）');
  
  console.log('\n' + '='.repeat(60));
}

// 运行测试
testDockPositionAccuracy();
```

## 实施修复

### 第 1 步：收集诊断数据

运行应用并收集以下信息：

1. **拖动后的日志**：
   - outerPosition: `{ x: ?, y: ? }`
   - innerPosition: `{ x: ?, y: ? }`
   - 差异：`{ x差异: ?, y差异: ? }`

2. **创建后的日志**：
   - 期望位置: `{ x: ?, y: ? }`
   - 实际位置: `{ x: ?, y: ? }`
   - 偏差: `{ x: ?, y: ? }`

3. **视觉测量**：
   - 实际偏差大约多少像素？
   - 偏差方向（上/下/左/右）？

### 第 2 步：应用对应的修复方案

根据诊断结果，从上述方案中选择合适的修复方法。

### 第 3 步：验证修复

修复后，再次执行测试：

1. 拖动 Dock 到多个不同位置
2. 每次都关闭并重新打开
3. 验证位置是否精确恢复
4. 偏差应该 ≤ 1-2 像素（视觉上无法察觉）

## 预期结果

修复后，应该达到：

✅ **拖动保存后，重新打开位置精确**  
✅ **偏差 ≤ 2 像素（视觉上无法察觉）**  
✅ **多次关闭/打开，位置不会漂移**  
✅ **在屏幕任何位置都能精确恢复**  

## 常见偏差值

根据其他 Tauri 应用的经验：

- **Windows 10/11 (无 DPI 缩放)**: 通常没有偏差或偏差很小（1-2px）
- **Windows (有 DPI 缩放)**: 可能有 8px (左/右) 和 31px (上) 的偏差
- **macOS**: 通常没有偏差
- **Linux**: 取决于窗口管理器

## 注意事项

1. **不要过度校正** - 如果偏差 ≤ 2px，不需要修复（用户察觉不到）
2. **测试多个位置** - 确保修复在屏幕各个区域都有效
3. **考虑多显示器** - 如果有多个显示器，确保每个显示器都正确
4. **DPI 感知** - 在高 DPI 屏幕上测试

## 相关链接

- Tauri Window API: https://tauri.app/v1/api/js/window
- Tauri Position Types: https://tauri.app/v1/api/js/window#logicalposition

## 下一步

请执行诊断步骤，并提供：

1. 完整的控制台日志
2. 偏差的具体数值（从日志中读取）
3. 视觉测量的偏差估计

我会根据这些信息提供精确的修复方案。

