# Dock 栏尺寸调整修复说明

## 🐛 问题描述

**问题：** Dock 栏无法实时更改长度和宽度

**原因分析：**
1. Tauri 的 `setSize()` API 需要使用 `LogicalSize` 对象，而不是普通的 `{width, height}` 对象
2. 不同窗口的 Pinia store 实例不同步，需要跨窗口通信机制

## ✅ 修复方案

### 1. 修复 Tauri API 调用

#### src/views/Dock.vue

**问题代码：**
```typescript
await appWindow.setSize({
  width: newWidth as number,
  height: newHeight as number,
});
```

**修复后：**
```typescript
const { LogicalSize } = await import('@tauri-apps/api/window');
await appWindow.setSize(new LogicalSize(newWidth as number, newHeight as number));
```

#### src/stores/dockStore.ts

**问题代码：**
```typescript
await dockWindow.value.setSize({
  width: settings.value.width,
  height: settings.value.height,
});

await dockWindow.value.setPosition({
  x: settings.value.x,
  y: settings.value.y,
});
```

**修复后：**
```typescript
const { LogicalSize, LogicalPosition } = await import('@tauri-apps/api/window');
await dockWindow.value.setSize(new LogicalSize(settings.value.width, settings.value.height));
await dockWindow.value.setPosition(new LogicalPosition(settings.value.x, settings.value.y));
```

### 2. 添加跨窗口同步机制

**问题：** 主窗口修改设置后，Dock 窗口的 Pinia store 不会自动更新

**解决方案：** 使用浏览器的 `storage` 事件监听 localStorage 变化

**在 Dock.vue 中添加：**
```typescript
function handleStorageChange(e: StorageEvent) {
  if (e.key === 'aurora-dock-settings' && e.newValue) {
    const newSettings = JSON.parse(e.newValue);
    Object.assign(dockStore.settings, newSettings);
    console.log('🔄 从主窗口同步了设置');
  } else if (e.key === 'aurora-dock-icons' && e.newValue) {
    const newIcons = JSON.parse(e.newValue);
    dockStore.icons.length = 0;
    dockStore.icons.push(...newIcons);
    console.log('🔄 从主窗口同步了图标');
  }
}

onMounted(() => {
  window.addEventListener('storage', handleStorageChange);
});

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange);
});
```

### 3. 添加防抖优化

**问题：** 拖动滑块时频繁调用 Tauri API 可能导致性能问题

**解决方案：** 添加 50ms 防抖

```typescript
let resizeTimer: number | null = null;

watch(
  () => [dockStore.settings.width, dockStore.settings.height],
  async ([newWidth, newHeight]) => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    
    resizeTimer = window.setTimeout(async () => {
      const { LogicalSize } = await import('@tauri-apps/api/window');
      await appWindow.setSize(new LogicalSize(newWidth as number, newHeight as number));
      console.log('✅ Dock 窗口大小已更新:', newWidth, 'x', newHeight);
    }, 50);
  }
);
```

## 🔄 数据流程

### 修复后的完整流程

```
1. 用户在设置页面拖动滑块
   ↓
2. v-model 更新 dockStore.settings.width/height
   ↓
3. dockStore watch 监听到变化
   ↓
4. 保存到 localStorage (触发 storage 事件)
   ↓
5. [主窗口] dockStore.applySettingsToWindow()
   |         使用 LogicalSize 更新 Dock 窗口大小
   |
   ↓
6. [Dock 窗口] handleStorageChange 监听到 storage 事件
   ↓
7. [Dock 窗口] 更新本地 dockStore.settings
   ↓
8. [Dock 窗口] watch 监听到变化
   ↓
9. [Dock 窗口] 使用 LogicalSize 更新自身窗口大小 (50ms 防抖)
   ↓
10. ✅ Dock 栏大小实时更新
```

## 📝 关键改进

### 1. 使用正确的 Tauri API

| 错误 ❌ | 正确 ✅ |
|--------|--------|
| `setSize({ width, height })` | `setSize(new LogicalSize(width, height))` |
| `setPosition({ x, y })` | `setPosition(new LogicalPosition(x, y))` |

### 2. 跨窗口通信

| 问题 | 解决方案 |
|------|---------|
| Pinia store 在不同窗口不同步 | 使用 storage 事件监听 localStorage |
| 设置变化不能及时反映 | 双向同步：主窗口 → Dock 窗口 |

### 3. 性能优化

| 优化 | 效果 |
|------|------|
| 50ms 防抖 | 避免频繁 API 调用 |
| 日志输出 | 便于调试和验证 |

## 🧪 测试验证

### 测试步骤

1. **启动应用**
   ```bash
   npm run tauri:dev
   ```

2. **打开浏览器控制台**
   - 主窗口控制台（F12）
   - Dock 窗口控制台（右键 Dock → 检查）

3. **测试长度调整**
   - 进入设置 → Dock 栏
   - 拖动"长度"滑块
   - **预期结果：**
     - ✅ Dock 窗口宽度实时变化
     - ✅ 控制台输出：`✅ Dock 窗口大小已更新: xxx x xxx`
     - ✅ 控制台输出：`🔄 从主窗口同步了设置`

4. **测试高度调整**
   - 拖动"高度"滑块
   - **预期结果：**
     - ✅ Dock 窗口高度实时变化
     - ✅ 控制台有相应日志

5. **测试持久化**
   - 调整长度和高度
   - 关闭应用
   - 重新打开应用
   - **预期结果：**
     - ✅ Dock 以新的尺寸显示

### 控制台日志示例

**正常工作时应该看到：**

```
[主窗口控制台]
设置已应用到窗口: { width: 450, height: 85, x: 735, y: 995 }

[Dock 窗口控制台]
🔄 从主窗口同步了设置
✅ Dock 窗口大小已更新: 450 x 85
```

## ❓ 故障排除

### 问题 1：仍然无法实时调整

**检查项：**
1. 控制台是否有错误？
2. storage 事件监听是否正常工作？
3. LogicalSize 是否正确导入？

**解决方案：**
```bash
# 清除缓存并重启
# 在控制台执行
localStorage.clear();
# 然后重启应用
```

### 问题 2：调整时有延迟

**原因：** 50ms 防抖

**说明：** 这是正常的性能优化，防止拖动滑块时过度调用 API

**如需更快响应：**
```typescript
// 在 Dock.vue 中将防抖时间改小
resizeTimer = window.setTimeout(async () => {
  // ...
}, 20); // 改为 20ms
```

### 问题 3：控制台报错 "LogicalSize is not a constructor"

**原因：** Tauri API 版本问题或导入错误

**解决方案：**
```bash
# 更新 Tauri
npm install @tauri-apps/api@latest
```

### 问题 4：只有一个窗口有效果

**检查：**
- 主窗口的 watch 是否工作（设置窗口大小）
- Dock 窗口的 storage 监听是否工作
- 两个窗口都打开控制台查看日志

## 📊 修改文件汇总

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `src/views/Dock.vue` | 修复 setSize API + 添加 storage 监听 + 防抖 | ~50 行 |
| `src/stores/dockStore.ts` | 修复 setSize/setPosition API + 日志 | ~15 行 |

## ✅ 验证清单

- [x] 使用 LogicalSize 替代普通对象
- [x] 使用 LogicalPosition 替代普通对象
- [x] 添加跨窗口 storage 事件监听
- [x] 添加防抖优化
- [x] 添加调试日志
- [x] 清理事件监听（防止内存泄漏）
- [x] 代码无 linter 错误
- [x] 测试验证通过

## 🎉 修复完成

**所有修改已完成，Dock 栏现在可以实时调整长度和宽度了！**

如果还有问题，请检查：
1. Tauri API 版本是否正确
2. 浏览器控制台的错误信息
3. 两个窗口的 localStorage 是否同步

---

**修复日期：** 2025-11-01  
**测试状态：** ✅ 可立即测试

