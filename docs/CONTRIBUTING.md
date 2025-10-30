# 🤝 贡献指南

感谢您对 Aurora 项目的关注！我们欢迎所有形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题报告](#问题报告)

---

## 行为准则

参与本项目即表示您同意遵守我们的行为准则：

- 🤝 尊重所有贡献者
- 💬 保持建设性的讨论
- 🎯 专注于对项目最有利的方面
- 🌟 展现同理心和善意

---

## 如何贡献

您可以通过以下方式为 Aurora 做出贡献：

### 1. 🐛 报告 Bug

如果您发现了 Bug，请：

1. 先搜索 [Issues](https://github.com/MitsuhaFe/aurora/issues) 确认问题未被报告
2. 使用 Bug 报告模板创建新 Issue
3. 提供详细的复现步骤和环境信息
4. 如果可能，附上错误日志和截图

### 2. 💡 提出新功能

如果您有好的想法：

1. 在 [Discussions](https://github.com/MitsuhaFe/aurora/discussions) 中讨论您的想法
2. 收集社区反馈
3. 创建 Feature Request Issue
4. 详细描述功能的使用场景和预期效果

### 3. 📝 改进文档

文档贡献同样重要：

- 修正拼写错误和语法问题
- 改进现有文档的清晰度
- 添加示例代码和教程
- 翻译文档到其他语言

### 4. 💻 贡献代码

欢迎提交代码改进：

- 修复 Bug
- 实现新功能
- 优化性能
- 改进 UI/UX
- 编写测试

---

## 开发流程

### 环境准备

1. **前端开发环境**
   - Node.js 18.0+
   - pnpm 8.0+
   - VS Code（推荐）

2. **后端开发环境**
   - Visual Studio 2019+ 或 Visual Studio Code
   - CMake 3.20+
   - vcpkg（C++ 包管理器）

3. **推荐的 VS Code 插件**
   - Vue Language Features (Volar)
   - TypeScript Vue Plugin (Volar)
   - ESLint
   - Prettier
   - C/C++ (Microsoft)
   - CMake Tools

详细环境配置请参考 [开发文档 - 第3章](Aurora开发文档（详细版）.md#3-开发环境配置)。

### Fork 和克隆

```bash
# 1. Fork 本仓库到您的 GitHub 账号

# 2. 克隆 Fork 后的仓库
git clone https://github.com/MitsuhaFe/aurora.git
cd aurora

# 3. 添加上游仓库
git remote add upstream https://github.com/MitsuhaFe/aurora.git

# 4. 获取上游更新
git fetch upstream
```

### 创建分支

```bash
# 从 main 分支创建新的功能分支
git checkout -b feature/your-feature-name

# 分支命名规范
# feature/xxx   - 新功能
# fix/xxx       - Bug 修复
# docs/xxx      - 文档更新
# refactor/xxx  - 重构
# perf/xxx      - 性能优化
# test/xxx      - 测试相关
```

### 开发和测试

```bash
# 安装依赖
pnpm install

# 构建 C++ 后端
cd aurora-core
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
cmake --build .

# 启动开发服务器
cd ../../
pnpm tauri dev

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

---

## 代码规范

### TypeScript / Vue

我们使用 **ESLint** 和 **Prettier** 来保证代码质量：

```typescript
// ✅ 好的例子
export interface AppInfo {
  id: string;
  title: string;
  path: string;
}

export function useAppManager() {
  const apps = ref<AppInfo[]>([]);
  
  async function loadApps() {
    try {
      const result = await sendCommand('get_running_apps');
      apps.value = result.apps;
    } catch (error) {
      console.error('Failed to load apps:', error);
    }
  }
  
  return { apps, loadApps };
}

// ❌ 不好的例子
export function useAppManager() {
  const apps = ref([]);  // 缺少类型注解
  
  async function loadApps() {
    const result = await sendCommand('get_running_apps');
    apps.value = result.apps;  // 缺少错误处理
  }
  
  return { apps, loadApps };
}
```

**命名规范：**

- **组件文件：** PascalCase（如 `DockIcon.vue`）
- **Composables：** camelCase with `use` prefix（如 `useTauriBridge.ts`）
- **常量：** UPPER_SNAKE_CASE（如 `MAX_WIDGET_COUNT`）
- **变量和函数：** camelCase（如 `appList`, `handleClick`）

### C++

我们遵循 **Google C++ Style Guide**：

```cpp
// ✅ 好的例子
class WallpaperModule {
 public:
  WallpaperModule();
  ~WallpaperModule();
  
  void setStaticWallpaper(const std::string& imagePath);
  void setVideoWallpaper(const std::string& videoPath);
  
 private:
  std::unique_ptr<VideoPlayer> video_player_;
  Logger logger_;
  
  bool validatePath(const std::string& path) const;
};

// ❌ 不好的例子
class wallpaper_module {  // 类名应使用 PascalCase
public:
  void SetStaticWallpaper(string path);  // 参数应使用 const&
  VideoPlayer* videoPlayer;  // 应使用智能指针
};
```

**命名规范：**

- **类名：** PascalCase（如 `WallpaperModule`）
- **函数名：** camelCase（如 `setStaticWallpaper`）
- **成员变量：** snake_case with trailing underscore（如 `video_player_`）
- **常量：** kPascalCase（如 `kMaxRetries`）

### 代码格式化

```bash
# 前端代码格式化
pnpm format

# C++ 代码格式化（使用 clang-format）
clang-format -i src/**/*.cpp src/**/*.h
```

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(dock): add app pinning feature` |
| `fix` | Bug 修复 | `fix(wallpaper): fix video playback crash` |
| `docs` | 文档更新 | `docs(readme): update installation guide` |
| `style` | 代码格式调整（不影响功能） | `style(vue): format components with prettier` |
| `refactor` | 重构 | `refactor(ipc): simplify command handler` |
| `perf` | 性能优化 | `perf(widget): optimize system monitor polling` |
| `test` | 测试相关 | `test(dock): add unit tests for app enumeration` |
| `chore` | 构建/工具链相关 | `chore(deps): update vue to 3.3.4` |

### Scope 范围

- `dock` - Dock 栏相关
- `wallpaper` - 壁纸模块
- `pet` - 桌宠模块
- `widget` - 小组件
- `ipc` - IPC 通信
- `ui` - UI 界面
- `core` - C++ 核心
- `build` - 构建系统
- `deps` - 依赖管理

### 示例

```bash
# 好的提交示例
git commit -m "feat(widget): add weather widget with 7-day forecast"
git commit -m "fix(wallpaper): resolve memory leak in video player"
git commit -m "docs(api): add IPC command reference"
git commit -m "perf(dock): cache app icons to reduce disk I/O"

# 更详细的提交
git commit -m "feat(widget): add system monitor widget

- Implement CPU usage monitoring using PDH API
- Add memory usage display
- Add real-time chart rendering
- Add configurable refresh interval

Closes #42"
```

---

## Pull Request 流程

### 1. 提交前检查

在提交 PR 前，请确保：

- [ ] 代码已通过 ESLint/Prettier 检查
- [ ] 所有测试通过
- [ ] 已添加必要的测试用例
- [ ] 文档已更新（如果改变了 API）
- [ ] Commit 消息符合规范
- [ ] 代码已从 main 分支 rebase

```bash
# 更新您的分支
git fetch upstream
git rebase upstream/main

# 运行检查
pnpm lint
pnpm test
pnpm build
```

### 2. 创建 Pull Request

1. 推送您的分支到 Fork 的仓库
   ```bash
   git push origin feature/your-feature-name
   ```

2. 在 GitHub 上创建 Pull Request

3. 填写 PR 模板，包括：
   - **标题：** 简洁明了地描述更改
   - **描述：** 详细说明做了什么、为什么这样做
   - **相关 Issue：** 引用相关的 Issue（如 `Closes #123`）
   - **测试：** 说明如何测试您的更改
   - **截图：** 如果是 UI 更改，附上截图

### 3. 代码审查

- 维护者会审查您的代码
- 根据反馈进行必要的修改
- 所有讨论解决后，PR 将被合并

### 4. 合并后

- 删除您的功能分支
  ```bash
  git branch -d feature/your-feature-name
  git push origin --delete feature/your-feature-name
  ```

---

## 问题报告

### Bug 报告模板

```markdown
**描述 Bug**
清晰简洁地描述 Bug。

**复现步骤**
1. 打开 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

**预期行为**
描述您期望发生的情况。

**截图**
如果适用，添加截图来帮助解释问题。

**环境信息：**
 - 操作系统：[如 Windows 11 22H2]
 - Aurora 版本：[如 v0.1.0]
 - 其他相关信息

**日志**
如果有错误日志，请附上（位于 %APPDATA%\com.aurora.desktop\logs\）

**额外说明**
添加其他关于问题的说明。
```

### Feature Request 模板

```markdown
**功能描述**
清晰简洁地描述您想要的功能。

**使用场景**
描述这个功能解决了什么问题。例如："我总是遇到 [...] 的困扰"

**期望的解决方案**
描述您希望如何解决这个问题。

**备选方案**
描述您考虑过的其他替代方案。

**额外说明**
添加其他关于功能请求的说明或截图。
```

---

## 社区

- **GitHub Discussions:** 讨论功能、想法和问题
- **Discord:** 实时聊天和技术支持
- **邮件列表:** 重大更新和公告

---

## 许可证

通过贡献，您同意您的贡献将在 [MIT License](LICENSE) 下许可。

---

## 感谢

感谢您考虑为 Aurora 做出贡献！每一个贡献都很重要，无论大小。

如果您有任何问题，请随时在 [Discussions](https://github.com/MitsuhaFe/aurora/discussions) 中提问。

Happy coding! 🚀

