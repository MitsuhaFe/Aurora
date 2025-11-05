# Aurora ✨

<div align="center">
  <h1>🌟 极光 Aurora 🌟</h1>
  <h3>轻量级、高性能的桌面美化软件</h3>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](docs/LICENSE)
  [![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange.svg)](#)
  [![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey.svg)](https://www.microsoft.com/windows)
  [![Tauri](https://img.shields.io/badge/Tauri-1.5%2B-blue.svg)](https://tauri.app/)
  [![Vue](https://img.shields.io/badge/Vue-3.3%2B-green.svg)](https://vuejs.org/)
  
  **✅ 项目框架已完成 | 🚀 可立即运行**
</div>

---

## 🎊 项目状态

**当前阶段：阶段 1 - 项目框架搭建 ✅ 完成**

- ✅ 完整的 Vue 3 + Tauri 项目结构
- ✅ 精美的欢迎页面和设置页面
- ✅ Pinia 状态管理
- ✅ IPC 通信框架（占位）
- ⏳ C++ 后端（待开发）
- ⏳ 实际功能（待开发）

---

## 📖 项目简介

**Aurora（极光）** 是一款专为 Windows 打造的桌面美化软件，致力于提供流畅、美观且低资源占用的桌面增强体验。不同于传统的 Electron 应用，Aurora 采用 **Tauri + Vue 3 + C++** 的混合架构，实现了：

- 🪶 **超轻量级：** 安装包仅 ~15MB，内存占用 < 150MB
- ⚡ **高性能：** 基于系统原生 WebView2，启动速度 < 1 秒
- 🎨 **高度可定制：** 支持自定义主题、壁纸、小组件
- 🔌 **可扩展：** 插件化架构，支持第三方开发

---

## ✨ 核心功能

### 1. 🎯 Dock 栏（应用启动器）

类似 macOS Dock 的动态应用程序启动器，支持：

- ✅ 实时显示正在运行的应用程序
- ✅ 应用程序固定/取消固定
- ✅ 鼠标悬停放大动画效果
- ✅ 右键快捷菜单（退出、固定、查看详情）

### 2. 🖼️ 动态/静态壁纸系统

支持多种壁纸类型，让你的桌面动起来：

| 类型 | 支持格式 | 特性 |
|------|---------|------|
| **静态壁纸** | PNG, JPG, BMP, WEBP | 低资源占用，高清画质 |
| **视频壁纸** | MP4, MKV, AVI, WEBM | 基于 libmpv，支持硬件解码 |
| **网页壁纸** | HTML, URL | 支持交互式网页和 WebGL 动画 |

### 3. 🐱 虚拟桌面伙伴

可爱的桌面伙伴陪伴你的工作：

- ✅ 可拖拽、自由移动
- ✅ 精灵图动画（待机、行走、睡觉等状态）
- ✅ 基础交互（点击反馈）
- ✅ 位置记忆功能

### 4. 📊 桌面小组件

丰富的桌面小组件，信息一目了然：

- ⏰ **时钟小组件：** 数字/模拟时钟，多时区支持
- 🌤️ **天气小组件：** 实时天气、未来 7 天预报
- 💻 **系统监控：** CPU、内存、磁盘、网络使用率
- ✅ **待办事项：** 简单的任务管理
- 📝 **便签：** 快速记录灵感

---

## 🚀 快速开始

### 方式一：立即运行（开发模式）⭐

```bash
# 1. 安装依赖（首次运行）
pnpm install

# 2. 启动开发服务器
pnpm tauri:dev
```

**首次启动需要 2-5 分钟**（编译 Rust 代码）

启动成功后会打开 Aurora 应用窗口，可以看到：
- ✨ 精美的欢迎页面
- ⚙️ 完整的设置界面
- 🎨 现代化的 UI 设计

### 方式二：仅开发前端 UI

```bash
# 启动 Vite 开发服务器
pnpm dev

# 浏览器访问 http://localhost:5173
```

适合快速开发前端界面，体验热重载。

### 方式三：从源码完整构建（待 C++ 后端完成）

详见 [快速开始指南](docs/快速开始指南.md)

---

## 📖 详细文档

- **[立即开始](立即开始.md)** - 5 分钟快速入门 ⭐
- **[快速开始指南](docs/快速开始指南.md)** - 完整的入门教程
- **[开发文档](docs/Aurora开发文档（详细版）.md)** - 详细的技术文档
- **[开发计划](docs/开发计划.md)** - 项目开发进度
- **[项目搭建报告](项目搭建完成报告.md)** - 框架搭建总结

---

## 📁 项目结构

```
Aurora/
├── src/                    # Vue 3 前端源代码 ✅
│   ├── views/              # 页面组件
│   │   ├── Home.vue        # 主页欢迎页 ✅
│   │   └── Settings/       # 设置页面 ✅
│   ├── stores/             # Pinia 状态管理 ✅
│   │   ├── appStore.ts     # 应用状态
│   │   └── wallpaperStore.ts  # 壁纸状态
│   ├── composables/        # 组合式函数 ✅
│   │   └── useTauriBridge.ts  # IPC 通信
│   ├── router/             # 路由配置 ✅
│   └── styles/             # 全局样式 ✅
├── src-tauri/              # Tauri 配置 ✅
│   ├── src/main.rs         # Rust 入口
│   ├── tauri.conf.json     # Tauri 配置
│   └── Cargo.toml          # Rust 依赖
├── aurora-core/            # C++ 后端 ⏳ 待开发
├── docs/                   # 项目文档 ✅
└── scripts/                # 构建脚本 ✅
```

**完整目录结构**请查看 [快速开始指南](docs/快速开始指南.md#-当前项目结构)

---

## 🛠️ 技术栈

### 前端
- **框架：** Vue 3.3 (Composition API)
- **构建：** Vite 5.0
- **语言：** TypeScript 5.0
- **状态：** Pinia 2.0
- **路由：** Vue Router 4.0

### 容器
- **Tauri** 1.5
- **WebView2** (Edge Chromium)

### 后端（待开发）
- **C++17** (核心模块)
- **libmpv** (视频播放)
- **WebView2 SDK** (网页壁纸)

---

## 🎨 界面预览

### 主页
- 精美的渐变背景
- 功能介绍卡片
- 流畅的动画效果

### 设置页面
- 侧边栏导航
- 多个设置面板
- 现代化设计

**查看实际效果：** 运行 `pnpm tauri:dev`

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是报告 Bug、提出新功能建议，还是提交代码。

### 如何贡献

1. **Fork 本仓库**
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'feat: Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **提交 Pull Request**

详见 [贡献指南](docs/CONTRIBUTING.md)

---

## 🗺️ 路线图

### v0.2.0（计划中）

- [ ] 完善桌面伙伴交互逻辑（对话、喂食）
- [ ] 添加更多小组件（RSS 阅读器、倒计时）
- [ ] 支持自定义主题和皮肤
- [ ] 配置导入/导出功能
- [ ] 全局快捷键自定义

### v0.5.0（规划中）

- [ ] 插件系统（支持第三方开发）
- [ ] macOS 和 Linux 支持
- [ ] 在线壁纸库
- [ ] 云同步配置
- [ ] 多语言支持（英语、日语、韩语）

### v1.0.0（长期目标）

- [ ] 小组件市场
- [ ] 社区主题分享平台
- [ ] AI 桌面伙伴对话（集成 LLM）
- [ ] 桌面自动化脚本
- [ ] 性能监控面板

---

## 🐛 问题反馈

如果您在使用过程中遇到问题，请：

1. 查看 [常见问题](docs/Aurora开发文档（详细版）.md#12-常见问题与解决方案)
2. 搜索 [已有 Issues](https://github.com/MitsuhaFe/aurora/issues)
3. 如果问题未被报告，请 [创建新 Issue](https://github.com/MitsuhaFe/aurora/issues/new)

---

## 📄 许可证

本项目采用 [MIT License](docs/LICENSE) 开源协议。

---

## 🙏 鸣谢

### 开源项目

- [Tauri](https://tauri.app/) - 应用容器框架
- [Vue.js](https://vuejs.org/) - 前端框架
- [libmpv](https://mpv.io/) - 视频播放引擎
- [nlohmann/json](https://github.com/nlohmann/json) - C++ JSON 库
- [Lively Wallpaper](https://github.com/rocksdanister/lively) - 壁纸技术参考

### 灵感来源

- macOS Dock
- Wallpaper Engine
- Rainmeter
- uTools

---

## 📞 联系方式

- **GitHub：** [https://github.com/MitsuhaFe/aurora](https://github.com/MitsuhaFe/aurora)
- **问题反馈：** [创建 Issue](https://github.com/MitsuhaFe/aurora/issues/new)

---

<div align="center">
  <h2>💖 感谢使用 Aurora！</h2>
  <p>如果您喜欢这个项目，请给我们一个 ⭐ Star</p>
  <p>Made with ❤️ by Aurora Team</p>
  <p>Copyright © 2024 Aurora Desktop. All rights reserved.</p>
</div>
