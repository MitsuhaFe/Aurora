# Dock 关闭时位置修复验证指南

## 问题回顾

**原问题：**
- 拖动 Dock 后，位置正确保存 ✅
- 但关闭 Dock 栏后，保存的位置被重置 ❌
- 直接清理程序再启动，保存的坐标生效 ✅

**问题原因：**
在关闭/打开 Dock 时，`settings.value.enabled` 的变化触发了 `watch` 监听器，导致在切换过程中执行了不必要的保存，可能覆盖了正确的位置。

## 修复方案

在 `toggleDock()` 函数中，切换 Dock 开关时暂时禁用 watch 监听器：

1. **切换开始** → 设置 `isLoadingSettings = true`（禁用 watch）
2. **执行切换** → 开启/关闭 Dock 窗口
3. **手动保存** → 调用一次 `saveSettings()`（确保 enabled 状态被保存）
4. **恢复监听** → 200ms 后重新启用 watch

## 测试步骤

### 第 1 步：拖动并保存位置

1. 启动应用，打开 Dock
2. 拖动 Dock 到新位置（例如屏幕左侧）
3. 观察控制台日志：

```
🖱️ 开始拖动 Dock...
✅ 拖动结束，保存位置...
📍 保存 Dock 位置: { x: 500, y: 900 }
💾 保存设置到 localStorage: { 位置: { x: 500, y: 900 }, ... }
✅ 设置已保存
💾 位置已保存: 500, 900
```

4. 记录保存的位置（例如 x: 500, y: 900）

### 第 2 步：关闭 Dock 并检查

1. 在设置中点击"显示 Dock 栏"开关，关闭 Dock
2. 观察控制台日志：

```
🔄 [toggleDock] 切换 Dock 状态: 关闭
📍 [toggleDock] 切换前的位置: { x: 500, y: 900 }
⏭️ 正在加载设置，跳过自动保存  ← 重要！watch 被禁用
🔒 [closeDockWindow] 关闭前的位置: { x: 500, y: 900 }
✅ [closeDockWindow] Dock 窗口已关闭
📍 [closeDockWindow] 位置保持为: { x: 500, y: 900 }
📍 [toggleDock] 切换后的位置: { x: 500, y: 900 }
💾 [toggleDock] 切换完成，保存状态  ← 手动保存一次
💾 保存设置到 localStorage: { 位置: { x: 500, y: 900 }, enabled: false, ... }
✅ 设置已保存
✅ [toggleDock] watch 已重新启用
```

**关键检查点：**
- ✅ 所有位置日志都显示 500, 900（你拖动到的位置）
- ✅ 看到 "⏭️ 正在加载设置，跳过自动保存"（watch 被禁用）
- ✅ 看到 "💾 [toggleDock] 切换完成，保存状态"（手动保存）

3. 在控制台验证 localStorage：

```javascript
const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('关闭后 localStorage 中的位置:', { x: saved.x, y: saved.y });
// 应该显示：{ x: 500, y: 900 }
```

**预期结果：** ✅ 位置仍然是 500, 900（没有被重置为 -1）

### 第 3 步：重新打开 Dock 验证位置

1. 在设置中再次点击"显示 Dock 栏"开关，打开 Dock
2. 观察控制台日志：

```
🔄 [toggleDock] 切换 Dock 状态: 开启
📍 [toggleDock] 切换前的位置: { x: 500, y: 900 }
⏭️ 正在加载设置，跳过自动保存  ← watch 被禁用
🪟 [createDockWindow] 从 settings 读取的位置: { x: 500, y: 900, 是否为默认标记: false }
✅ [createDockWindow] 使用保存的位置: { x: 500, y: 900 }
Dock 窗口创建成功
📍 [toggleDock] 切换后的位置: { x: 500, y: 900 }
💾 [toggleDock] 切换完成，保存状态
✅ [toggleDock] watch 已重新启用
```

**关键检查点：**
- ✅ 创建窗口时使用保存的位置（不是默认位置）
- ✅ Dock 出现在你之前拖动到的位置

3. 验证 Dock 的实际位置：

**预期结果：** ✅ Dock 出现在上次拖动到的位置（屏幕左侧）

### 第 4 步：完整的关闭/重启测试

1. 关闭 Dock（在设置中）
2. **关闭整个应用**
3. **重新启动应用**
4. 打开设置
5. 开启"显示 Dock 栏"

**预期结果：** ✅ Dock 仍然出现在你拖动到的位置

## 对比：修复前 vs 修复后

### 修复前（问题）

```
拖动 Dock → 位置保存为 { x: 500, y: 900 }
   ↓
关闭 Dock → settings.value.enabled = false
   ↓
watch 触发 → saveSettings() ← 可能此时位置已被重置
   ↓
localStorage 被覆盖为 { x: -1, y: -1 } ❌
   ↓
重新打开 → 使用默认位置 ❌
```

### 修复后（正确）

```
拖动 Dock → 位置保存为 { x: 500, y: 900 }
   ↓
关闭 Dock → isLoadingSettings = true (禁用 watch)
   ↓
settings.value.enabled = false → watch 被跳过 ✅
   ↓
closeDockWindow() → 关闭窗口，位置保持 { x: 500, y: 900 }
   ↓
手动保存 → saveSettings() 保存正确的位置和 enabled 状态
   ↓
localStorage 保持为 { x: 500, y: 900, enabled: false } ✅
   ↓
重新打开 → 使用保存的位置 { x: 500, y: 900 } ✅
```

## 快速验证脚本

复制以下脚本到控制台，进行完整测试：

```javascript
async function testDockToggle() {
  console.log('='.repeat(60));
  console.log('🧪 Dock 关闭/打开位置测试');
  console.log('='.repeat(60));
  
  const dockStore = useDockStore();
  
  // 1. 检查当前位置
  console.log('\n📍 步骤 1：当前状态');
  console.log('store 中的位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
  console.log('Dock 是否开启:', dockStore.settings.enabled);
  
  const saved1 = JSON.parse(localStorage.getItem('aurora-dock-settings'));
  console.log('localStorage 中的位置:', { x: saved1.x, y: saved1.y });
  
  // 2. 关闭 Dock
  console.log('\n🔴 步骤 2：关闭 Dock');
  console.log('即将关闭 Dock，请观察控制台日志...');
  
  await new Promise(resolve => {
    console.log('请在设置中关闭 Dock，然后按回车继续...');
    // 用户需要手动关闭 Dock
    // 这里暂停，等待用户操作
  });
  
  // 3. 检查关闭后的状态
  console.log('\n📊 步骤 3：关闭后检查');
  console.log('store 中的位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
  
  const saved2 = JSON.parse(localStorage.getItem('aurora-dock-settings'));
  console.log('localStorage 中的位置:', { x: saved2.x, y: saved2.y });
  
  // 4. 对比
  if (saved1.x === saved2.x && saved1.y === saved2.y) {
    console.log('✅ 位置保持一致！修复成功！');
  } else {
    console.log('❌ 位置被修改了！');
    console.log('变化:', {
      x: `${saved1.x} → ${saved2.x}`,
      y: `${saved1.y} → ${saved2.y}`
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('现在请重新打开 Dock，检查位置是否正确');
  console.log('='.repeat(60));
}

// 使用说明
console.log('使用方法：');
console.log('1. 确保 Dock 已打开并拖动到新位置');
console.log('2. 运行：testDockToggle()');
console.log('3. 按照提示进行测试');
```

## 成功标志

如果修复成功，你应该看到：

✅ **关闭 Dock 时：**
- 位置保持不变（不会变成 -1）
- localStorage 中保存的位置正确

✅ **重新打开 Dock 时：**
- Dock 出现在上次拖动到的位置
- 不会回到默认位置（屏幕底部居中）

✅ **完整重启后：**
- Dock 位置仍然正确
- 所有设置都正确恢复

## 如果仍有问题

如果测试失败，请：

1. **截图控制台日志** - 特别是关闭和打开 Dock 时的日志
2. **运行以下命令并提供输出：**

```javascript
// 检查 store 和 localStorage
const dockStore = useDockStore();
console.log('store:', { x: dockStore.settings.x, y: dockStore.settings.y });

const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('localStorage:', { x: saved.x, y: saved.y });

// 运行验证
dockStore.verifySettings();
```

3. **描述操作步骤和实际结果**

## 相关文档

- [Dock 关闭时位置追踪](./Dock关闭时位置追踪.md) - 详细的问题分析
- [如何调试 Dock 位置问题](./如何调试Dock位置问题.md) - 调试指南
- [Dock 配置持久化修复](./Dock配置持久化修复.md) - 技术实现

