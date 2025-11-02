# Dock 多窗口数据冲突修复

## 问题描述

用户报告：拖动 Dock 后，关闭再重新打开，位置会恢复到旧位置。

### 问题日志

**关闭前（在 Dock 窗口）：**
```
💾 保存设置到 localStorage: 位置: {x: 1334, y: 398}
✅ 设置已保存
💾 位置已保存: 1334 398
```

**关闭后（重新加载）：**
```
📂 从 localStorage 加载设置: 位置: {x: 948, y: 150}
```

**问题：** 位置从 `(1334, 398)` 变成了 `(948, 150)` ❌

## 根本原因

### 多窗口 Store 实例问题

Aurora 应用有**两个窗口**，每个窗口都有**独立的 Pinia store 实例**：

1. **主窗口（Settings）** - 有自己的 `dockStore` 实例
2. **Dock 窗口** - 有自己的 `dockStore` 实例

### 问题流程

```
第 1 步：用户拖动 Dock（在 Dock 窗口）
   ├─> Dock 窗口的 store: 位置更新为 (1334, 398)
   ├─> 调用 savePosition()
   └─> localStorage 保存为 (1334, 398) ✅

第 2 步：主窗口的 store 状态
   ├─> 主窗口的 store: 位置还是 (948, 150) ← 旧数据！
   └─> 因为主窗口没有监听 Dock 的拖动事件

第 3 步：用户在主窗口关闭 Dock
   ├─> 点击 Settings 中的"显示 Dock 栏"开关
   ├─> 调用主窗口的 dockStore.toggleDock(false)
   ├─> toggleDock() 中调用 saveSettings()
   ├─> 使用主窗口 store 的数据（旧位置 948, 150）
   └─> localStorage 被覆盖为 (948, 150) ❌

第 4 步：重新打开 Dock
   ├─> 从 localStorage 读取位置
   └─> 读到的是被覆盖的旧位置 (948, 150) ❌
```

### 为什么之前没发现

- 如果用户在 **Dock 窗口中** 拖动并关闭 → 正常 ✅
- 如果用户在 **主窗口中** 关闭 Dock → 出问题 ❌

## 解决方案

### 核心思路

在主窗口调用 `toggleDock()` 时，**先从 localStorage 重新加载最新数据**，然后再保存。

### 修复前的代码

```typescript
async function toggleDock(enabled: boolean) {
  settings.value.enabled = enabled;  // 直接修改
  
  if (enabled) {
    await createDockWindow();
  } else {
    await closeDockWindow();
  }
  
  saveSettings();  // ❌ 使用主窗口 store 的旧数据保存
}
```

### 修复后的代码

```typescript
async function toggleDock(enabled: boolean) {
  // 🔑 关键修复：先重新加载最新数据
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const latestSettings = JSON.parse(stored);
    
    // 同步所有字段到当前 store（除了 enabled）
    settings.value.x = latestSettings.x;
    settings.value.y = latestSettings.y;
    settings.value.width = latestSettings.width;
    settings.value.height = latestSettings.height;
    // ... 其他字段
    
    console.log('✅ 已同步最新数据到 store');
  }
  
  // 现在修改 enabled
  settings.value.enabled = enabled;
  
  if (enabled) {
    await createDockWindow();
  } else {
    await closeDockWindow();
  }
  
  saveSettings();  // ✅ 现在保存的是最新数据
}
```

## 修复后的流程

```
第 1 步：用户拖动 Dock（在 Dock 窗口）
   └─> localStorage 保存为 (1334, 398) ✅

第 2 步：用户在主窗口关闭 Dock
   ├─> toggleDock(false) 被调用
   ├─> 🔑 先从 localStorage 重新加载
   │     └─> 主窗口 store 更新为 (1334, 398)
   ├─> 设置 enabled = false
   ├─> 关闭 Dock 窗口
   └─> 保存设置（使用最新的位置 1334, 398）✅

第 3 步：重新打开 Dock
   └─> 从 localStorage 读取位置 (1334, 398) ✅
```

## 新增的调试日志

修复后，你会在控制台看到：

```
🔄 [toggleDock] 切换 Dock 状态: 关闭
📍 [toggleDock] 切换前 store 中的位置: { x: 948, y: 150 }  ← 旧数据
🔄 [toggleDock] 从 localStorage 加载最新位置: { x: 1334, y: 398 }  ← 重新加载
✅ [toggleDock] 已同步最新数据到 store
📍 [toggleDock] 切换后的位置: { x: 1334, y: 398 }  ← 已更新
💾 [toggleDock] 切换完成，保存状态
💾 保存设置到 localStorage: { 位置: { x: 1334, y: 398 }, ... }  ← 保存正确
✅ 设置已保存
```

**关键日志：**
- `从 localStorage 加载最新位置` - 确认重新加载了
- `切换后的位置` - 确认 store 已更新
- `保存设置到 localStorage` - 确认保存的是正确的位置

## 测试验证

### 测试步骤

1. **打开 Dock**
2. **拖动 Dock** 到新位置（例如屏幕左侧）
3. 观察控制台：
   ```
   💾 位置已保存: 1334 398
   ```
4. **在主窗口 Settings 中关闭 Dock**
5. 观察控制台，应该看到：
   ```
   🔄 [toggleDock] 切换前 store 中的位置: { x: 948, y: 150 }
   🔄 [toggleDock] 从 localStorage 加载最新位置: { x: 1334, y: 398 }
   ✅ [toggleDock] 已同步最新数据到 store
   💾 保存设置到 localStorage: { 位置: { x: 1334, y: 398 }, ... }
   ```
6. **验证 localStorage：**
   ```javascript
   const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
   console.log('位置:', { x: saved.x, y: saved.y });
   // 应该显示：{ x: 1334, y: 398 }
   ```
7. **重新打开 Dock**
8. **验证位置：** Dock 应该出现在 (1334, 398) ✅

### 预期结果

✅ 拖动后的位置被正确保存  
✅ 关闭 Dock 时不会被旧数据覆盖  
✅ 重新打开 Dock 时出现在正确位置  
✅ 完整重启应用后位置正确  

### 快速验证脚本

```javascript
// 测试多窗口数据同步
async function testMultiWindowSync() {
  console.log('='.repeat(60));
  console.log('🧪 多窗口数据同步测试');
  console.log('='.repeat(60));
  
  const dockStore = useDockStore();
  
  // 1. 当前 store 状态
  console.log('\n📊 主窗口 store 状态:');
  console.log('位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
  
  // 2. localStorage 状态
  const stored = JSON.parse(localStorage.getItem('aurora-dock-settings'));
  console.log('\n💾 localStorage 状态:');
  console.log('位置:', { x: stored.x, y: stored.y });
  
  // 3. 对比
  console.log('\n🔍 数据对比:');
  if (dockStore.settings.x === stored.x && dockStore.settings.y === stored.y) {
    console.log('✅ store 和 localStorage 数据一致');
  } else {
    console.log('❌ 数据不一致！');
    console.log('store:', { x: dockStore.settings.x, y: dockStore.settings.y });
    console.log('localStorage:', { x: stored.x, y: stored.y });
    console.log('\n这是正常的！这就是为什么需要在 toggleDock 中重新加载。');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('现在请拖动 Dock，然后在主窗口关闭它');
  console.log('观察控制台日志，应该看到 "从 localStorage 加载最新位置"');
  console.log('='.repeat(60));
}

// 运行测试
testMultiWindowSync();
```

## 为什么这样修复有效

### 数据流向

**修复前（有问题）：**
```
Dock 窗口      主窗口        localStorage
   ↓             ↓               ↓
拖动保存    (未更新)         新位置 ✅
   ↓             ↓               ↓
  ...        关闭保存         旧位置 ❌ ← 被覆盖
```

**修复后（正确）：**
```
Dock 窗口      主窗口              localStorage
   ↓             ↓                   ↓
拖动保存    (未更新)             新位置 ✅
   ↓             ↓                   ↓
  ...      1. 先重新加载 ← 同步     新位置
           2. 再保存     → 保存     新位置 ✅ ← 保持正确
```

### 关键点

1. **单一数据源** - localStorage 是唯一的真实数据源
2. **主动同步** - 在关键操作前主动从数据源重新加载
3. **保证一致性** - 确保保存的总是最新的数据

## 其他可能的解决方案（未采用）

### 方案 A：只保存 enabled 字段

```typescript
function saveEnabledOnly(enabled: boolean) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const current = stored ? JSON.parse(stored) : {};
  current.enabled = enabled;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
```

**缺点：** 如果用户在关闭 Dock 的同时修改了其他设置（如透明度），这些修改会丢失。

### 方案 B：使用跨窗口消息通信

```typescript
// Dock 窗口
window.parent.postMessage({ type: 'dock-position-changed', x, y }, '*');

// 主窗口
window.addEventListener('message', (e) => {
  if (e.data.type === 'dock-position-changed') {
    dockStore.settings.x = e.data.x;
    dockStore.settings.y = e.data.y;
  }
});
```

**缺点：** 增加了代码复杂度，而且 Dock 窗口和主窗口不是父子关系。

### 方案 C：使用 Tauri 的事件系统

```typescript
// Dock 窗口
emit('dock-position-changed', { x, y });

// 主窗口
listen('dock-position-changed', (event) => {
  dockStore.settings.x = event.payload.x;
  dockStore.settings.y = event.payload.y;
});
```

**缺点：** 需要维护事件监听器，增加代码复杂度。

### 为什么选择当前方案

1. ✅ **简单直接** - 只需在一个地方修改
2. ✅ **不增加复杂度** - 不需要新的通信机制
3. ✅ **可靠** - localStorage 是唯一数据源，最可靠
4. ✅ **适用范围广** - 解决所有字段的同步问题，不仅是位置

## 修改的文件

**`src/stores/dockStore.ts`**
- ✅ 修改 `toggleDock()` 函数
- ✅ 添加"从 localStorage 重新加载"逻辑
- ✅ 增强日志输出

## 相关问题和修复

1. **[Dock 配置持久化修复](./Dock配置持久化修复.md)** - 初始加载问题
2. **[Dock 关闭时位置修复](./Dock关闭时位置修复验证.md)** - watch 触发问题
3. **[Dock 多窗口数据冲突](./Dock多窗口数据冲突修复.md)** - 本次修复（多窗口同步）

## 技术要点

1. **多窗口应用的数据一致性** - 每个窗口有独立的 store 实例
2. **localStorage 作为单一数据源** - 在关键操作时重新加载
3. **主动同步 vs 被动监听** - 主动同步更可靠
4. **详细日志的重要性** - 帮助快速定位问题

## 更新时间

- **2025-11-02 21:30** - 识别多窗口数据冲突问题
- **2025-11-02 21:45** - 实现"重新加载后保存"方案
- **2025-11-02 22:00** - 完成测试和文档

## 致谢

感谢用户提供的详细日志，清晰地显示了数据被覆盖的过程，帮助快速定位问题！🎉

