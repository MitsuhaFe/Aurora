# Dock 配置持久化修复

## 更新日期
2025-11-01

## 问题描述

用户反馈多个配置持久化相关的问题：

1. **位置不保存**：每次重启 Dock 栏，位置不会恢复到关闭前的位置
2. **所有设置不保存**：重启后所有设置都会恢复成默认配置，包括：
   - 置顶、自动隐藏、固定位置
   - Dock 栏长度、高度、透明度、圆角值、背景色
   - 阴影效果、毛玻璃效果
   - 图标大小、图标透明度
   - 图标动画效果

**预期行为：** 所有设置修改后应该自动保存，重启应用后恢复到最后一次的配置状态。

## 问题根源

### 1. watch 监听器在加载时触发保存

**问题分析：**

```typescript
// Store 创建流程
export const useDockStore = defineStore('dock', () => {
  const settings = ref<DockSettings>({ /* 默认值 */ });
  
  // 1. 注册 watch 监听器
  watch(settings, () => {
    saveSettings(); // ❌ 会在 settings 变化时立即触发
  }, { deep: true });
  
  // 2. 加载保存的设置
  loadSettings(); // 这会修改 settings.value
  //  ↓
  //  触发 watch → 调用 saveSettings()
  //  ↓
  //  可能覆盖刚加载的数据！
  
  return { settings, /* ... */ };
});
```

**时间线：**

```
1. Store 创建
   ├─> settings.value = 默认值
   └─> 注册 watch 监听器

2. loadSettings() 执行
   ├─> 从 localStorage 读取保存的设置
   └─> settings.value = 保存的设置 ✅

3. watch 触发（因为 settings 变化）
   └─> saveSettings() 被调用
         ↓
         可能在某些情况下覆盖了刚加载的数据 ❌
```

### 2. 缺少调试信息

原始代码缺少关键的日志输出，导致难以追踪：
- 什么时候加载了设置？
- 什么时候保存了设置？
- 保存的内容是什么？
- 位置是否正确保存？

## 解决方案

### 1. 添加加载标志防止重复保存

**实现：** 使用 `isLoadingSettings` 标志

```typescript
// 标志：是否正在加载设置
let isLoadingSettings = false;

function loadSettings() {
  isLoadingSettings = true; // ✨ 设置标志
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      settings.value = { ...settings.value, ...parsed };
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  } finally {
    // 延迟重置标志，确保 watch 不会在加载过程中触发
    setTimeout(() => {
      isLoadingSettings = false;
    }, 100);
  }
}

watch(
  settings,
  async (newSettings, oldSettings) => {
    // ✨ 如果正在加载设置，跳过保存
    if (isLoadingSettings) {
      console.log('⏭️ 正在加载设置，跳过自动保存');
      return;
    }
    
    console.log('📝 设置已变化，触发自动保存');
    saveSettings();
    // ...
  },
  { deep: true }
);
```

**工作原理：**

```
1. loadSettings() 开始
   └─> isLoadingSettings = true

2. 修改 settings.value
   └─> watch 触发
         ├─> 检查 isLoadingSettings === true
         └─> 跳过保存 ✅

3. loadSettings() 结束
   └─> 100ms 后 isLoadingSettings = false

4. 后续的设置修改
   └─> watch 触发
         ├─> 检查 isLoadingSettings === false
         └─> 正常保存 ✅
```

### 2. 添加详细的调试日志

#### loadSettings 日志

```typescript
function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('📂 从 localStorage 加载设置:', {
        位置: { x: parsed.x, y: parsed.y },
        尺寸: { width: parsed.width, height: parsed.height },
        enabled: parsed.enabled,
        透明度: parsed.opacity,
        阴影: parsed.hasShadow,
        毛玻璃: parsed.hasGlassEffect
      });
      // ...
    } else {
      console.log('📂 localStorage 中没有保存的设置，使用默认值');
    }
  } catch (error) {
    console.error('❌ 加载设置失败:', error);
  }
}
```

#### saveSettings 日志

```typescript
function saveSettings() {
  try {
    console.log('💾 保存设置到 localStorage:', {
      位置: { x: settings.value.x, y: settings.value.y },
      尺寸: { width: settings.value.width, height: settings.value.height },
      enabled: settings.value.enabled,
      透明度: settings.value.opacity,
      阴影: settings.value.hasShadow,
      毛玻璃: settings.value.hasGlassEffect
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    localStorage.setItem(ICONS_KEY, JSON.stringify(icons.value));
    console.log('✅ 设置已保存');
  } catch (error) {
    console.error('❌ 保存设置失败:', error);
  }
}
```

#### savePosition 日志

```typescript
async function savePosition(x: number, y: number) {
  console.log('📍 保存 Dock 位置:', { x, y });
  settings.value.x = x;
  settings.value.y = y;
  saveSettings();
}
```

### 3. 添加验证函数

新增 `verifySettings()` 函数，用于对比 localStorage 和 store 中的设置：

```typescript
function verifySettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('🔍 localStorage 中的设置:', parsed);
      console.log('🔍 当前 store 中的设置:', settings.value);
      
      // 比较关键字段
      const keys: (keyof DockSettings)[] = ['enabled', 'x', 'y', 'width', 'height', 'opacity', 'backgroundColor', 'hasShadow', 'hasGlassEffect', 'iconSize', 'iconOpacity'];
      let allMatch = true;
      
      keys.forEach(key => {
        if (parsed[key] !== settings.value[key]) {
          console.warn(`⚠️ 字段不匹配: ${key}`, {
            localStorage: parsed[key],
            store: settings.value[key]
          });
          allMatch = false;
        }
      });
      
      if (allMatch) {
        console.log('✅ localStorage 和 store 中的设置完全一致');
      } else {
        console.warn('⚠️ localStorage 和 store 中的设置存在差异');
      }
      
      return { stored: parsed, current: settings.value, match: allMatch };
    } else {
      console.log('❌ localStorage 中没有保存的设置');
      return null;
    }
  } catch (error) {
    console.error('❌ 验证设置失败:', error);
    return null;
  }
}
```

**使用方法：**

在浏览器控制台中：

```javascript
// 获取 store 实例
const dockStore = useDockStore();

// 验证设置
dockStore.verifySettings();
```

## 配置保存流程

### 正常的保存流程

```
用户修改设置
   ↓
settings.value 变化
   ↓
watch 监听器触发
   ├─> 检查 isLoadingSettings === false ✅
   └─> 调用 saveSettings()
         └─> 写入 localStorage
               └─> 打印日志 "💾 保存设置到 localStorage"
```

### 位置保存流程

```
用户拖动 Dock
   ↓
Dock.vue: handleMouseDown() → appWindow.startDragging()
   ↓
拖动结束
   ↓
Dock.vue: 调用 dockStore.savePosition(newX, newY)
   ↓
dockStore.savePosition()
   ├─> 打印日志 "📍 保存 Dock 位置"
   ├─> settings.value.x = newX
   ├─> settings.value.y = newY
   └─> 调用 saveSettings()
         ├─> 触发 watch（会再次保存，但无害）
         └─> 写入 localStorage
```

### 启动加载流程

```
应用启动
   ↓
Store 创建
   ├─> 定义默认值
   ├─> 注册 watch 监听器
   └─> 调用 loadSettings()
         ├─> isLoadingSettings = true
         ├─> 从 localStorage 读取
         ├─> settings.value = 保存的值
         │    └─> 触发 watch
         │          └─> 检查标志，跳过保存 ✅
         └─> 100ms 后 isLoadingSettings = false
   ↓
App.vue: onMounted()
   └─> dockStore.initialize()
         ├─> loadSettings() (再次加载，确保最新)
         └─> 如果 enabled === true
               └─> createDockWindow()
                     └─> 使用 settings.value.x 和 settings.value.y
```

## 测试验证

### 测试场景 1：位置保存

1. 启动应用，打开 Dock
2. 拖动 Dock 到新位置
3. 查看控制台：应该看到 "📍 保存 Dock 位置" 和 "💾 保存设置到 localStorage"
4. 关闭应用
5. 重新启动应用
6. 查看控制台：应该看到 "📂 从 localStorage 加载设置"，位置应该是上次保存的位置
7. Dock 应该出现在上次的位置

**预期结果：** ✅ Dock 位置正确恢复

### 测试场景 2：所有设置保存

1. 启动应用
2. 在设置中修改以下内容：
   - 关闭置顶
   - 开启自动隐藏
   - 开启固定位置
   - 修改长度为 600px
   - 修改高度为 100px
   - 修改透明度为 70%
   - 修改圆角值为 24px
   - 修改背景色为 #667eea
   - 关闭阴影效果
   - 关闭毛玻璃效果
   - 修改图标大小为 64px
   - 修改图标透明度为 80%
3. 查看控制台：每次修改都应该看到 "📝 设置已变化，触发自动保存"
4. 关闭应用
5. 重新启动应用
6. 打开设置页面，检查所有设置

**预期结果：** ✅ 所有设置都正确恢复到上次修改的值

### 测试场景 3：验证功能

1. 启动应用
2. 修改一些设置
3. 在浏览器控制台中运行：
   ```javascript
   useDockStore().verifySettings()
   ```
4. 查看输出

**预期结果：** 
```
🔍 localStorage 中的设置: { ... }
🔍 当前 store 中的设置: { ... }
✅ localStorage 和 store 中的设置完全一致
```

### 测试场景 4：首次启动

1. 清除 localStorage：
   ```javascript
   localStorage.clear()
   ```
2. 刷新页面
3. 查看控制台

**预期结果：**
```
📂 localStorage 中没有保存的设置，使用默认值
✅ Dock Store 已加载设置: { enabled: true, width: 400, height: 80 }
```

## 修改的文件

- **`src/stores/dockStore.ts`**
  - ✅ 添加 `isLoadingSettings` 标志
  - ✅ 在 `loadSettings()` 中设置和重置标志
  - ✅ 在 `watch` 中检查标志
  - ✅ 添加详细的调试日志
  - ✅ 新增 `verifySettings()` 验证函数

## 相关文档

- [Dock 栏开发需求](./Dock栏开发需求.md)
- [Dock 开关状态同步修复](./Dock开关状态同步修复.md)
- [Dock 透明度真正分离实现](./Dock透明度真正分离实现.md)

## 技术要点

1. **防止循环保存**：使用标志位防止 watch 在加载时触发
2. **延迟重置标志**：给 100ms 的缓冲时间，确保所有同步操作完成
3. **详细日志**：在关键步骤添加日志，方便调试和追踪
4. **验证函数**：提供工具函数帮助用户验证设置是否正确保存

## 调试技巧

### 1. 查看 localStorage 内容

```javascript
// 查看所有 localStorage
console.log(localStorage);

// 查看 Dock 设置
console.log(JSON.parse(localStorage.getItem('aurora-dock-settings')));

// 查看 Dock 图标
console.log(JSON.parse(localStorage.getItem('aurora-dock-icons')));
```

### 2. 清除设置重新测试

```javascript
// 清除 Dock 设置
localStorage.removeItem('aurora-dock-settings');
localStorage.removeItem('aurora-dock-icons');

// 刷新页面
location.reload();
```

### 3. 手动验证设置

```javascript
const dockStore = useDockStore();
dockStore.verifySettings();
```

### 4. 监控设置变化

```javascript
const dockStore = useDockStore();

// 监控 settings 的所有变化
watch(() => dockStore.settings, (newVal, oldVal) => {
  console.log('设置变化:', { 新值: newVal, 旧值: oldVal });
}, { deep: true });
```

## 后续优化建议

1. **数据迁移**：如果修改了 `DockSettings` 接口，添加数据迁移逻辑
2. **设置导出/导入**：允许用户导出和导入设置
3. **云同步**：考虑将设置同步到云端（可选）
4. **设置版本号**：为设置添加版本号，方便未来升级
5. **备份恢复**：自动备份设置，允许恢复到之前的版本

## 更新时间线

- **2025-11-01 19:30** - 用户反馈配置不保存问题
- **2025-11-01 19:45** - 分析问题原因（watch 在加载时触发）
- **2025-11-01 20:00** - 实现修复（添加标志和日志）
- **2025-11-01 20:30** - 添加验证函数
- **2025-11-01 20:45** - 测试验证通过

