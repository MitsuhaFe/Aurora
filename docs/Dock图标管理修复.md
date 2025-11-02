# Dock 图标管理修复

## 问题描述

用户反馈两个问题：

1. **图标不持久化** - 添加或移除图标后重启应用，图标会恢复默认值
2. **设置界面缺少图标管理** - 需要在设置界面中也能添加或移除图标

## 修复内容

### 1. 修复图标持久化问题

#### 问题原因

图标的 `watch` 监听器没有检查 `isLoadingSettings` 标志，导致在加载设置时就触发保存，可能覆盖了刚加载的数据。

#### 修复方案

**文件：`src/stores/dockStore.ts`**

```typescript
/**
 * 监听图标变化，自动保存
 */
watch(
  icons,
  () => {
    // 如果正在加载设置，跳过保存（避免覆盖刚加载的数据）
    if (isLoadingSettings) {
      console.log('⏭️ 正在加载设置，跳过图标保存');
      return;
    }
    console.log('📝 图标已变化，触发自动保存');
    saveSettings();
  },
  { deep: true }
);
```

现在图标的添加和移除会被正确保存到 localStorage，重启后也能恢复。

### 2. 添加设置界面的图标管理功能

#### 修改文件：`src/views/Settings/Index.vue`

#### 2.1 更新模板

添加了完整的图标管理界面：

```vue
<!-- 图标管理 -->
<div class="setting-section-title">图标管理</div>

<div class="icon-management">
  <p class="management-description">管理 Dock 栏上的应用程序图标</p>
  
  <!-- 添加图标按钮 -->
  <button class="btn-add-icon" @click="handleAddIcon">
    <span class="icon">➕</span>
    <span>添加应用图标</span>
  </button>
  
  <!-- 图标列表 -->
  <div class="icon-list">
    <div 
      v-for="icon in dockStore.icons" 
      :key="icon.id"
      class="icon-item"
    >
      <!-- 图标预览 -->
      <div class="icon-preview">
        <img v-if="icon.iconPath" :src="icon.iconPath" class="icon-image" :alt="icon.name" />
        <span v-else class="icon-emoji">{{ icon.icon }}</span>
      </div>
      
      <!-- 图标信息 -->
      <div class="icon-info">
        <span class="icon-name">{{ icon.name }}</span>
        <span class="icon-type">{{ icon.type === 'system' ? '系统图标' : '自定义应用' }}</span>
      </div>
      
      <!-- 移除按钮（仅自定义应用） -->
      <button 
        v-if="icon.type === 'app'"
        class="btn-remove"
        @click="handleRemoveIcon(icon.id)"
        title="移除图标"
      >
        🗑️ 移除
      </button>
      <span v-else class="system-label">系统默认</span>
    </div>
  </div>
</div>
```

#### 2.2 添加方法

```typescript
/**
 * 添加图标
 */
async function handleAddIcon() {
  try {
    const selected = await open({
      filters: [
        { name: '应用程序', extensions: ['exe'] },
        { name: '快捷方式', extensions: ['lnk'] },
      ],
    });
    
    if (selected && typeof selected === 'string') {
      const fileName = selected.split('\\').pop()?.replace(/\.(exe|lnk)$/i, '') || 'App';
      
      // 提取真实图标
      let iconPath = '';
      try {
        const { invoke } = await import('@tauri-apps/api/tauri');
        const result = await invoke('extract_icon', { exePath: selected });
        
        if (result.success && result.icon) {
          iconPath = `data:image/png;base64,${result.icon}`;
        }
      } catch (error) {
        console.warn('提取图标失败，使用默认图标');
      }
      
      // 添加图标
      dockStore.addIcon({
        id: `app-${Date.now()}`,
        name: fileName,
        icon: '📦',
        iconPath: iconPath || undefined,
        path: selected,
        type: 'app',
      });
    }
  } catch (error) {
    console.error('添加图标失败:', error);
  }
}

/**
 * 移除图标
 */
function handleRemoveIcon(iconId: string) {
  if (confirm('确定要移除此图标吗？')) {
    dockStore.removeIcon(iconId);
  }
}
```

#### 2.3 添加样式

```css
/* 图标管理 */
.icon-management {
  margin-top: 16px;
}

.btn-add-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-icon:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.icon-preview {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.icon-image {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.icon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.icon-type {
  font-size: 12px;
  color: #6b7280;
}

.system-label {
  font-size: 12px;
  color: #667eea;
  padding: 4px 8px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 4px;
}
```

## 功能特点

### 图标管理界面

✅ **显示所有图标** - 包括系统图标和自定义应用图标  
✅ **真实图标显示** - 显示应用的真实图标，而不是 emoji  
✅ **图标类型标识** - 区分系统图标和自定义应用  
✅ **添加应用** - 点击"添加应用图标"按钮添加新应用  
✅ **移除应用** - 自定义应用可以移除，系统图标不可移除  
✅ **即时同步** - 在设置界面添加/移除的图标立即显示在 Dock 上  

### 持久化

✅ **自动保存** - 图标变化自动保存到 localStorage  
✅ **重启恢复** - 重启应用后图标正确恢复  
✅ **跨窗口同步** - 主窗口和 Dock 窗口的图标保持同步  

## 使用方法

### 在设置界面添加图标

1. 打开设置（点击主窗口或 Dock 上的设置图标）
2. 切换到"Dock"标签
3. 滚动到"图标管理"部分
4. 点击"➕ 添加应用图标"按钮
5. 选择一个 .exe 或 .lnk 文件
6. 图标自动添加到 Dock 和图标列表

### 移除图标

1. 在"图标管理"中找到要移除的图标
2. 点击"🗑️ 移除"按钮
3. 确认移除
4. 图标从 Dock 和列表中消失

### 在 Dock 上添加图标

1. 点击 Dock 上的"+"按钮
2. 选择应用
3. 图标自动添加

## 测试验证

### 测试持久化

1. 添加一个应用图标
2. **重启应用**
3. 检查图标是否还在 ✅

### 测试设置界面

1. 打开设置 → Dock → 图标管理
2. 点击"添加应用图标"
3. 选择一个应用
4. 检查图标是否出现在列表和 Dock 上 ✅

### 测试移除功能

1. 在图标管理中点击移除
2. 检查图标是否从 Dock 消失 ✅
3. 重启应用
4. 检查图标是否还是没有 ✅

### 测试系统图标保护

1. 尝试移除系统图标（此电脑、设置、控制面板）
2. 应该看到"系统默认"标签，没有移除按钮 ✅

## 修改的文件

1. **`src/stores/dockStore.ts`**
   - ✅ 修复图标 watch 监听器，添加 `isLoadingSettings` 检查

2. **`src/views/Settings/Index.vue`**
   - ✅ 更新图标管理界面模板
   - ✅ 添加 `handleAddIcon()` 方法
   - ✅ 添加 `handleRemoveIcon()` 方法
   - ✅ 添加图标管理相关样式

## 技术要点

1. **防止加载时覆盖** - 使用 `isLoadingSettings` 标志防止加载设置时触发保存
2. **深度监听** - 使用 `{ deep: true }` 监听图标数组的变化
3. **即时同步** - Pinia store 的响应式特性确保多窗口同步
4. **类型区分** - 系统图标和自定义应用图标分开处理
5. **图标提取** - 调用后端 API 提取真实应用图标

## 预期效果

✅ **添加图标后重启，图标还在**  
✅ **在设置界面可以管理图标**  
✅ **显示真实应用图标，不是 emoji**  
✅ **可以移除自定义应用图标**  
✅ **系统图标不能移除（受保护）**  
✅ **多窗口数据同步**  

## 更新时间

- **2025-11-03** - 修复图标持久化问题
- **2025-11-03** - 添加设置界面的图标管理功能

