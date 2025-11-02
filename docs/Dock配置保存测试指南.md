# Dock 配置保存测试指南

## 快速测试步骤

### 1. 测试位置保存

```
✅ 操作步骤：
1. 打开应用，确保 Dock 显示
2. 拖动 Dock 到屏幕的任意位置
3. 观察控制台，应该看到：
   📍 保存 Dock 位置: { x: xxx, y: yyy }
   💾 保存设置到 localStorage: { ... }
4. 关闭应用
5. 重新打开应用
6. 观察控制台，应该看到：
   📂 从 localStorage 加载设置: { 位置: { x: xxx, y: yyy }, ... }
7. Dock 应该出现在上次拖动到的位置

❌ 如果 Dock 没有出现在正确位置：
- 打开控制台，运行：useDockStore().verifySettings()
- 查看输出，检查位置是否匹配
```

### 2. 测试所有设置保存

```
✅ 操作步骤：
1. 打开设置页面
2. 修改以下设置（建议修改成明显不同的值）：
   □ 关闭"显示 Dock 栏"
   □ 关闭"始终置顶"
   □ 开启"自动隐藏"
   □ 开启"固定位置"
   □ 修改长度为 800px
   □ 修改高度为 120px
   □ 修改透明度为 50%
   □ 修改圆角值为 40px
   □ 修改背景色为 #667eea（紫色）
   □ 关闭"阴影效果"
   □ 关闭"毛玻璃效果"
   □ 修改图标大小为 80px
   □ 修改图标透明度为 60%
   □ 修改悬浮动画为"缩放"
3. 每次修改后，观察控制台应该看到：
   📝 设置已变化，触发自动保存
   💾 保存设置到 localStorage: { ... }
4. 关闭应用
5. 重新打开应用
6. 打开设置页面
7. 检查所有设置是否恢复到上次修改的值

❌ 如果设置没有恢复：
- 在控制台运行：useDockStore().verifySettings()
- 查看哪些字段不匹配
```

### 3. 测试首次启动（重置测试）

```
✅ 操作步骤：
1. 打开浏览器控制台（F12）
2. 运行以下命令清除所有设置：
   localStorage.clear()
   location.reload()
3. 应用会重新加载
4. 观察控制台，应该看到：
   📂 localStorage 中没有保存的设置，使用默认值
   ✅ Dock Store 已加载设置: { enabled: true, width: 400, height: 80 }
5. Dock 应该使用默认设置（屏幕底部居中，400x80）

✅ 这表示默认值正常工作
```

## 控制台命令参考

### 查看当前设置

```javascript
// 方法 1：使用 store
const dockStore = useDockStore();
console.log('当前设置:', dockStore.settings);

// 方法 2：直接查看 localStorage
console.log('保存的设置:', JSON.parse(localStorage.getItem('aurora-dock-settings')));
```

### 验证设置一致性

```javascript
const dockStore = useDockStore();
dockStore.verifySettings();

// 输出示例：
// 🔍 localStorage 中的设置: { enabled: true, x: 100, y: 900, ... }
// 🔍 当前 store 中的设置: { enabled: true, x: 100, y: 900, ... }
// ✅ localStorage 和 store 中的设置完全一致
```

### 手动保存设置

```javascript
const dockStore = useDockStore();
dockStore.saveSettings();

// 输出：
// 💾 保存设置到 localStorage: { ... }
// ✅ 设置已保存
```

### 手动加载设置

```javascript
const dockStore = useDockStore();
dockStore.loadSettings();

// 输出：
// 📂 从 localStorage 加载设置: { 位置: { x: xxx, y: yyy }, ... }
```

### 清除所有设置

```javascript
// 清除 Dock 设置
localStorage.removeItem('aurora-dock-settings');
localStorage.removeItem('aurora-dock-icons');

// 刷新页面
location.reload();
```

### 修改特定设置（手动测试）

```javascript
const dockStore = useDockStore();

// 修改位置
dockStore.settings.x = 500;
dockStore.settings.y = 500;

// 修改大小
dockStore.settings.width = 600;
dockStore.settings.height = 100;

// 修改透明度
dockStore.settings.opacity = 0.5;

// 手动保存
dockStore.saveSettings();

// 验证
dockStore.verifySettings();
```

## 常见问题排查

### 问题 1：设置没有保存

**症状：** 修改设置后，重启应用，设置恢复成默认值

**排查步骤：**

1. 打开控制台，修改一个设置
2. 检查是否看到 "📝 设置已变化，触发自动保存"
3. 如果没有看到，说明 watch 没有触发
4. 运行以下命令检查：
   ```javascript
   const dockStore = useDockStore();
   console.log('当前设置:', dockStore.settings);
   console.log('localStorage:', localStorage.getItem('aurora-dock-settings'));
   ```
5. 如果 localStorage 是 `null`，说明保存失败
6. 手动保存并验证：
   ```javascript
   dockStore.saveSettings();
   dockStore.verifySettings();
   ```

### 问题 2：位置没有保存

**症状：** 拖动 Dock 后，重启应用，Dock 回到默认位置

**排查步骤：**

1. 拖动 Dock 到新位置
2. 检查控制台是否看到 "📍 保存 Dock 位置"
3. 如果没有看到，检查 Dock.vue 中的 savePosition 调用
4. 手动验证位置：
   ```javascript
   const dockStore = useDockStore();
   console.log('当前位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
   
   const stored = JSON.parse(localStorage.getItem('aurora-dock-settings'));
   console.log('保存的位置:', { x: stored.x, y: stored.y });
   ```

### 问题 3：设置保存了但没有加载

**症状：** 控制台显示保存成功，但重启后设置还是默认值

**排查步骤：**

1. 重启应用
2. 检查控制台，应该看到：
   ```
   📂 从 localStorage 加载设置: { ... }
   ✅ Dock Store 已加载设置: { ... }
   ```
3. 如果没有看到，说明加载失败
4. 检查是否有错误日志：
   ```
   ❌ 加载 Dock 设置失败: Error: ...
   ```
5. 验证 localStorage 数据是否损坏：
   ```javascript
   try {
     const data = JSON.parse(localStorage.getItem('aurora-dock-settings'));
     console.log('数据有效:', data);
   } catch (error) {
     console.error('数据损坏:', error);
   }
   ```

### 问题 4：某些设置保存了，某些没有

**症状：** 部分设置能保存，部分设置不能保存

**排查步骤：**

1. 使用验证函数检查：
   ```javascript
   const result = useDockStore().verifySettings();
   console.log('匹配结果:', result);
   ```
2. 查看哪些字段不匹配：
   ```
   ⚠️ 字段不匹配: opacity { localStorage: 0.5, store: 0.95 }
   ```
3. 检查是否有代码在加载后又修改了设置
4. 检查是否有其他地方调用了 loadSettings()

## 日志输出参考

### 正常的启动日志

```
📂 从 localStorage 加载设置: { 位置: { x: 960, y: 1020 }, 尺寸: { width: 400, height: 80 }, enabled: true, 透明度: 0.95, 阴影: true, 毛玻璃: true }
⏭️ 正在加载设置，跳过自动保存
✅ Dock Store 已加载设置: { enabled: true, width: 400, height: 80 }
Aurora 应用已启动
Dock 窗口创建成功
```

### 正常的设置修改日志

```
📝 设置已变化，触发自动保存
💾 保存设置到 localStorage: { 位置: { x: 960, y: 1020 }, 尺寸: { width: 600, height: 80 }, enabled: true, 透明度: 0.95, 阴影: true, 毛玻璃: true }
✅ 设置已保存
```

### 正常的位置保存日志

```
📍 保存 Dock 位置: { x: 500, y: 900 }
💾 保存设置到 localStorage: { 位置: { x: 500, y: 900 }, 尺寸: { width: 600, height: 80 }, ... }
✅ 设置已保存
📝 设置已变化，触发自动保存
💾 保存设置到 localStorage: { ... }
✅ 设置已保存
```

注意：位置保存会触发两次保存（一次是 savePosition 手动调用，一次是 watch 触发），这是正常的。

## 总结

通过以上测试，你可以：

✅ **验证位置保存** - 拖动 Dock 后重启，位置正确恢复  
✅ **验证设置保存** - 修改所有设置后重启，设置正确恢复  
✅ **验证首次启动** - 清除设置后，使用默认值  
✅ **验证一致性** - localStorage 和 store 中的数据一致  

如果以上所有测试都通过，说明配置持久化功能工作正常！✨

