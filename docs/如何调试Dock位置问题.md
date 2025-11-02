# 如何调试 Dock 位置问题

## 问题描述

如果你遇到以下问题：
- ❌ Dock 每次启动都在固定的位置（默认位置）
- ❌ 拖动 Dock 后，重启应用，位置没有恢复
- ❌ 保存的位置好像没有被使用

请按照以下步骤调试。

## 快速诊断（推荐）

### 方法 1：使用自动诊断脚本

1. 打开应用
2. 按 `F12` 打开浏览器控制台
3. 复制 `docs/Dock位置调试脚本.js` 中的全部内容
4. 粘贴到控制台并按回车
5. 查看诊断结果

脚本会自动检查：
- ✅ localStorage 中是否保存了位置
- ✅ store 中的位置是否正确
- ✅ 窗口实际位置是否匹配
- ✅ 给出具体的问题原因和解决方案

### 方法 2：手动检查关键日志

重启应用并观察控制台，应该看到以下日志顺序：

```
1. 加载设置：
   📂 从 localStorage 加载设置: { 位置: { x: xxx, y: yyy }, ... }
   ✅ Dock Store 已加载设置: { 位置: { x: xxx, y: yyy }, ... }

2. 创建窗口：
   🪟 [createDockWindow] 从 settings 读取的位置: { x: xxx, y: yyy, 是否为默认标记: false }
   ✅ [createDockWindow] 使用保存的位置: { x: xxx, y: yyy }
   Dock 窗口创建成功
```

**如果看到的是：**
```
🪟 [createDockWindow] 从 settings 读取的位置: { x: -1, y: -1, 是否为默认标记: true }
🎯 [createDockWindow] 首次启动，计算默认位置: { x: 960, y: 1020, ... }
```

说明位置被重置为默认值了。

## 常见问题及解决方案

### 问题 1：拖动后位置没有保存

**检查方法：**
拖动 Dock 后，控制台应该显示：

```
🖱️ 开始拖动 Dock...
✅ 拖动结束，保存位置...
📍 保存 Dock 位置: { x: xxx, y: yyy }
💾 保存设置到 localStorage: { 位置: { x: xxx, y: yyy }, ... }
✅ 设置已保存
💾 位置已保存: xxx, yyy
```

**如果看不到这些日志：**
- 检查是否开启了"固定位置"（固定后无法拖动）
- 检查是否点击在图标上（图标不响应拖动）
- 检查 `Dock.vue` 中的 `handleMouseDown` 函数

### 问题 2：保存了但加载时变成 -1

**检查方法：**

在控制台运行：
```javascript
JSON.parse(localStorage.getItem('aurora-dock-settings'))
```

查看 `x` 和 `y` 的值。

**如果 x 和 y 是正确的数字：**
- localStorage 保存正常
- 问题在于加载时被重置

**如果 x 和 y 是 -1：**
- 说明保存时就是 -1
- 检查 `savePosition()` 函数

### 问题 3：加载正常但创建窗口时变成 -1

**现象：**
- 加载日志显示正确的位置
- 但创建窗口时显示 x: -1, y: -1

**原因：**
在加载和创建窗口之间，某处代码修改了位置。

**解决方法：**
查看完整的控制台日志，找出在哪里位置被修改。

## 快速命令参考

### 查看保存的位置

```javascript
const saved = JSON.parse(localStorage.getItem('aurora-dock-settings'));
console.log('保存的位置:', { x: saved.x, y: saved.y });
```

### 查看 store 中的位置

```javascript
const dockStore = useDockStore();
console.log('store 位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
```

### 查看窗口实际位置

```javascript
const dockStore = useDockStore();
if (dockStore.dockWindow) {
  const pos = await dockStore.dockWindow.outerPosition();
  console.log('窗口位置:', pos);
}
```

### 验证所有设置

```javascript
useDockStore().verifySettings();
```

### 手动保存当前位置

```javascript
const dockStore = useDockStore();
const pos = await dockStore.dockWindow.outerPosition();
await dockStore.savePosition(pos.x, pos.y);
console.log('已手动保存位置:', pos);
```

### 清除所有设置重新开始

```javascript
localStorage.clear();
location.reload();
```

## 预期的正常流程

### 首次启动

```
1. localStorage 中没有数据
2. 加载设置 → 使用默认值 { x: -1, y: -1 }
3. 创建窗口 → 检测到 -1 → 计算默认位置
4. 保存计算出的位置到 localStorage
```

### 拖动 Dock

```
1. 用户拖动 Dock
2. 拖动结束 → 获取窗口位置
3. 调用 savePosition(x, y)
4. 更新 settings.value.x 和 y
5. 调用 saveSettings()
6. 写入 localStorage
```

### 再次启动

```
1. 从 localStorage 加载设置
2. settings.value.x 和 y 是上次保存的位置
3. 创建窗口 → 使用保存的位置（不是 -1）
4. Dock 出现在上次的位置
```

## 联系支持

如果以上方法都无法解决问题，请：

1. 运行诊断脚本并截图输出
2. 提供完整的控制台日志
3. 说明你的操作步骤
4. 描述预期和实际结果

## 相关文档

- [Dock 位置问题排查指南](./Dock位置问题排查指南.md) - 详细的排查步骤
- [Dock 位置调试脚本](./Dock位置调试脚本.js) - 自动诊断脚本
- [Dock 配置持久化修复](./Dock配置持久化修复.md) - 技术实现细节

