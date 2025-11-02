# Dock 图标功能实现

## 功能描述

实现了两个核心功能：

1. **点击图标打开应用** - 点击 Dock 栏图标可以启动对应的应用程序
2. **显示真实应用图标** - 添加应用时自动提取并显示应用的真实图标

## 技术实现

### 1. 后端图标提取（Rust）

#### 文件：`src-tauri/src/main.rs`

创建了 `extract_icon` 命令，使用 Windows API 提取 .exe 文件的图标：

**核心步骤：**
1. 使用 `ExtractIconW` 从 .exe 文件提取图标
2. 使用 `GetIconInfo` 获取图标信息
3. 使用 `DrawIconEx` 绘制 32x32 的图标到位图
4. 使用 `GetDIBits` 获取位图的 RGBA 数据
5. 将 RGBA 数据编码为 PNG 格式
6. 转换为 Base64 字符串返回前端

**依赖库：**
```toml
base64 = "0.21"
flate2 = "1.0"  # PNG 压缩

[target.'cfg(windows)'.dependencies]
winapi = { version = "0.3", features = ["winuser", "shellapi", "wingdi", "winnt", "libloaderapi"] }
```

### 2. 前端图标显示（Vue）

#### 文件：`src/views/Dock.vue`

**数据结构更新：**
```typescript
export interface DockIcon {
  id: string;
  name: string;
  icon: string;        // emoji 图标（作为后备）
  iconPath?: string;   // 图片路径（base64 或 URL）
  path?: string;       // 应用程序路径
  type: 'system' | 'app';
}
```

**模板代码：**
```vue
<div class="icon-content">
  <!-- 优先显示真实图标，如果没有则显示 emoji -->
  <img v-if="icon.iconPath" :src="icon.iconPath" class="icon-image-file" :alt="icon.name" />
  <span v-else class="icon-image">{{ icon.icon }}</span>
</div>
```

### 3. 点击打开应用

使用 `cmd /c start` 命令打开应用，兼容 .exe 和 .lnk 文件：

```typescript
async function handleIconClick(icon: any) {
  if (icon.path) {
    // 使用 cmd /c start "" "path" 命令
    // 第一个空字符串 "" 是窗口标题（必须有）
    await Command.create('cmd', ['/c', 'start', '', icon.path]).execute();
  }
}
```

### 4. 添加图标流程

```typescript
async function handleAddIcon() {
  // 1. 打开文件选择对话框
  const selected = await open({
    filters: [
      { name: '应用程序', extensions: ['exe'] },
      { name: '快捷方式', extensions: ['lnk'] },
    ],
  });
  
  // 2. 提取文件名
  const fileName = selected.split('\\').pop()?.replace(/\.(exe|lnk)$/i, '') || 'App';
  
  // 3. 调用后端提取图标
  const result = await invoke('extract_icon', { exePath: selected });
  
  // 4. 生成 base64 图片路径
  const iconPath = result.success 
    ? `data:image/png;base64,${result.icon}` 
    : undefined;
  
  // 5. 添加到 Dock
  dockStore.addIcon({
    name: fileName,
    icon: '📦',           // emoji 后备
    iconPath: iconPath,   // 真实图标
    path: selected,
    type: 'app',
  });
}
```

## CSS 样式

#### 文件：`src/styles/dock.css`

```css
/* 真实应用图标（图片） */
.icon-image-file {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
}
```

## 使用流程

### 用户操作流程

1. **添加应用图标：**
   - 点击 Dock 上的 "+" 按钮
   - 选择一个 .exe 或 .lnk 文件
   - 等待图标提取（自动完成）
   - 应用图标出现在 Dock 上，显示真实的应用图标

2. **启动应用：**
   - 点击 Dock 上的应用图标
   - 应用程序启动

### 日志输出

**添加图标时：**
```
📁 打开文件选择对话框...
✅ 选择的文件: C:\Program Files\...\app.exe
🔍 正在提取应用图标...
✅ 成功获取应用图标
✅ 图标已添加到 Dock: App Name
✨ 使用真实应用图标
```

**点击图标时：**
```
🖱️ 点击图标: App Name
🚀 启动应用: C:\Program Files\...\app.exe
✅ 应用已启动
```

## 技术特点

### 1. 图标提取

✅ **自动提取** - 无需用户手动设置图标  
✅ **高质量** - 32x32 像素，适合 Dock 显示  
✅ **PNG 格式** - 支持透明背景  
✅ **Base64 编码** - 无需额外的文件存储  

### 2. 应用启动

✅ **通用兼容** - 支持 .exe 和 .lnk 文件  
✅ **系统集成** - 使用 Windows 命令启动  
✅ **错误处理** - 详细的日志和错误提示  

### 3. 显示方式

✅ **优先真实图标** - 如果有就显示真实图标  
✅ **后备 emoji** - 如果提取失败，显示 emoji  
✅ **响应式** - 自动适应 Dock 大小  

## 错误处理

### 1. 图标提取失败

如果无法提取图标（文件不是有效的 .exe 或没有图标）：
- 使用默认的 📦 emoji 图标
- 记录警告日志
- 不影响添加功能

### 2. 应用启动失败

如果应用无法启动（文件不存在或权限问题）：
- 显示详细的错误信息
- 不会崩溃或影响 Dock 运行

## 性能优化

1. **图标缓存** - 图标提取后保存在 localStorage，无需重复提取
2. **异步处理** - 图标提取不阻塞 UI
3. **按需加载** - 只在添加时提取图标

## 兼容性

- ✅ Windows 10/11
- ✅ 125% DPI 缩放（已修复）
- ✅ .exe 文件
- ✅ .lnk 快捷方式
- ✅ 系统图标和自定义图标

## 限制

1. **仅 Windows** - 图标提取功能仅在 Windows 上可用
2. **仅本地文件** - 不支持网络路径
3. **32x32 图标** - 固定大小，适合 Dock 显示

## 未来改进

1. **右键菜单** - 删除、重命名图标
2. **图标编辑** - 允许用户选择自定义图标
3. **拖放排序** - 拖动调整图标顺序
4. **图标分组** - 文件夹或分类
5. **搜索功能** - 快速查找应用

## 测试步骤

1. **测试添加图标：**
   - 添加一个系统应用（如记事本）
   - 检查是否显示正确的图标
   - 添加一个快捷方式
   - 检查是否也能显示图标

2. **测试启动应用：**
   - 点击系统图标（设置、此电脑）
   - 确认能正确打开
   - 点击自定义应用图标
   - 确认能正确启动

3. **测试错误处理：**
   - 添加一个没有图标的文件
   - 确认使用默认 emoji
   - 删除应用文件后点击图标
   - 确认显示错误信息

## 相关文件

- `src-tauri/src/main.rs` - 后端图标提取
- `src-tauri/Cargo.toml` - Rust 依赖配置
- `src/views/Dock.vue` - 前端图标显示和交互
- `src/stores/dockStore.ts` - 图标数据结构
- `src/styles/dock.css` - 图标样式

## 更新时间

- **2025-11-03** - 完整实现图标提取和显示功能

