# 更新日志

本文档记录 Aurora 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布]

### 计划中
- [ ] 网页壁纸功能（WebView2 集成）
- [ ] 壁纸播放列表
- [ ] 音量控制（视频壁纸）
- [ ] 更多小组件（RSS、倒计时）
- [ ] macOS 和 Linux 支持

---

## [0.1.0] - 2025-01-11

### 新增
- ✨ 完整的项目框架（Vue 3 + Tauri + C++）
- ✨ 静态壁纸功能（支持 JPG, PNG, BMP, WEBP）
- ✨ 动态壁纸功能（基于 ffplay 的视频播放）
- ✨ Dock 栏应用启动器
  - 显示运行中的应用
  - 固定/取消固定应用
  - 鼠标悬停放大动画
  - 右键菜单
  - 多种动画效果（弹簧、渐隐、涟漪等）
  - 自动隐藏功能
  - 可调整位置（上下左右）
  - 背景和图标透明度独立控制
- ✨ 桌面伙伴系统
  - 5种伙伴类型（猫、狗、兔子、熊猫、企鹅）
  - 可拖拽移动
  - 多种互动动画
  - 自动移动功能
  - 完整的设置面板
- ✨ 小组件系统框架
  - 时钟小组件
  - 天气小组件
  - 系统监控小组件
  - 待办事项小组件
- ✨ 完整的设置界面
  - 侧边栏导航
  - 通用设置
  - 壁纸设置
  - Dock 设置
  - 桌面伙伴设置
  - 小组件管理
- ✨ IPC 通信系统
  - JSON 格式命令
  - 事件监听机制
  - Sidecar 进程管理
- ✨ 状态管理（Pinia）
  - appStore - 应用状态
  - wallpaperStore - 壁纸状态
  - dockStore - Dock 状态
- ✨ 完整的文档体系
  - README.md
  - 开发指南.md
  - 使用手册.md
  - API文档.md
  - CONTRIBUTING.md

### 修复
- 🐛 修复动态壁纸切换时进程未清理的问题
- 🐛 修复 Dock 位置偏移问题
- 🐛 修复 DPI 缩放导致的显示问题
- 🐛 修复 Dock 图标点击无响应问题
- 🐛 修复窗口控制按钮重复显示
- 🐛 修复 Dock 配置保存失败问题
- 🐛 修复 Dock 自动隐藏视觉残留问题
- 🐛 修复 Dock 透明度设置冲突
- 🐛 修复 Dock 多窗口数据冲突

### 改进
- 💄 优化设置界面 UI/UX
- ⚡ 改进 Sidecar 进程管理
- ⚡ 优化壁纸切换流程
- 💄 统一 Dock 动画配置区域
- 💄 改进 Dock 图标清晰度
- ⚡ 优化 Dock 拖动位置稳定性
- 💄 改进 Dock 样式选择功能
- ⚡ 优化 DPI 缩放兼容性

### 技术
- 🔧 配置 CMake 构建系统
- 🔧 集成 nlohmann/json 库
- 🔧 配置 Tauri Sidecar
- 🔧 设置 ESLint 和 Prettier
- 🔧 配置文件系统权限
- 🔧 配置对话框权限

---

## [0.0.1] - 2024-10-30

### 新增
- 🎉 项目初始化
- 🎉 创建基础项目结构
- 🎉 配置开发环境
- 🎉 创建主页欢迎界面
- 🎉 创建设置页面框架

---

## 版本说明

### 版本号规则

格式：`主版本号.次版本号.修订号`

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 版本状态

- **alpha**：内部测试版本，功能不完整
- **beta**：公开测试版本，功能基本完整
- **rc**：候选发布版本
- **stable**：稳定版本

---

## 变更类型说明

- **新增 (Added)**：新功能
- **修复 (Fixed)**：Bug 修复
- **改进 (Changed)**：功能改进
- **废弃 (Deprecated)**：即将移除的功能
- **移除 (Removed)**：已移除的功能
- **安全 (Security)**：安全性修复
- **技术 (Technical)**：技术性更新

---

## 里程碑

### 已完成
- ✅ **Phase 1**: 项目框架搭建（2024-10-30）
- ✅ **Phase 2**: 壁纸功能实现（2025-01-11）
- ✅ **Phase 3**: Dock 栏完整实现（2025-01-11）

### 进行中
- 🔄 **Phase 4**: 小组件系统实现

### 计划中
- ⏳ **Phase 5**: 桌面伙伴完善
- ⏳ **Phase 6**: 主题系统
- ⏳ **Phase 7**: 插件系统
- ⏳ **Phase 8**: 跨平台支持（macOS, Linux）

---

## 贡献者

感谢所有为 Aurora 做出贡献的开发者！

- [@MitsuhaFe](https://github.com/MitsuhaFe) - 项目创始人

---

## 链接

- [项目主页](https://github.com/MitsuhaFe/aurora)
- [问题反馈](https://github.com/MitsuhaFe/aurora/issues)
- [功能请求](https://github.com/MitsuhaFe/aurora/issues/new?template=feature_request.md)
- [安全问题](mailto:MitsuhaFe@gmail.com)

---

**最后更新：** 2025-01-11
