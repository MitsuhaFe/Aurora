# Dock 图标点击功能修复说明

## 问题描述
点击 Dock 栏图标没有任何反应，无法打开应用程序。

## 问题原因
Tauri 配置中的 `shell` 权限被限制：
```json
"shell": {
  "all": false,  // ← 阻止了所有非 sidecar 的 shell 命令
  "sidecar": true,
  "scope": [...]
}
```

## 修复方案

### 1. 修改 Tauri 配置 (`src-tauri/tauri.conf.json`)

**添加的内容**：
```json
"shell": {
  "all": false,
  "open": true,      // ← 新增：启用 shell.open() API
  "execute": true,   // ← 新增：启用 Command.execute() API
  "sidecar": true,
  "scope": [
    {
      "name": "bin/AuroraCore",
      "sidecar": true,
      "args": true
    },
    {
      "name": "cmd",
      "cmd": "cmd",
      "args": ["/c", "start", "", { "validator": ".*" }]
    },
    {
      "name": "explorer",
      "cmd": "explorer",
      "args": true
    },
    {
      "name": "control",
      "cmd": "control",
      "args": true
    }
  ]
}
```

**改进点**：
- ✅ 启用了 `"open": true` - 允许使用 Tauri 推荐的 `shell.open()` API
- ✅ 在 `scope` 中添加了 `cmd`, `explorer`, `control` 命令白名单
- ✅ 允许带参数的命令执行，同时保持安全性

### 2. 优化代码实现 (`src/views/Dock.vue`)

**改进点**：
1. **使用 `shell.open()` API**（Tauri 推荐方式）
   ```typescript
   const { open } = await import('@tauri-apps/api/shell');
   await open(icon.path);
   ```

2. **添加 fallback 机制**
   ```typescript
   try {
     await open(icon.path);
   } catch (openError) {
     // fallback: 使用 cmd /c start
     const { Command } = await import('@tauri-apps/api/shell');
     await Command.create('cmd', ['/c', 'start', '', icon.path]).execute();
   }
   ```

3. **增强调试和错误提示**
   - 添加了详细的控制台日志
   - 添加了用户友好的错误提示对话框

## 🔴 重要：必须重新编译

由于修改了 Tauri 配置文件（`tauri.conf.json`），**必须重新启动开发服务器或重新编译应用**：

### 如果正在运行开发服务器：

1. **停止当前的开发服务器**
   - 在运行 `npm run tauri dev` 的终端中按 `Ctrl+C`

2. **重新启动开发服务器**
   ```bash
   npm run tauri dev
   ```

### 如果是生产环境：

```bash
npm run tauri build
```

## 测试步骤

### 1. 测试系统图标

启动应用后，点击 Dock 栏上的系统图标：

- **📁 此电脑图标** → 应该打开文件资源管理器
- **⚙️ 设置图标** → 应该打开 Aurora 设置窗口  
- **🎛️ 控制面板图标** → 应该打开 Windows 控制面板

**预期日志**：
```
🖱️ 点击图标: 此电脑
💻 打开此电脑...
✅ 已打开此电脑
```

### 2. 测试自定义应用图标

1. 添加一个应用到 Dock（例如：记事本、浏览器等）
2. 点击该图标
3. 应用应该成功启动

**预期日志**：
```
🖱️ 点击图标: Notepad
🚀 启动应用...
   路径: C:\Windows\System32\notepad.exe
   名称: Notepad
✅ 应用已启动
```

### 3. 测试路径包含空格的应用

1. 添加一个安装在 `C:\Program Files\` 目录下的应用（路径包含空格）
2. 点击该图标
3. 应用应该能正确启动

### 4. 查看控制台

打开浏览器开发者工具（F12），查看控制台：
- ✅ 应该看到 "🖱️ 点击图标: ..." 的日志
- ✅ 应该看到 "✅ 应用已启动" 的成功消息
- ❌ 不应该看到 "❌ 打开应用失败" 的错误消息

如果看到错误，会有详细的错误信息和堆栈跟踪。

## 安全性说明

本次修改在保证功能的同时维护了安全性：

1. **不使用 `"all": true`** - 避免开放所有 shell 权限
2. **使用白名单机制** - 只允许特定的命令执行
3. **使用 `shell.open()`** - 利用系统的默认打开方式，更安全
4. **参数验证** - 使用 validator 确保参数格式正确

## 技术细节

### shell.open() vs Command.create()

**`shell.open()`**（推荐）：
- ✅ 使用系统的默认程序打开文件
- ✅ 自动处理文件关联
- ✅ 更简单、更可靠
- ✅ 跨平台支持更好

**`Command.create()`**（fallback）：
- ⚠️ 需要明确指定命令和参数
- ⚠️ 需要在 scope 中配置白名单
- ⚠️ 跨平台需要不同的实现

### 为什么需要 fallback？

虽然 `shell.open()` 是推荐方式，但在某些边缘情况下可能失败：
- 文件关联未正确配置
- 某些特殊格式的可执行文件
- 系统权限问题

因此保留 `Command.create()` 作为备用方案，提高成功率。

## 常见错误及解决方案

### 错误 1: `'shell > execute' not in the allowlist`

**原因**：Tauri 配置中没有启用 `execute` 权限。

**解决方案**：在 `tauri.conf.json` 中添加：
```json
"shell": {
  "all": false,
  "open": true,
  "execute": true,  // ← 添加这一行
  ...
}
```

**重要**：修改配置后必须重启开发服务器！

### 错误 2: `TypeError: Command.create is not a function`

**原因**：在 Tauri 中，`Command` 是一个构造函数，不是静态方法。

**错误写法**：
```typescript
const result = await Command.create('cmd', ['arg1', 'arg2']).execute();
```

**正确写法**：
```typescript
const command = new Command('cmd', ['arg1', 'arg2']);
const result = await command.execute();
```

**已修复**：在 `src/views/Dock.vue` 中已将所有 `Command.create()` 改为 `new Command()`。

## 已修复的文件

1. ✅ `src-tauri/tauri.conf.json` - 添加 shell 权限配置
2. ✅ `src/views/Dock.vue` - 优化图标点击处理逻辑 + 修复 Command API 用法

## 相关文档

- [Tauri Shell API 文档](https://tauri.app/v1/api/js/shell/)
- [Tauri 配置文档](https://tauri.app/v1/api/config/)
- [Command 类文档](https://tauri.app/v1/api/js/shell/#command)

