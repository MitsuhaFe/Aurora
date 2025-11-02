# Dock 位置问题排查指南

## 问题描述

Dock 每次启动加载的位置都是固定的（默认位置），而不是上次保存的位置。

## 排查步骤

### 第 1 步：检查是否正在保存位置

1. 启动应用，打开 Dock
2. 拖动 Dock 到新位置
3. 打开浏览器控制台（F12）
4. 查看是否有以下日志：

```
📍 保存 Dock 位置: { x: xxx, y: yyy }
💾 保存设置到 localStorage: { 位置: { x: xxx, y: yyy }, ... }
✅ 设置已保存
```

**如果看不到这些日志：**
- ❌ 说明位置没有被保存
- 检查 `Dock.vue` 中的 `handleMouseDown` 和拖动逻辑
- 检查 `dockStore.savePosition()` 是否被调用

**如果看到这些日志：**
- ✅ 说明位置正在保存
- 继续下一步

### 第 2 步：验证 localStorage 中的数据

在控制台运行以下命令：

```javascript
// 查看保存的设置
const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('保存的设置:', saved);
console.log('保存的位置:', { x: saved.x, y: saved.y });
```

**预期输出：**
```javascript
保存的设置: { 
  enabled: true, 
  x: 500,  // 你拖动到的位置
  y: 900,  // 你拖动到的位置
  width: 400,
  height: 80,
  // ... 其他设置
}
保存的位置: { x: 500, y: 900 }
```

**如果 x 和 y 是 -1：**
- ❌ 说明位置没有正确保存到 localStorage
- 检查 `saveSettings()` 函数
- 检查是否有其他代码覆盖了位置

**如果 x 和 y 是正确的值：**
- ✅ 说明位置已正确保存
- 继续下一步

### 第 3 步：检查启动时是否正在加载位置

1. 关闭应用
2. 重新启动应用
3. 立即打开控制台（在 Dock 创建之前）
4. 查看以下日志：

```
📂 从 localStorage 加载设置: { 位置: { x: xxx, y: yyy }, ... }
✅ Dock Store 已加载设置: { enabled: true, 位置: { x: xxx, y: yyy }, ... }
```

**如果 x 和 y 是 -1：**
- ❌ 说明加载时位置被重置为默认值
- 可能是 localStorage 中的数据有问题
- 运行第 2 步再次检查 localStorage

**如果 x 和 y 是正确的值：**
- ✅ 说明位置已正确加载到 store
- 继续下一步

### 第 4 步：检查创建窗口时使用的位置

继续查看控制台日志：

```
🪟 [createDockWindow] 从 settings 读取的位置: { x: xxx, y: yyy, 是否为默认标记: false }
✅ [createDockWindow] 使用保存的位置: { x: xxx, y: yyy }
```

**如果看到 "首次启动，计算默认位置"：**
```
🪟 [createDockWindow] 从 settings 读取的位置: { x: -1, y: -1, 是否为默认标记: true }
🎯 [createDockWindow] 首次启动，计算默认位置: { x: 960, y: 1020, ... }
```
- ❌ 说明创建窗口时，settings 中的位置仍然是 -1
- 这表示加载的位置没有被保留
- 继续第 5 步深入排查

**如果看到 "使用保存的位置"：**
- ✅ 说明窗口创建时使用了正确的位置
- 但窗口可能出现在错误的位置
- 可能是 Tauri 的窗口坐标系统问题

### 第 5 步：检查 watch 是否覆盖了位置

查看控制台日志，检查在加载设置和创建窗口之间是否有：

```
📝 设置已变化，触发自动保存
💾 保存设置到 localStorage: { 位置: { x: -1, y: -1 }, ... }
```

**如果看到位置被保存为 -1：**
- ❌ 说明某处代码在加载后又重置了位置
- 检查是否有代码修改了 `settings.value.x` 或 `settings.value.y`
- 检查 watch 的触发时机

### 第 6 步：使用验证函数对比数据

在控制台运行：

```javascript
const dockStore = useDockStore();
const result = dockStore.verifySettings();
console.log('验证结果:', result);
```

这会对比 localStorage 和 store 中的所有设置，并输出不匹配的字段。

**特别关注 x 和 y 字段：**
```
⚠️ 字段不匹配: x { localStorage: 500, store: -1 }
⚠️ 字段不匹配: y { localStorage: 900, store: -1 }
```

如果看到这样的输出，说明：
- localStorage 中保存的是正确的位置（500, 900）
- 但 store 中的位置被重置为 -1
- 需要找出是什么代码在加载后修改了位置

## 常见问题和解决方案

### 问题 1：位置保存为 -1

**症状：** localStorage 中的 x 和 y 都是 -1

**原因：** `savePosition()` 没有被调用，或者被其他代码覆盖

**解决方案：**

1. 检查 Dock.vue 中拖动结束后是否调用了 `savePosition()`
2. 在拖动结束后添加日志：
   ```javascript
   console.log('拖动结束，获取窗口位置...');
   const position = await appWindow.outerPosition();
   console.log('当前窗口位置:', position);
   await dockStore.savePosition(position.x, position.y);
   ```

### 问题 2：加载时位置正确，但创建窗口时变成 -1

**症状：**
- 加载日志显示：`位置: { x: 500, y: 900 }`
- 创建窗口日志显示：`从 settings 读取的位置: { x: -1, y: -1 }`

**原因：** 在加载和创建窗口之间，某处代码修改了位置

**解决方案：**

1. 在 `loadSettings()` 后立即添加验证：
   ```javascript
   loadSettings();
   console.log('加载后立即检查:', { x: settings.value.x, y: settings.value.y });
   ```

2. 在 `createDockWindow()` 开始时添加验证：
   ```javascript
   async function createDockWindow() {
     console.log('创建窗口前检查:', { x: settings.value.x, y: settings.value.y });
     // ...
   }
   ```

3. 比较两次日志，找出在哪里位置被修改

### 问题 3：localStorage 正常，但加载后位置是 -1

**症状：**
- localStorage 中：`{ x: 500, y: 900 }`
- 加载后：`位置: { x: -1, y: -1 }`

**原因：** `loadSettings()` 没有正确合并数据

**解决方案：**

检查 `loadSettings()` 中的合并逻辑：

```typescript
function loadSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    console.log('parsed 中的位置:', { x: parsed.x, y: parsed.y });
    
    settings.value = { ...settings.value, ...parsed };
    
    console.log('合并后的位置:', { x: settings.value.x, y: settings.value.y });
  }
}
```

确保 `parsed.x` 和 `parsed.y` 不是 undefined。

### 问题 4：位置保存和加载都正常，但窗口出现在错误的位置

**症状：**
- 所有日志都显示正确的位置
- 但窗口出现在屏幕的其他位置

**原因：** Tauri 窗口坐标系统或多显示器问题

**解决方案：**

1. 验证窗口实际位置：
   ```javascript
   const dockStore = useDockStore();
   const position = await dockStore.dockWindow.outerPosition();
   console.log('窗口实际位置:', position);
   console.log('期望位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
   ```

2. 如果不匹配，可能需要在创建窗口后手动设置位置：
   ```typescript
   await dockWindow.value.show();
   
   // 确保位置正确
   const { LogicalPosition } = await import('@tauri-apps/api/window');
   await dockWindow.value.setPosition(new LogicalPosition(x, y));
   ```

## 快速测试脚本

复制以下脚本到控制台，一键测试所有步骤：

```javascript
async function testDockPosition() {
  console.log('===== Dock 位置测试 =====');
  
  // 1. 检查 localStorage
  const stored = localStorage.getItem('aurora-dock-settings');
  if (stored) {
    const parsed = JSON.parse(stored);
    console.log('✅ localStorage 中的位置:', { x: parsed.x, y: parsed.y });
  } else {
    console.log('❌ localStorage 中没有保存的设置');
    return;
  }
  
  // 2. 检查 store
  const dockStore = useDockStore();
  console.log('✅ store 中的位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
  
  // 3. 对比
  const result = dockStore.verifySettings();
  if (result && result.match) {
    console.log('✅ localStorage 和 store 一致');
  } else {
    console.log('❌ localStorage 和 store 不一致');
  }
  
  // 4. 检查窗口实际位置（如果 Dock 已打开）
  if (dockStore.dockWindow) {
    try {
      const position = await dockStore.dockWindow.outerPosition();
      console.log('✅ 窗口实际位置:', position);
      
      const xDiff = Math.abs(position.x - dockStore.settings.x);
      const yDiff = Math.abs(position.y - dockStore.settings.y);
      
      if (xDiff < 10 && yDiff < 10) {
        console.log('✅ 窗口位置与设置匹配（误差 <10px）');
      } else {
        console.log('❌ 窗口位置与设置不匹配');
        console.log('   期望:', { x: dockStore.settings.x, y: dockStore.settings.y });
        console.log('   实际:', { x: position.x, y: position.y });
        console.log('   误差:', { x: xDiff, y: yDiff });
      }
    } catch (error) {
      console.log('⚠️ 无法获取窗口位置:', error);
    }
  } else {
    console.log('⚠️ Dock 窗口未创建');
  }
  
  console.log('===== 测试完成 =====');
}

// 运行测试
testDockPosition();
```

## 总结

通过以上步骤，你应该能够找出位置没有正确保存或加载的原因。

**最常见的问题：**
1. ❌ 拖动后没有调用 `savePosition()`
2. ❌ `loadSettings()` 在 watch 注册之前被调用，导致加载的位置被覆盖
3. ❌ 某处代码在加载后又重置了位置为 -1
4. ❌ Tauri 窗口坐标系统问题

**使用日志追踪：**
- 📍 保存位置
- 📂 加载设置
- 🪟 创建窗口
- ✅ 使用保存的位置 vs 🎯 首次启动

通过这些日志，你可以清楚地看到位置在每个阶段的值。

