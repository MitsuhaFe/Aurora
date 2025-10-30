# Aurora 桌面美化软件 - 详细开发文档

## 📑 目录

1. [项目概述](#1-项目概述)
2. [技术架构设计](#2-技术架构设计)
3. [开发环境配置](#3-开发环境配置)
4. [核心模块实现 - C++ 后端](#4-核心模块实现---c-后端)
5. [前端实现 - Vue 3](#5-前端实现---vue-3)
6. [通信协议与IPC机制](#6-通信协议与ipc机制)
7. [开发工作流](#7-开发工作流)
8. [部署与打包](#8-部署与打包)
9. [性能优化指南](#9-性能优化指南)
10. [安全性考虑](#10-安全性考虑)
11. [测试策略](#11-测试策略)
12. [常见问题与解决方案](#12-常见问题与解决方案)
13. [未来规划与扩展](#13-未来规划与扩展)
14. [参考资料](#14-参考资料)

---

## 1. 项目概述

### 1.1 项目简介

**项目名称：** Aurora (极光)  
**版本：** v0.1.0-alpha  
**项目类型：** 桌面美化软件  
**开源协议：** MIT License

**项目愿景：**  
Aurora 旨在打造一款轻量级、高性能、可高度定制的桌面美化解决方案，通过现代化的技术栈为用户提供流畅、美观且低资源占用的桌面增强体验。

### 1.2 核心功能模块

1. **Dock 栏（应用启动器）**
   - 类似 macOS Dock 的动态应用程序启动器
   - 实时显示正在运行的应用程序
   - 应用程序固定/取消固定
   - 图标放大动画效果
   - 右键快捷菜单

2. **动态/静态壁纸系统**
   - **静态壁纸：** 支持 PNG、JPG、BMP 等常见图片格式
   - **视频壁纸：** 支持 MP4、MKV、AVI 等视频格式（基于 libmpv）
   - **网页壁纸：** 支持加载本地 HTML 或在线网页作为动态壁纸
   - 多显示器支持
   - 壁纸播放控制（播放/暂停/音量）

3. **虚拟桌宠（Desktop Pet）**
   - 可拖拽的桌面宠物
   - 支持精灵图动画
   - 基础交互逻辑（点击反馈）
   - 位置记忆功能

4. **桌面小组件（Widgets）**
   - **时钟小组件：** 数字/模拟时钟
   - **天气小组件：** 实时天气信息显示
   - **系统监控小组件：** CPU、内存、网络使用率
   - **待办事项小组件：** 简单的任务管理
   - 小组件自由拖拽和调整大小

### 1.3 技术栈选型

#### 前端技术栈
- **框架：** Vue 3.3+ (Composition API)
- **构建工具：** Vite 4.0+
- **语言：** TypeScript 5.0+
- **UI 框架：** 自定义 CSS（追求轻量化）
- **状态管理：** Pinia 2.0+
- **路由：** Vue Router 4.0+

#### 后端技术栈（C++ 核心）
- **语言：** C++17/20
- **编译器：** MSVC 2019+ (Windows) / Clang 14+ (macOS/Linux)
- **构建系统：** CMake 3.20+
- **JSON 库：** nlohmann/json 3.11+
- **HTTP 客户端：** cpr (libcurl wrapper)
- **视频播放：** libmpv 0.35+
- **网页渲染：** Microsoft WebView2 SDK (Windows)

#### 容器与打包
- **应用容器：** Tauri 1.5+ / Tauri 2.0
- **WebView 引擎：** 
  - Windows: WebView2 (Edge Chromium)
  - macOS: WKWebView
  - Linux: WebKitGTK

### 1.4 设计目标

- **轻量级：** 安装包小于 30MB，运行时内存占用低于 150MB
- **高性能：** UI 渲染 60fps，CPU 占用率低于 5%（空闲时）
- **跨平台：** 优先支持 Windows 10/11，未来扩展至 macOS 和 Linux
- **可扩展：** 插件化架构，支持第三方小组件和主题

---

## 2. 技术架构设计

### 2.1 架构概览

Aurora 采用 **前后端分离** + **混合架构** 设计：

```
┌─────────────────────────────────────────────────────────────┐
│                    用户交互层 (User Layer)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Tauri 容器 (Native WebView Container)            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Vue 3 前端 (Frontend UI Layer)               │    │
│  │  • 设置面板 (Settings.vue)                           │    │
│  │  • Dock 栏 (Dock.vue)                                │    │
│  │  • 桌宠渲染 (Pet.vue)                                │    │
│  │  • 小组件 (Widgets/*.vue)                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
        ↓ IPC (stdin/stdout JSON)    ↑ Events (stdout JSON)
┌─────────────────────────────────────────────────────────────┐
│         C++ 后端核心 (AuroraCore.exe - Sidecar)              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • JSON 命令解析器 (Command Parser)                  │    │
│  │  • 壁纸模块 (WallpaperModule)                        │    │
│  │  • Dock 逻辑模块 (DockModule)                        │    │
│  │  • 桌宠逻辑模块 (PetModule)                          │    │
│  │  • 小组件数据模块 (WidgetDataModule)                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          操作系统 API 层 (OS Native API Layer)               │
│  • Windows API (WinAPI)                                      │
│  • DirectX / GDI+                                            │
│  • libmpv / WebView2 SDK                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 为什么选择 Tauri 而非 Electron？

| 对比项 | Tauri | Electron |
|--------|-------|----------|
| **打包大小** | 3-10 MB | 50-150 MB |
| **内存占用** | 50-150 MB | 150-500 MB |
| **WebView** | 系统原生 (WebView2) | 打包 Chromium |
| **启动速度** | < 1 秒 | 2-5 秒 |
| **安全性** | 更高（默认沙箱隔离） | 需额外配置 |
| **跨平台** | 优秀 | 优秀 |

**结论：** Tauri 在资源占用、打包体积和启动速度上具有压倒性优势，非常适合桌面美化软件的"轻量化"定位。

### 2.3 C++ Sidecar 架构设计

**为什么需要 C++ Sidecar？**

1. **性能需求：** 视频解码、窗口枚举、系统监控等操作需要原生性能
2. **系统 API 调用：** Windows API（如 SetParent、EnumWindows）只能通过 C/C++ 调用
3. **第三方库集成：** libmpv、WebView2 SDK 等 C 库需要 C++ 进行封装
4. **进程隔离：** 即使 C++ 核心崩溃，也不会影响 Tauri 前端进程

**Sidecar 进程生命周期管理：**

```typescript
// useTauriBridge.ts 中的进程管理
let sidecarProcess = null;

async function startSidecar() {
  if (sidecarProcess) return sidecarProcess;
  
  const command = new Command('bin/AuroraCore');
  
  // 监听进程意外退出
  command.on('close', (code) => {
    console.error(`Sidecar exited with code ${code}`);
    sidecarProcess = null;
    // 尝试自动重启
    setTimeout(() => startSidecar(), 1000);
  });
  
  command.on('error', (error) => {
    console.error('Sidecar error:', error);
  });
  
  sidecarProcess = await command.spawn();
  return sidecarProcess;
}
```

### 2.4 通信协议设计

**命令格式（Vue → C++）：**

```json
{
  "action": "command_name",
  "payload": {
    "param1": "value1",
    "param2": 123
  },
  "requestId": "uuid-1234-5678" // 用于请求-响应匹配
}
```

**事件格式（C++ → Vue）：**

```json
{
  "event": "event_name",
  "data": {
    "key1": "value1",
    "key2": 456
  },
  "requestId": "uuid-1234-5678", // 可选，用于响应特定请求
  "timestamp": 1672531200000
}
```

**错误格式：**

```json
{
  "event": "error",
  "error": {
    "code": "WALLPAPER_NOT_FOUND",
    "message": "指定的壁纸文件不存在",
    "details": "Path: C:\\invalid\\path.mp4"
  }
}
```

---

## 3. 开发环境配置

### 3.1 前端开发环境

#### 必需软件

1. **Node.js 18.0+ 或 20.0+**
   ```bash
   node --version  # 应显示 v18.x.x 或更高
   npm --version   # 应显示 9.x.x 或更高
   ```

2. **pnpm（推荐）或 npm**
   ```bash
   npm install -g pnpm
   ```

3. **Rust 工具链（Tauri 依赖）**
   ```bash
   # Windows (使用 rustup-init.exe)
   https://rustup.rs/
   
   # 验证安装
   rustc --version
   cargo --version
   ```

4. **Tauri CLI**
   ```bash
   cargo install tauri-cli
   # 或使用 npm 安装
   npm install -g @tauri-apps/cli
   ```

#### 项目初始化

```bash
# 创建项目根目录
mkdir Aurora && cd Aurora

# 使用 Tauri CLI 创建项目
npm create tauri-app

# 选择配置
? Project name: aurora
? Choose your package manager: pnpm
? Choose your UI template: Vue - TypeScript
? Choose your UI flavor: TypeScript

# 安装依赖
cd aurora
pnpm install
```

### 3.2 C++ 开发环境

#### Windows 平台

1. **Visual Studio 2019/2022**
   - 安装 "使用 C++ 的桌面开发" 工作负载
   - 确保包含 CMake 工具

2. **CMake 3.20+**
   ```bash
   cmake --version
   ```

3. **vcpkg（C++ 包管理器）**
   ```bash
   git clone https://github.com/microsoft/vcpkg.git
   cd vcpkg
   .\bootstrap-vcpkg.bat
   .\vcpkg integrate install
   ```

4. **依赖库安装**
   ```bash
   # 使用 vcpkg 安装依赖
   .\vcpkg install nlohmann-json:x64-windows
   .\vcpkg install cpr:x64-windows
   
   # libmpv 需要手动下载
   # https://sourceforge.net/projects/mpv-player-windows/files/libmpv/
   
   # WebView2 SDK
   .\vcpkg install webview2:x64-windows
   ```

#### macOS 平台

```bash
# 安装 Xcode Command Line Tools
xcode-select --install

# 安装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装依赖
brew install cmake
brew install nlohmann-json
brew install mpv
```

### 3.3 项目目录结构

```
Aurora/
├── src-tauri/                 # Tauri 配置与 Rust 代码
│   ├── bin/                   # Sidecar 可执行文件存放目录
│   │   └── AuroraCore.exe
│   ├── icons/                 # 应用图标
│   ├── tauri.conf.json        # Tauri 配置文件
│   ├── Cargo.toml
│   └── src/
│       └── main.rs            # Tauri Rust 入口
│
├── src/                       # Vue 前端源代码
│   ├── assets/                # 静态资源
│   │   ├── images/
│   │   ├── fonts/
│   │   └── pet-sprites/       # 桌宠精灵图
│   ├── components/            # Vue 组件
│   │   ├── Dock/
│   │   │   ├── Dock.vue
│   │   │   ├── DockIcon.vue
│   │   │   └── DockContextMenu.vue
│   │   ├── Wallpaper/
│   │   │   └── WallpaperSettings.vue
│   │   ├── Settings/
│   │   │   ├── MainPanel.vue
│   │   │   ├── GeneralSettings.vue
│   │   │   └── AppearanceSettings.vue
│   │   ├── Pet/
│   │   │   └── DesktopPet.vue
│   │   └── Widgets/
│   │       ├── ClockWidget.vue
│   │       ├── WeatherWidget.vue
│   │       ├── SystemMonitorWidget.vue
│   │       └── TodoWidget.vue
│   ├── composables/           # Vue Composables
│   │   ├── useTauriBridge.ts  # IPC 通信封装
│   │   ├── useWindowManager.ts
│   │   └── useTheme.ts
│   ├── stores/                # Pinia 状态管理
│   │   ├── appStore.ts
│   │   ├── wallpaperStore.ts
│   │   └── widgetStore.ts
│   ├── styles/                # 全局样式
│   │   ├── variables.css
│   │   └── animations.css
│   ├── types/                 # TypeScript 类型定义
│   │   └── ipc.d.ts
│   ├── windows/               # 多窗口入口
│   │   ├── main/
│   │   │   └── main.ts
│   │   ├── dock/
│   │   │   └── dock.ts
│   │   └── pet/
│   │       └── pet.ts
│   ├── App.vue
│   └── main.ts
│
├── aurora-core/               # C++ 后端源代码
│   ├── CMakeLists.txt
│   ├── src/
│   │   ├── main.cpp           # 入口和主循环
│   │   ├── command_handler.cpp
│   │   ├── modules/
│   │   │   ├── wallpaper/
│   │   │   │   ├── wallpaper_module.h
│   │   │   │   ├── wallpaper_module.cpp
│   │   │   │   ├── static_wallpaper.cpp
│   │   │   │   ├── video_wallpaper.cpp (libmpv)
│   │   │   │   └── web_wallpaper.cpp (WebView2)
│   │   │   ├── dock/
│   │   │   │   ├── dock_module.h
│   │   │   │   ├── dock_module.cpp
│   │   │   │   ├── app_enumerator.cpp
│   │   │   │   └── process_manager.cpp
│   │   │   ├── pet/
│   │   │   │   ├── pet_module.h
│   │   │   │   └── pet_module.cpp
│   │   │   └── widget/
│   │   │       ├── widget_module.h
│   │   │       ├── widget_module.cpp
│   │   │       ├── system_monitor.cpp
│   │   │       └── weather_fetcher.cpp
│   │   └── utils/
│   │       ├── json_helper.h
│   │       ├── logger.h
│   │       └── window_helper.cpp (WinAPI 封装)
│   ├── include/               # 第三方库头文件
│   └── lib/                   # 第三方库文件
│
├── docs/                      # 项目文档
│   ├── api/                   # API 文档
│   ├── design/                # 设计文档
│   └── tutorials/             # 教程
│
├── scripts/                   # 构建脚本
│   ├── build-cpp.bat          # Windows C++ 构建脚本
│   ├── build-cpp.sh           # Unix C++ 构建脚本
│   └── copy-sidecar.js        # 复制 Sidecar 到 Tauri 目录
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 4. 核心模块实现 - C++ 后端

### 4.1 主程序入口与命令循环

**文件：** `aurora-core/src/main.cpp`

```cpp
#include <iostream>
#include <string>
#include <nlohmann/json.hpp>
#include "command_handler.h"
#include "utils/logger.h"

using json = nlohmann::json;

// 全局日志对象
Logger logger("AuroraCore.log");

// 向前端发送事件
void emitEvent(const json& event) {
    std::cout << event.dump() << std::endl;
    std::cout.flush(); // 强制刷新缓冲区
}

int main(int argc, char* argv[]) {
    logger.info("AuroraCore started");
    
    // 初始化各个模块
    CommandHandler cmdHandler;
    
    try {
        std::string line;
        
        // 主循环：从 stdin 读取命令
        while (std::getline(std::cin, line)) {
            if (line.empty()) continue;
            
            logger.debug("Received command: " + line);
            
            try {
                json command = json::parse(line);
                
                // 处理命令
                json response = cmdHandler.handleCommand(command);
                
                // 发送响应
                if (!response.empty()) {
                    emitEvent(response);
                }
                
            } catch (const json::parse_error& e) {
                logger.error("JSON parse error: " + std::string(e.what()));
                
                json errorEvent = {
                    {"event", "error"},
                    {"error", {
                        {"code", "JSON_PARSE_ERROR"},
                        {"message", e.what()}
                    }}
                };
                emitEvent(errorEvent);
            }
        }
        
    } catch (const std::exception& e) {
        logger.error("Fatal error: " + std::string(e.what()));
        return 1;
    }
    
    logger.info("AuroraCore shutting down");
    return 0;
}
```

### 4.2 命令处理器

**文件：** `aurora-core/src/command_handler.cpp`

```cpp
#include "command_handler.h"
#include "modules/wallpaper/wallpaper_module.h"
#include "modules/dock/dock_module.h"
#include "modules/widget/widget_module.h"
#include <nlohmann/json.hpp>

using json = nlohmann::json;

CommandHandler::CommandHandler() {
    // 初始化各个模块
    wallpaperModule = std::make_unique<WallpaperModule>();
    dockModule = std::make_unique<DockModule>();
    widgetModule = std::make_unique<WidgetModule>();
}

json CommandHandler::handleCommand(const json& command) {
    std::string action = command.value("action", "");
    json payload = command.value("payload", json::object());
    std::string requestId = command.value("requestId", "");
    
    json response;
    response["requestId"] = requestId;
    
    try {
        // 壁纸相关命令
        if (action == "set_static_wallpaper") {
            std::string path = payload["path"];
            wallpaperModule->setStaticWallpaper(path);
            response["event"] = "wallpaper_changed";
            response["data"] = {{"status", "success"}, {"type", "static"}};
        }
        else if (action == "set_video_wallpaper") {
            std::string path = payload["path"];
            wallpaperModule->setVideoWallpaper(path);
            response["event"] = "wallpaper_changed";
            response["data"] = {{"status", "success"}, {"type", "video"}};
        }
        else if (action == "set_web_wallpaper") {
            std::string url = payload["url"];
            wallpaperModule->setWebWallpaper(url);
            response["event"] = "wallpaper_changed";
            response["data"] = {{"status", "success"}, {"type", "web"}};
        }
        
        // Dock 相关命令
        else if (action == "get_running_apps") {
            json apps = dockModule->getRunningApps();
            response["event"] = "app_list_updated";
            response["data"] = apps;
        }
        else if (action == "launch_app") {
            std::string path = payload["path"];
            bool success = dockModule->launchApp(path);
            response["event"] = "app_launched";
            response["data"] = {{"success", success}};
        }
        else if (action == "focus_window") {
            int pid = payload["pid"];
            bool success = dockModule->focusWindow(pid);
            response["event"] = "window_focused";
            response["data"] = {{"success", success}};
        }
        
        // 小组件相关命令
        else if (action == "get_widget_data") {
            std::string widgetId = payload["widgetId"];
            json params = payload.value("params", json::object());
            widgetModule->requestData(widgetId, params);
            // 注意：widgetModule 会通过定时器异步推送数据
            response = json::object(); // 不立即响应
        }
        else if (action == "stop_widget") {
            std::string widgetId = payload["widgetId"];
            widgetModule->stopWidget(widgetId);
            response["event"] = "widget_stopped";
            response["data"] = {{"widgetId", widgetId}};
        }
        
        else {
            response["event"] = "error";
            response["error"] = {
                {"code", "UNKNOWN_COMMAND"},
                {"message", "Unknown action: " + action}
            };
        }
        
    } catch (const std::exception& e) {
        response["event"] = "error";
        response["error"] = {
            {"code", "COMMAND_EXECUTION_ERROR"},
            {"message", e.what()}
        };
    }
    
    return response;
}
```

### 4.3 壁纸模块 - 静态壁纸

**文件：** `aurora-core/src/modules/wallpaper/static_wallpaper.cpp`

```cpp
#include "wallpaper_module.h"
#include <windows.h>
#include <filesystem>

void WallpaperModule::setStaticWallpaper(const std::string& imagePath) {
    // 验证文件是否存在
    if (!std::filesystem::exists(imagePath)) {
        throw std::runtime_error("Wallpaper file not found: " + imagePath);
    }
    
    // 将路径转换为宽字符
    std::wstring wPath(imagePath.begin(), imagePath.end());
    
    // 使用 Windows API 设置壁纸
    BOOL result = SystemParametersInfoW(
        SPI_SETDESKWALLPAPER,
        0,
        (PVOID)wPath.c_str(),
        SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
    );
    
    if (!result) {
        throw std::runtime_error("Failed to set static wallpaper");
    }
    
    logger.info("Static wallpaper set successfully: " + imagePath);
}
```

### 4.4 壁纸模块 - 视频壁纸（基于 libmpv）

**文件：** `aurora-core/src/modules/wallpaper/video_wallpaper.cpp`

```cpp
#include "wallpaper_module.h"
#include <mpv/client.h>
#include <windows.h>

class VideoWallpaperImpl {
private:
    mpv_handle* mpvHandle = nullptr;
    HWND targetWindow = nullptr;
    
public:
    VideoWallpaperImpl() {
        // 初始化 libmpv
        mpvHandle = mpv_create();
        if (!mpvHandle) {
            throw std::runtime_error("Failed to create mpv instance");
        }
        
        // 配置 mpv 参数
        mpv_set_option_string(mpvHandle, "loop-file", "inf"); // 循环播放
        mpv_set_option_string(mpvHandle, "no-audio", "yes");  // 默认静音
        mpv_set_option_string(mpvHandle, "hwdec", "auto");    // 硬件解码
        
        // 初始化 mpv
        if (mpv_initialize(mpvHandle) < 0) {
            throw std::runtime_error("Failed to initialize mpv");
        }
    }
    
    ~VideoWallpaperImpl() {
        if (mpvHandle) {
            mpv_terminate_destroy(mpvHandle);
        }
    }
    
    void play(const std::string& videoPath, HWND hwnd) {
        targetWindow = hwnd;
        
        // 将 mpv 渲染输出绑定到指定窗口
        int64_t wid = (int64_t)hwnd;
        mpv_set_option(mpvHandle, "wid", MPV_FORMAT_INT64, &wid);
        
        // 加载视频文件
        const char* cmd[] = {"loadfile", videoPath.c_str(), nullptr};
        mpv_command(mpvHandle, cmd);
    }
    
    void pause() {
        int flag = 1;
        mpv_set_property(mpvHandle, "pause", MPV_FORMAT_FLAG, &flag);
    }
    
    void resume() {
        int flag = 0;
        mpv_set_property(mpvHandle, "pause", MPV_FORMAT_FLAG, &flag);
    }
};

void WallpaperModule::setVideoWallpaper(const std::string& videoPath) {
    // 1. 找到桌面的 WorkerW 窗口（Wallpaper Engine 技巧）
    HWND progman = FindWindowW(L"Progman", nullptr);
    SendMessageTimeoutW(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, nullptr);
    
    HWND workerw = nullptr;
    EnumWindows([](HWND hwnd, LPARAM lParam) -> BOOL {
        HWND p = FindWindowExW(hwnd, nullptr, L"SHELLDLL_DefView", nullptr);
        if (p != nullptr) {
            *(HWND*)lParam = FindWindowExW(nullptr, hwnd, L"WorkerW", nullptr);
            return FALSE;
        }
        return TRUE;
    }, (LPARAM)&workerw);
    
    if (!workerw) {
        throw std::runtime_error("Failed to find WorkerW window");
    }
    
    // 2. 创建视频播放窗口并 SetParent 到 WorkerW
    HWND videoWindow = CreateWindowExW(
        0, L"STATIC", L"VideoWallpaper",
        WS_CHILD | WS_VISIBLE,
        0, 0, GetSystemMetrics(SM_CXSCREEN), GetSystemMetrics(SM_CYSCREEN),
        workerw, nullptr, nullptr, nullptr
    );
    
    // 3. 使用 libmpv 播放视频
    if (!videoPlayer) {
        videoPlayer = std::make_unique<VideoWallpaperImpl>();
    }
    videoPlayer->play(videoPath, videoWindow);
    
    logger.info("Video wallpaper set successfully: " + videoPath);
}
```

### 4.5 Dock 模块 - 应用枚举

**文件：** `aurora-core/src/modules/dock/app_enumerator.cpp`

```cpp
#include "dock_module.h"
#include <windows.h>
#include <tlhelp32.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

struct EnumWindowsData {
    std::vector<json> apps;
};

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    if (!IsWindowVisible(hwnd)) return TRUE;
    
    // 过滤掉没有标题的窗口
    int length = GetWindowTextLengthW(hwnd);
    if (length == 0) return TRUE;
    
    wchar_t title[256];
    GetWindowTextW(hwnd, title, sizeof(title) / sizeof(wchar_t));
    
    // 获取进程 ID
    DWORD pid;
    GetWindowThreadProcessId(hwnd, &pid);
    
    // 获取进程路径
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    wchar_t exePath[MAX_PATH];
    if (hProcess) {
        GetModuleFileNameExW(hProcess, nullptr, exePath, MAX_PATH);
        CloseHandle(hProcess);
    }
    
    // 转换为 JSON 对象
    json app;
    app["title"] = std::string(title, title + wcslen(title));
    app["pid"] = pid;
    app["path"] = std::string(exePath, exePath + wcslen(exePath));
    app["hwnd"] = (int64_t)hwnd;
    
    EnumWindowsData* data = (EnumWindowsData*)lParam;
    data->apps.push_back(app);
    
    return TRUE;
}

json DockModule::getRunningApps() {
    EnumWindowsData data;
    EnumWindows(EnumWindowsProc, (LPARAM)&data);
    
    json result;
    result["apps"] = data.apps;
    return result;
}
```

### 4.6 小组件模块 - 系统监控

**文件：** `aurora-core/src/modules/widget/system_monitor.cpp`

```cpp
#include "widget_module.h"
#include <windows.h>
#include <pdh.h>
#include <thread>
#include <chrono>

class SystemMonitor {
private:
    PDH_HQUERY cpuQuery;
    PDH_HCOUNTER cpuCounter;
    std::thread monitorThread;
    bool running = false;
    std::function<void(json)> callback;
    
public:
    SystemMonitor(std::function<void(json)> cb) : callback(cb) {
        // 初始化性能计数器
        PdhOpenQuery(nullptr, 0, &cpuQuery);
        PdhAddCounterW(cpuQuery, L"\\Processor(_Total)\\% Processor Time", 0, &cpuCounter);
        PdhCollectQueryData(cpuQuery);
    }
    
    ~SystemMonitor() {
        stop();
        PdhCloseQuery(cpuQuery);
    }
    
    void start() {
        running = true;
        monitorThread = std::thread([this]() {
            while (running) {
                // 收集 CPU 使用率
                PdhCollectQueryData(cpuQuery);
                PDH_FMT_COUNTERVALUE counterVal;
                PdhGetFormattedCounterValue(cpuCounter, PDH_FMT_DOUBLE, nullptr, &counterVal);
                double cpuUsage = counterVal.doubleValue;
                
                // 收集内存使用率
                MEMORYSTATUSEX memInfo;
                memInfo.dwLength = sizeof(MEMORYSTATUSEX);
                GlobalMemoryStatusEx(&memInfo);
                double memoryUsage = memInfo.dwMemoryLoad;
                
                // 构造数据并回调
                json data;
                data["cpu"] = static_cast<int>(cpuUsage);
                data["memory"] = static_cast<int>(memoryUsage);
                data["timestamp"] = std::chrono::system_clock::now().time_since_epoch().count();
                
                callback(data);
                
                // 每秒更新一次
                std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        });
    }
    
    void stop() {
        running = false;
        if (monitorThread.joinable()) {
            monitorThread.join();
        }
    }
};

void WidgetModule::requestData(const std::string& widgetId, const json& params) {
    if (widgetId == "system_monitor") {
        auto monitor = std::make_shared<SystemMonitor>([widgetId](json data) {
            json event;
            event["event"] = "widget_data_updated";
            event["widgetId"] = widgetId;
            event["data"] = data;
            
            // 发送到 stdout
            std::cout << event.dump() << std::endl;
            std::cout.flush();
        });
        
        monitor->start();
        activeMonitors[widgetId] = monitor;
    }
}
```

### 4.7 CMakeLists.txt 配置

**文件：** `aurora-core/CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.20)
project(AuroraCore VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找依赖库
find_package(nlohmann_json CONFIG REQUIRED)
find_package(cpr CONFIG REQUIRED)

# 源文件
file(GLOB_RECURSE SOURCES 
    "src/*.cpp"
    "src/modules/**/*.cpp"
    "src/utils/*.cpp"
)

# 可执行文件
add_executable(AuroraCore ${SOURCES})

# 链接库
target_link_libraries(AuroraCore PRIVATE 
    nlohmann_json::nlohmann_json
    cpr::cpr
)

# Windows 特定配置
if(WIN32)
    target_link_libraries(AuroraCore PRIVATE 
        user32
        gdi32
        pdh
        psapi
    )
    
    # 链接 libmpv (假设已下载到 lib/ 目录)
    target_include_directories(AuroraCore PRIVATE "${CMAKE_SOURCE_DIR}/include")
    target_link_directories(AuroraCore PRIVATE "${CMAKE_SOURCE_DIR}/lib")
    target_link_libraries(AuroraCore PRIVATE mpv)
    
    # 链接 WebView2
    find_package(WebView2 CONFIG REQUIRED)
    target_link_libraries(AuroraCore PRIVATE WebView2::WebView2)
endif()

# 输出到 bin 目录
set_target_properties(AuroraCore PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/bin"
)
```

---

## 5. 前端实现 - Vue 3

### 5.1 IPC 通信封装

**文件：** `src/composables/useTauriBridge.ts`

```typescript
import { ref, reactive, onUnmounted } from 'vue';
import { Command } from '@tauri-apps/api/shell';
import { v4 as uuidv4 } from 'uuid';

// 单例 Sidecar 进程
let sidecarProcess: any = null;
let eventListeners = reactive(new Map<string, Array<(data: any) => void>>());
let responseCallbacks = reactive(new Map<string, (data: any) => void>());

// 启动 Sidecar 进程
async function startSidecar() {
  if (sidecarProcess) return sidecarProcess;

  console.log('[Tauri Bridge] Starting AuroraCore sidecar...');

  const command = new Command('sidecar', 'bin/AuroraCore', []);

  // 监听 stdout（事件流）
  command.stdout.on('data', (line: string) => {
    try {
      const event = JSON.parse(line);
      console.log('[Tauri Bridge] Event received:', event);

      // 如果是对特定请求的响应
      if (event.requestId && responseCallbacks.has(event.requestId)) {
        const callback = responseCallbacks.get(event.requestId);
        callback!(event);
        responseCallbacks.delete(event.requestId);
        return;
      }

      // 处理广播事件
      let eventName = event.event;

      // 如果是小组件事件，添加 widgetId 后缀
      if (event.widgetId) {
        eventName = `${event.event}:${event.widgetId}`;
      }

      // 触发所有注册的监听器
      if (eventListeners.has(eventName)) {
        eventListeners.get(eventName)!.forEach((callback) => {
          callback(event.data || event);
        });
      }
    } catch (e) {
      console.error('[Tauri Bridge] Failed to parse event:', line, e);
    }
  });

  // 监听 stderr（错误日志）
  command.stderr.on('data', (line: string) => {
    console.error('[Tauri Bridge] C++ Error:', line);
  });

  // 监听进程关闭
  command.on('close', (data: any) => {
    console.warn('[Tauri Bridge] Sidecar process closed:', data);
    sidecarProcess = null;

    // 尝试自动重启（最多重试 3 次）
    if (data.code !== 0) {
      setTimeout(() => startSidecar(), 2000);
    }
  });

  command.on('error', (error: string) => {
    console.error('[Tauri Bridge] Sidecar error:', error);
  });

  sidecarProcess = await command.spawn();
  console.log('[Tauri Bridge] Sidecar started successfully');

  return sidecarProcess;
}

// 发送命令到 C++ 后端
export async function sendCommand<T = any>(
  action: string,
  payload: any = {}
): Promise<T> {
  const sidecar = await startSidecar();

  const requestId = uuidv4();
  const command = {
    action,
    payload,
    requestId,
  };

  console.log('[Tauri Bridge] Sending command:', command);

  // 返回 Promise，等待响应
  return new Promise((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      responseCallbacks.delete(requestId);
      reject(new Error(`Command timeout: ${action}`));
    }, 30000); // 30 秒超时

    // 注册响应回调
    responseCallbacks.set(requestId, (response: any) => {
      clearTimeout(timeout);

      if (response.event === 'error') {
        reject(new Error(response.error.message));
      } else {
        resolve(response.data as T);
      }
    });

    // 发送命令
    sidecar.write(JSON.stringify(command) + '\n');
  });
}

// 监听事件
export function onEvent(eventName: string, callback: (data: any) => void) {
  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, []);
  }

  eventListeners.get(eventName)!.push(callback);

  // 返回取消监听函数
  return () => {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  };
}

// Composable Hook
export function useTauriBridge() {
  // 确保 Sidecar 已启动
  startSidecar();

  return {
    sendCommand,
    onEvent,
  };
}
```

### 5.2 Dock 栏组件

**文件：** `src/components/Dock/Dock.vue`

```vue
<template>
  <div class="dock-container">
    <div class="dock">
      <TransitionGroup name="dock-item">
        <DockIcon
          v-for="app in displayApps"
          :key="app.id"
          :app="app"
          @click="handleAppClick(app)"
          @contextmenu.prevent="handleContextMenu(app, $event)"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTauriBridge } from '@/composables/useTauriBridge';
import DockIcon from './DockIcon.vue';

const { sendCommand, onEvent } = useTauriBridge();

interface App {
  id: string;
  title: string;
  icon: string;
  pid?: number;
  path?: string;
  isPinned: boolean;
  isRunning: boolean;
}

const pinnedApps = ref<App[]>([]);
const runningApps = ref<App[]>([]);

// 合并固定应用和正在运行的应用
const displayApps = computed(() => {
  const apps = new Map<string, App>();

  // 先添加固定的应用
  pinnedApps.value.forEach((app) => {
    apps.set(app.id, { ...app });
  });

  // 再添加正在运行的应用
  runningApps.value.forEach((app) => {
    if (apps.has(app.id)) {
      // 如果已存在（说明是固定的应用），标记为正在运行
      apps.get(app.id)!.isRunning = true;
      apps.get(app.id)!.pid = app.pid;
    } else {
      // 否则添加为临时应用
      apps.set(app.id, { ...app, isPinned: false, isRunning: true });
    }
  });

  return Array.from(apps.values());
});

// 请求运行中的应用列表
async function refreshRunningApps() {
  try {
    const result = await sendCommand('get_running_apps');
    runningApps.value = result.apps.map((app: any) => ({
      id: app.path,
      title: app.title,
      icon: extractIcon(app.path),
      pid: app.pid,
      path: app.path,
      isPinned: false,
      isRunning: true,
    }));
  } catch (error) {
    console.error('Failed to get running apps:', error);
  }
}

// 处理应用点击
async function handleAppClick(app: App) {
  if (app.isRunning && app.pid) {
    // 如果正在运行，聚焦窗口
    await sendCommand('focus_window', { pid: app.pid });
  } else {
    // 否则启动应用
    await sendCommand('launch_app', { path: app.path });
  }
}

// 处理右键菜单
function handleContextMenu(app: App, event: MouseEvent) {
  // TODO: 显示右键菜单（固定/取消固定、退出等）
}

// 监听应用列表更新事件
let unlistenAppListUpdated: (() => void) | null = null;

onMounted(() => {
  // 首次加载
  refreshRunningApps();

  // 定期刷新（或者监听 C++ 推送的事件）
  const interval = setInterval(refreshRunningApps, 2000);

  onUnmounted(() => {
    clearInterval(interval);
    if (unlistenAppListUpdated) {
      unlistenAppListUpdated();
    }
  });
});
</script>

<style scoped>
.dock-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
}

.dock {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(40px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Dock 图标动画 */
.dock-item-enter-active,
.dock-item-leave-active {
  transition: all 0.3s ease;
}

.dock-item-enter-from {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}

.dock-item-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}
</style>
```

### 5.3 系统监控小组件

**文件：** `src/components/Widgets/SystemMonitorWidget.vue`

```vue
<template>
  <div class="system-monitor-widget">
    <h3>系统监控</h3>
    <div class="stats">
      <div class="stat">
        <div class="label">CPU</div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: stats.cpu + '%' }"></div>
        </div>
        <div class="value">{{ stats.cpu }}%</div>
      </div>

      <div class="stat">
        <div class="label">内存</div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: stats.memory + '%' }"></div>
        </div>
        <div class="value">{{ stats.memory }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useTauriBridge } from '@/composables/useTauriBridge';

const props = defineProps<{
  widgetId: string;
}>();

const { sendCommand, onEvent } = useTauriBridge();

const stats = ref({
  cpu: 0,
  memory: 0,
});

let unlistenStats: (() => void) | null = null;

onMounted(async () => {
  // 监听数据更新
  const eventName = `widget_data_updated:${props.widgetId}`;
  unlistenStats = onEvent(eventName, (data) => {
    stats.value = {
      cpu: data.cpu,
      memory: data.memory,
    };
  });

  // 请求开始推送数据
  await sendCommand('get_widget_data', {
    widgetId: props.widgetId,
  });
});

onUnmounted(async () => {
  // 停止数据推送
  await sendCommand('stop_widget', {
    widgetId: props.widgetId,
  });

  if (unlistenStats) {
    unlistenStats();
  }
});
</script>

<style scoped>
.system-monitor-widget {
  width: 280px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 14px;
  color: #666;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  transition: width 0.5s ease;
}

.value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}
</style>
```

### 5.4 Tauri 配置文件

**文件：** `src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/1",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Aurora",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "sidecar": true,
        "scope": [
          {
            "name": "bin/AuroraCore",
            "sidecar": true,
            "args": []
          }
        ]
      },
      "window": {
        "all": true,
        "create": true,
        "center": true,
        "close": true,
        "hide": true,
        "maximize": true,
        "minimize": true,
        "show": true,
        "setAlwaysOnTop": true,
        "setDecorations": true,
        "setPosition": true,
        "setSize": true,
        "setSkipTaskbar": true,
        "setTitle": true,
        "startDragging": true
      },
      "fs": {
        "all": true,
        "scope": ["$DESKTOP/**", "$PICTURES/**", "$VIDEOS/**", "$HOME/**"]
      },
      "dialog": {
        "all": true,
        "open": true,
        "save": true
      },
      "path": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.aurora.desktop",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "externalBin": ["bin/AuroraCore"],
      "resources": ["assets/**"]
    },
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
    },
    "windows": [
      {
        "label": "main",
        "title": "Aurora 设置",
        "width": 900,
        "height": 650,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "visible": false,
        "center": true
      },
      {
        "label": "dock",
        "title": "Aurora Dock",
        "width": 1200,
        "height": 80,
        "resizable": false,
        "fullscreen": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visible": true,
        "center": true,
        "y": 950
      },
      {
        "label": "pet",
        "title": "Aurora Pet",
        "width": 150,
        "height": 150,
        "resizable": false,
        "fullscreen": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visible": true,
        "x": 100,
        "y": 100
      }
    ],
    "systemTray": {
      "iconPath": "icons/tray-icon.png",
      "iconAsTemplate": true,
      "menuOnLeftClick": false,
      "tooltip": "Aurora"
    }
  }
}
```

---

## 6. 通信协议与IPC机制

### 6.1 命令类型定义

**文件：** `src/types/ipc.d.ts`

```typescript
// ============ 命令类型定义 ============

export interface IPCCommand {
  action: string;
  payload: Record<string, any>;
  requestId: string;
}

export interface IPCEvent {
  event: string;
  data?: any;
  requestId?: string;
  timestamp?: number;
}

export interface IPCError {
  code: string;
  message: string;
  details?: string;
}

// ============ 壁纸相关 ============

export type WallpaperType = 'static' | 'video' | 'web';

export interface SetStaticWallpaperPayload {
  path: string;
}

export interface SetVideoWallpaperPayload {
  path: string;
  volume?: number;
  loop?: boolean;
}

export interface SetWebWallpaperPayload {
  url: string;
  enableAudio?: boolean;
}

// ============ Dock 相关 ============

export interface AppInfo {
  id: string;
  title: string;
  path: string;
  icon: string;
  pid?: number;
  hwnd?: number;
}

export interface RunningAppsResponse {
  apps: AppInfo[];
}

export interface LaunchAppPayload {
  path: string;
  args?: string[];
}

export interface FocusWindowPayload {
  pid: number;
}

// ============ 小组件相关 ============

export interface WidgetDataRequest {
  widgetId: string;
  params?: Record<string, any>;
}

export interface SystemMonitorData {
  cpu: number;
  memory: number;
  disk?: number;
  network?: {
    download: number;
    upload: number;
  };
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  location: string;
}

// ============ 类型导出 ============

export type CommandPayload =
  | SetStaticWallpaperPayload
  | SetVideoWallpaperPayload
  | SetWebWallpaperPayload
  | LaunchAppPayload
  | FocusWindowPayload
  | WidgetDataRequest;

export type EventData =
  | RunningAppsResponse
  | SystemMonitorData
  | WeatherData
  | IPCError;
```

### 6.2 错误处理机制

C++ 后端应该遵循统一的错误代码规范：

| 错误代码 | 描述 | 示例场景 |
|---------|------|----------|
| `JSON_PARSE_ERROR` | JSON 解析失败 | 前端发送的命令格式错误 |
| `UNKNOWN_COMMAND` | 未知命令 | action 字段值不在支持列表中 |
| `FILE_NOT_FOUND` | 文件不存在 | 设置壁纸时路径无效 |
| `PERMISSION_DENIED` | 权限不足 | 无法访问系统资源 |
| `WALLPAPER_INIT_ERROR` | 壁纸模块初始化失败 | libmpv 初始化失败 |
| `COMMAND_TIMEOUT` | 命令超时 | 操作耗时过长 |

---

## 7. 开发工作流

### 7.1 开发模式启动流程

```bash
# 1. 启动前确保 C++ 后端已编译
cd aurora-core
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
cmake --build .

# 2. 将编译好的 AuroraCore.exe 复制到 Tauri 目录
# Windows
copy .\bin\AuroraCore.exe ..\src-tauri\bin\

# Unix
cp ./bin/AuroraCore ../src-tauri/bin/

# 3. 启动 Tauri 开发模式
cd ../../
pnpm tauri dev
```

### 7.2 自动化构建脚本

**文件：** `scripts/build-cpp.bat`

```batch
@echo off
echo Building AuroraCore...

cd aurora-core
if not exist build mkdir build
cd build

cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%\scripts\buildsystems\vcpkg.cmake
if %errorlevel% neq 0 exit /b %errorlevel%

cmake --build . --config Release
if %errorlevel% neq 0 exit /b %errorlevel%

echo Copying AuroraCore.exe to Tauri bin...
copy .\bin\Release\AuroraCore.exe ..\..\src-tauri\bin\

echo Build completed successfully!
```

**文件：** `package.json` 添加脚本

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "pnpm build:cpp && tauri dev",
    "tauri:build": "pnpm build:cpp && tauri build",
    "build:cpp": "node scripts/build-cpp.js",
    "build:cpp:win": "scripts/build-cpp.bat",
    "build:cpp:unix": "bash scripts/build-cpp.sh"
  }
}
```

### 7.3 热重载配置

Vite 和 Tauri 默认支持前端代码的热重载。对于 C++ 后端的修改：

1. **开发阶段：** 手动重新编译 C++ 并重启 Tauri
2. **未来优化：** 可以通过文件监听自动重新编译和重启 Sidecar

---

## 8. 部署与打包

### 8.1 打包前检查清单

- [ ] C++ 后端已编译为 Release 模式
- [ ] 所有依赖库（libmpv.dll、WebView2Loader.dll）已复制到 `src-tauri/bin/`
- [ ] 前端代码已通过 TypeScript 类型检查（`pnpm vue-tsc`）
- [ ] 应用图标已准备（.ico、.icns、.png）
- [ ] `tauri.conf.json` 中的版本号已更新
- [ ] 应用签名证书已配置（可选，用于 Windows SmartScreen）

### 8.2 Windows 打包

```bash
# 1. 完整构建
pnpm tauri build

# 2. 输出位置
# src-tauri/target/release/bundle/msi/Aurora_0.1.0_x64_en-US.msi
# src-tauri/target/release/bundle/nsis/Aurora_0.1.0_x64-setup.exe
```

**打包配置优化：**

```json
// tauri.conf.json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.sectigo.com",
        "wix": {
          "language": "zh-CN"
        },
        "nsis": {
          "license": "LICENSE.txt",
          "displayLanguageSelector": false,
          "language": "SimpChinese"
        }
      }
    }
  }
}
```

### 8.3 自动更新配置（未来功能）

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.aurora-app.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

---

## 9. 性能优化指南

### 9.1 前端性能优化

1. **虚拟滚动**（如果 Dock 图标过多）
   ```typescript
   import { useVirtualList } from '@vueuse/core';
   ```

2. **防抖/节流**
   ```typescript
   import { useDebounceFn, useThrottleFn } from '@vueuse/core';
   
   const handleMouseMove = useThrottleFn((event) => {
     // Dock 放大效果计算
   }, 16); // 约 60fps
   ```

3. **懒加载小组件**
   ```vue
   <script setup>
   import { defineAsyncComponent } from 'vue';
   
   const SystemMonitorWidget = defineAsyncComponent(() =>
     import('./components/Widgets/SystemMonitorWidget.vue')
   );
   </script>
   ```

### 9.2 C++ 后端性能优化

1. **使用对象池避免频繁内存分配**
2. **系统监控使用异步线程，避免阻塞主循环**
3. **libmpv 启用硬件解码**
   ```cpp
   mpv_set_option_string(mpvHandle, "hwdec", "auto");
   mpv_set_option_string(mpvHandle, "vo", "gpu");
   ```

4. **缓存窗口枚举结果**（Dock 模块）
   ```cpp
   // 不要每次都 EnumWindows，使用增量更新
   ```

### 9.3 内存占用优化

- 限制小组件数量（最多 10 个同时运行）
- 视频壁纸播放时释放未使用的资源
- 定期清理 IPC 事件监听器

---

## 10. 安全性考虑

### 10.1 Tauri 安全配置

```json
{
  "tauri": {
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
      "dangerousRemoteDomainIpcAccess": []
    },
    "allowlist": {
      "all": false,
      // 仅启用必需的 API
    }
  }
}
```

### 10.2 C++ 后端安全

1. **路径验证**
   ```cpp
   bool isPathSafe(const std::string& path) {
       // 防止路径遍历攻击
       if (path.find("..") != std::string::npos) {
           return false;
       }
       return std::filesystem::exists(path);
   }
   ```

2. **命令白名单**
   ```cpp
   const std::set<std::string> ALLOWED_COMMANDS = {
       "set_static_wallpaper",
       "set_video_wallpaper",
       // ...
   };
   
   if (ALLOWED_COMMANDS.find(action) == ALLOWED_COMMANDS.end()) {
       throw std::runtime_error("Command not allowed");
   }
   ```

3. **限制网络请求**（小组件）
   - 仅允许 HTTPS 请求
   - 验证 API 响应格式

---

## 11. 测试策略

### 11.1 单元测试

**前端（Vitest）**

```bash
pnpm add -D vitest @vue/test-utils
```

**文件：** `src/__tests__/useTauriBridge.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { sendCommand } from '@/composables/useTauriBridge';

describe('Tauri Bridge', () => {
  it('should send command correctly', async () => {
    const mockCommand = vi.fn();
    // ... mock 实现
    
    await sendCommand('test_action', { param: 'value' });
    
    expect(mockCommand).toHaveBeenCalled();
  });
});
```

**C++（Google Test）**

```bash
vcpkg install gtest
```

```cpp
#include <gtest/gtest.h>
#include "wallpaper_module.h"

TEST(WallpaperModuleTest, SetStaticWallpaper) {
    WallpaperModule module;
    EXPECT_NO_THROW(module.setStaticWallpaper("test.jpg"));
}
```

### 11.2 集成测试

使用 Tauri 的 Webdriver 进行端到端测试：

```bash
pnpm add -D @tauri-apps/cli @tauri-apps/webdriver
```

### 11.3 性能测试

- 内存泄漏检测：Windows Performance Analyzer
- CPU 分析：Visual Studio Profiler
- 前端性能：Chrome DevTools

---

## 12. 常见问题与解决方案

### 12.1 Sidecar 进程无法启动

**问题：** Tauri 提示 "Failed to spawn sidecar"

**解决方案：**
1. 检查 `tauri.conf.json` 中的 `externalBin` 路径是否正确
2. 确保 `AuroraCore.exe` 在 `src-tauri/bin/` 目录下
3. Windows: 检查是否被杀毒软件拦截
4. 查看 Tauri 日志：`RUST_LOG=debug pnpm tauri dev`

### 12.2 视频壁纸黑屏

**问题：** 设置视频壁纸后桌面显示黑屏

**解决方案：**
1. 确认 libmpv.dll 在正确路径
2. 检查视频编码格式是否支持（推荐 H.264）
3. 验证 WorkerW 窗口是否找到：
   ```cpp
   if (!workerw) {
       logger.error("WorkerW not found");
   }
   ```

### 12.3 小组件无法接收数据

**问题：** SystemMonitorWidget 不显示 CPU/内存数据

**解决方案：**
1. 检查事件名是否匹配：
   ```typescript
   const eventName = `widget_data_updated:${widgetId}`;
   ```
2. 确认 C++ 后端是否正确 emit 事件
3. 查看浏览器控制台是否有 JSON 解析错误

### 12.4 内存占用过高

**问题：** 应用运行后内存占用超过 500MB

**排查步骤：**
1. 检查是否有内存泄漏（多次开关小组件后内存是否释放）
2. 限制视频壁纸分辨率
3. 检查是否创建了过多的 Tauri 窗口

---

## 13. 未来规划与扩展

### 13.1 短期目标（v0.2.0）

- [ ] 完善桌宠交互逻辑（拖拽、对话）
- [ ] 添加更多小组件（RSS 阅读器、便签）
- [ ] 支持自定义主题和皮肤
- [ ] 实现配置导入/导出
- [ ] 添加快捷键支持

### 13.2 中期目标（v0.5.0）

- [ ] 插件系统（支持第三方小组件）
- [ ] macOS 和 Linux 支持
- [ ] 在线壁纸库
- [ ] 云同步配置
- [ ] 多语言支持（i18n）

### 13.3 长期目标（v1.0.0）

- [ ] 小组件市场
- [ ] 社区主题分享平台
- [ ] AI 桌宠对话（集成 LLM）
- [ ] 桌面自动化脚本支持
- [ ] 性能监控面板

---

## 14. 参考资料

### 14.1 官方文档

- [Tauri 官方文档](https://tauri.app/zh-cn/)
- [Vue 3 官方文档](https://cn.vuejs.org/)
- [nlohmann/json 文档](https://json.nlohmann.me/)
- [libmpv 文档](https://mpv.io/manual/master/#embedding-into-other-programs-libmpv)
- [WebView2 文档](https://learn.microsoft.com/zh-cn/microsoft-edge/webview2/)

### 14.2 开源参考项目

- [Lively Wallpaper](https://github.com/rocksdanister/lively) - 动态壁纸实现参考
- [Wallpaper Engine (技术分析)](https://steamcommunity.com/sharedfiles/filedetails/?id=1396475780)
- [uTools](https://u.tools/) - 桌面工具集参考
- [Rainmeter](https://www.rainmeter.net/) - 小组件系统参考

### 14.3 技术文章

- [Windows 桌面壁纸背后的黑科技](https://www.codeproject.com/Articles/856020/Draw-Behind-Desktop-Icons-in-Windows)
- [Tauri vs Electron 性能对比](https://blog.logrocket.com/tauri-vs-electron-comparing-rust-frameworks/)
- [libmpv 集成指南](https://github.com/mpv-player/mpv-examples)

---

## 附录 A：Windows API 常用函数

| API 函数 | 用途 | 模块 |
|---------|------|------|
| `SystemParametersInfoW` | 设置静态壁纸 | Wallpaper |
| `FindWindowW` / `FindWindowExW` | 查找窗口句柄 | Wallpaper, Dock |
| `SetParent` | 设置父窗口 | Wallpaper |
| `EnumWindows` | 枚举所有窗口 | Dock |
| `GetWindowTextW` | 获取窗口标题 | Dock |
| `SetForegroundWindow` | 激活窗口 | Dock |
| `CreateProcess` | 启动进程 | Dock |
| `PdhOpenQuery` / `PdhCollectQueryData` | 性能计数器 | Widget |
| `GlobalMemoryStatusEx` | 获取内存信息 | Widget |

---

## 附录 B：项目编码规范

### TypeScript

- 使用 ESLint + Prettier
- 强制类型注解
- 优先使用 Composition API
- 组件文件名使用 PascalCase

### C++

- 遵循 Google C++ Style Guide
- 使用 clang-format 格式化
- 命名规范：
  - 类名：PascalCase
  - 函数名：camelCase
  - 变量名：snake_case
  - 常量：UPPER_SNAKE_CASE

### Git Commit

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：feat, fix, docs, style, refactor, perf, test, chore

---

## 结语

Aurora 项目是一个技术挑战性较高的桌面应用，涉及前端、后端、系统底层 API、多媒体处理等多个领域。本文档提供了详细的技术架构和实现指南，但实际开发中还需要根据具体情况进行调整和优化。

**开发团队建议：**
- 前端开发者：1-2 人（负责 Vue UI、Tauri 集成）
- C++ 开发者：1-2 人（负责核心模块、系统 API）
- 设计师：1 人（UI/UX 设计、动画效果）

**预计开发周期：**
- MVP 版本（核心功能）：2-3 个月
- Beta 版本（功能完善）：4-6 个月
- 正式版本（优化、测试）：6-9 个月

祝开发顺利！🚀

