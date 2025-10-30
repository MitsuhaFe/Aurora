# **项目 "Aurora" 桌面美化软件 \- 开发文档**

## **1\. 项目概述**

项目名称： Aurora (极光)  
项目目标： 开发一款轻量级、高性能、可定制的桌面美化软件。  
**核心功能：**

1. **Dock 栏：** 动态、可交互的应用程序启动器和任务栏。  
2. **动态/静态壁纸：** 支持视频、网页和静态图片作为桌面背景。  
3. **虚拟桌宠：** 可交互的桌面宠物。  
4. **小组件 (Widgets)：** 桌面小组件（如天气、时钟、系统监视器）。

**技术栈：**

* **后端（核心逻辑）：** C++  
* **前端（UI 界面）：** Vue 3

## **2\. 技术架构设计**

为了实现“轻量级”和“高效性”，我们将避免使用 Electron 这样打包完整浏览器的框架。我们将采用一种混合架构：**Tauri 作为前端容器，C++ 作为“Sidecar”后端**。

### **2.1 架构选型**

1. **前端容器：Tauri**  
   * **为什么？** Tauri 不打包 Chromium，而是使用操作系统的原生 WebView（Windows 上的 WebView2，macOS 上的 WebKit）。这使得应用体积非常小（安装包仅几 MB），内存占用极低。  
   * **角色：** 负责创建窗口、渲染 Vue.js 构建的 UI、并提供一个与 C++ 后端通信的桥梁。  
2. **前端框架：Vue 3**  
   * **为什么？** Vue 3 及其 Composition API 提供了优秀的开发体验和性能，适合构建数据驱动的、响应式的 UI 界面（如设置面板、Dock 栏、小组件）。  
   * **角色：** 渲染所有用户可见的窗口，包括设置界面、Dock 栏、桌宠以及所有小组件。  
3. **后端核心：C++ Sidecar (旁路执行文件)**  
   * **为什么？** 核心功能（如窗口管理、系统 API 调用、渲染）以及**小组件的数据提供**（如系统监控、API 访问）必须由高性能的本地代码执行。  
   * **角色：** 作为一个单独的 .exe 可执行文件（我们称之为 AuroraCore.exe），由 Tauri 启动和管理。它负责处理所有与操作系统底层交互的繁重任务和数据拉取。

### **2.2 通信协议**

前端 (Vue) 和后端 (C++) 之间不使用 HTTP。我们将使用 Tauri 提供的标准 IPC (进程间通信) 机制，通过 stdin (标准输入) 和 stdout (标准输出) 进行通信。

* **Vue \-\> C++ (命令):**  
  1. Vue 调用 Tauri 的 invoke API。  
  2. Tauri 将一个 JSON 格式的命令字符串（例如 {"action": "set\_wallpaper", "path": "..."} 或 {"action": "get\_widget\_data", "widgetId": "cpu\_monitor"}）发送到 C++ 进程的 stdin。  
* **C++ \-\> Vue (事件/响应):**  
  1. C++ 核心完成任务或需要发送事件时。  
  2. C++ 向其 stdout 打印一个 JSON 格式的事件字符串（例如 {"event": "app\_list\_updated", "apps": \[...\]} 或 {"event": "widget\_data\_updated", "widgetId": "cpu\_monitor", "data": ...}）。  
  3. Tauri 监听 stdout，捕获这个 JSON，并将其作为事件转发给 Vue 前端。

### **2.3 架构图**

\[ 用户 (User) \]  
    |  
    v  
\+-------------------------------------------------+  
|   Tauri 窗口 (使用 OS 原生 WebView)             |  
|                                                 |  
|  \[ 前端 UI (Vue.js) \]                           |  
|   \- 设置面板 (Settings.vue)                     |  
|   \- Dock 栏渲染 (Dock.vue)                      |  
|   \- 桌宠渲染 (Pet.vue)                          |  
|   \- 小组件渲染 (WeatherWidget.vue, etc.)        |  
|                                                 |  
\+-------------------------------------------------+  
    |         ^  
    | (命令)  | (事件)  
    | (JSON   | (JSON  
    | via     | via  
    | stdin)  | stdout)  
    v         |  
\+-------------------------------------------------+  
|   C++ 后端: AuroraCore.exe (Tauri Sidecar)      |  
|                                                 |  
|  \[ JSON 命令解析器 (nlohmann/json) \]            |  
|                                                 |  
|  \[ 核心模块 (C++) \]                             |  
|   \- 壁纸模块 (调用 WinAPI, 集成 libmpv/WebView2) |  
|   \- Dock 逻辑 (枚举窗口, 启动进程)              |  
|   \- 桌宠逻辑 (透明窗口)                         |  
|   \- 小组件模块 (获取系统/API数据)               |  
|                                                 |  
\+-------------------------------------------------+  
    |  
    v  
\[ 操作系统 API (Windows API, Cocoa, etc.) \]

## **3\. 核心模块设计 \- C++ 后端 (AuroraCore)**

后端应被编译为一个单独的、无窗口的控制台应用程序。它通过 stdin/stdout 接收和发送 JSON 数据。

**推荐 C++ 库：**

* nlohmann/json：用于轻松解析和生成 JSON 字符串。  
* libmpv (或 libVLC)：用于视频壁纸播放。  
* WebView2 SDK：用于网页壁纸渲染（Windows）。  
* cpr (C++ Requests, libcurl 的封装)：用于小组件进行 HTTP API 请求（如天气）。

### **3.1 主循环与命令解析 (C++ 伪代码)**

// AuroraCore.cpp  
\#include \<iostream\>  
\#include \<string\>  
\#include "nlohmann/json.hpp"  
// \#include "WallpaperModule.h" // 处理壁纸的模块  
// \#include "DockModule.h"      // 处理Dock的模块  
// \#include "WidgetModule.h"    // 处理小组件数据的模块

using json \= nlohmann::json;

// 向前端发送事件  
void emit\_event(const json& event\_payload) {  
    // 确保立即刷新 stdout，以便 Tauri 能捕获  
    std::cout \<\< event\_payload.dump() \<\< std::endl;   
}

// 处理来自前端的命令  
void handle\_command(const json& cmd) {  
    std::string action \= cmd.value("action", "");

    if (action \== "set\_static\_wallpaper") {  
        // ... 调用 WallpaperModule::setStatic(cmd\["path"\])  
        // 响应  
        emit\_event({{"event", "wallpaper\_changed"}, {"status", "success"}});  
    }   
    else if (action \== "set\_dynamic\_wallpaper") {  
        // ... 调用 WallpaperModule::setDynamic(cmd\["type"\], cmd\["path"\])  
    }  
    else if (action \== "get\_running\_apps") {  
        // ... 调用 DockModule::getRunningApps()  
        // 响应 (假设 getRunningApps 返回一个 json 对象)  
        // json apps \= DockModule::getRunningApps();  
        // emit\_event({{"event", "app\_list\_updated"}, {"apps", apps}});  
    }  
    else if (action \== "get\_widget\_data") {  
        // ... 调用 WidgetModule::getData(cmd\["widgetId"\], cmd.value("params", json::object()))  
        // WidgetModule 内部会异步获取数据，并通过 emit\_event 推送更新  
    }  
    // ... 其他命令  
}

int main() {  
    std::string line;  
    // 从 stdin 循环读取命令  
    while (std::getline(std::cin, line)) {  
        if (line.empty()) continue;

        try {  
            json cmd \= json::parse(line);  
            handle\_command(cmd);  
        } catch (json::parse\_error& e) {  
            // 发生错误时，也通过 stdout 报告  
            emit\_event({{"event", "error"}, {"message", e.what()}});  
        }  
    }  
    return 0;  
}

### **3.2 壁纸模块 (Wallpaper Module)**

这是 C++ 后端最复杂的模块之一。参考 Lively Wallpaper 和 Wallpaper Engine 的实现，我们必须使用 Windows API (如 FindWindow, SetParent) 来找到桌面图标下的 WorkerW 窗口，并将我们的渲染窗口作为其子窗口。

前端的职责不变：提供 UI 选项，并通过 IPC 将选择（如文件路径、URL）发送给 C++ 后端。

后端的实现应分为三类：

* **静态壁纸 (C++)：**  
  * 在 Windows 上，使用 SystemParametersInfo 函数配合 SPI\_SETDESKWALLPAPER 标志来设置。这非常轻量。  
* **动态壁纸 (视频) (C++)：**  
  * **挑战：** 避免从零实现复杂的视频解码和渲染。  
  * **方案 (参考 Lively)：**  
    1. C++ 核心仍然创建无边框窗口并将其 SetParent 到 WorkerW。  
    2. **集成 libmpv (推荐) 或 libVLC。** mpv 是一个极其轻量、高性能的媒体播放器核心。  
    3. C++ 代码获取 WorkerW 子窗口的句柄 (HWND)。  
    4. C++ 代码初始化 libmpv 实例，并**将其渲染输出重定向到这个 HWND**。  
  * **优势：** 我们将复杂的视频解码、音频播放、渲染循环全部交给了 mpv，C++ 代码只负责窗口管理和库的调用，开发难度**指数级下降**。  
* **动态壁纸 (网页) (C++)：**  
  * **挑战：** 如何在 WorkerW 后面渲染一个网页（如交互式 WebGL 场景）。  
  * **方案 (参考 Lively 的 WebView2 模式)：**  
    1. C++ 核心创建 WorkerW 子窗口。  
    2. C++ 代码**不使用 Tauri** 来创建这个窗口，而是直接调用 Windows API 来**实例化一个 WebView2 (Edge Chromium) 控制器**。（Tauri 本身也是基于 WebView2，这等于我们在 C++ 中手动创建了一个 Tauri 的“内核”）。  
    3. C++ 将这个 WebView2 控制器附加（attach）到 WorkerW 子窗口上。  
    4. C++ 命令 WebView2 导航到一个 URL (例如 file:///.../wallpaper.html 或 https://...)。  
  * **优势：** 此方案利用了系统已安装的 Edge WebView2，实现了高性能、低占用的网页壁纸，**避免了像 Lively 那样打包沉重的 CefSharp**。

### **3.3 Dock 栏模块 (Dock Module)**

这个模块是**前后端协作**的。

* **前端 (Vue)：**  
  * Tauri 会创建一个特殊的、无边框、透明、始终置顶的窗口来承载 Vue 渲染的 Dock UI。  
  * Vue 负责渲染所有图标、动画（如放大效果）、上下文菜单。  
* **后端 (C++)：**  
  * **职责：** 提供数据和执行动作。  
  * **命令 get\_pinned\_apps:** 从配置文件（如 JSON）中读取用户固定的应用。  
  * **命令 get\_running\_apps:** 枚举当前打开的窗口 (EnumWindows)，过滤掉不可见的和系统的，提取窗口标题、PID 和图标。  
  * **命令 launch\_app(path):** 启动一个新进程 (CreateProcess)。  
  * **命令 focus\_window(pid):** 将指定 PID 的窗口带到前台 (SetForegroundWindow)。  
  * **事件 app\_list\_updated:** C++ 后端应监控系统窗口变化，并主动向前端推送最新的应用列表。

### **3.4 虚拟桌宠 (Desktop Pet Module)**

为了追求轻量级，我们**推荐使用前端方案**，而不是 C++。

* **方案（推荐）：Tauri 多窗口**  
  1. Tauri 可以创建*多个*窗口。  
  2. 我们创建一个新的、小的、无边框、透明的窗口（pet\_window）。  
  3. 这个窗口加载一个单独的 Vue 路由 (/pet)。  
  4. Vue (HTML/CSS/JS) 负责渲染宠物的 \<img\> 或 \<canvas\>、处理动画（CSS 动画或 requestAnimationFrame）以及拖拽逻辑。  
* **为什么不用 C++？**  
  * C++ 实现桌宠需要创建另一个透明、可点击穿透（WS\_EX\_TRANSPARENT）的窗口，并自己管理 GDI+/DirectX 渲染循环。  
  * 而 Vue/CSS 方案利用了现代浏览器的硬件加速渲染，实现更简单，性能同样出色，且易于更换皮肤（只需更改图片或 CSS）。  
* **C++ 职责：** 仅用于保存和读取桌宠的位置、大小等配置信息。

### **3.5 小组件模块 (Widget Module)**

此模块采用与“虚拟桌宠”类似的 **Tauri 多窗口**方案，但增加了 C++ 后端的数据支持。

* **前端 (Vue / Tauri):**  
  1. Tauri 为每个激活的小组件（如时钟、天气、系统监视器）创建一个独立的、无边框、透明、可拖拽的窗口。  
  2. 每个窗口加载一个特定的 Vue 路由（如 /widget/clock）。  
  3. Vue 负责渲染 UI 和动画。  
  4. 对于需要外部数据的小组件（如天气、CPU使用率），Vue 会向 C++ 后端发送命令请求数据：runCommand({ action: 'get\_widget\_data', widgetId: 'system\_monitor' })。  
  5. Vue onEvent('widget\_data\_updated', ...) 监听 C++ 推送的数据并更新 UI。  
* **后端 (C++):**  
  1. **职责：** 充当数据提供者。  
  2. **命令 get\_widget\_data:** C++ 接收请求，根据 widgetId 执行相应操作（例如：调用 WinAPI 获取 CPU/RAM 使用率，或使用 cpr/curl 库请求天气 API）。  
  3. 事件 widget\_data\_updated: C++ 获取数据后，主动向前端推送更新事件。为了效率（例如系统监视器），C++ 可能会启动一个定时器，定期推送事件，而不是等待前端请求。  
     emit\_event({{"event", "widget\_data\_updated"}, {"widgetId": "system\_monitor"}, {"data": {"cpu": 15, "ram": 45}}});

## **4\. 前端设计 (Vue 3\)**

前端项目将是一个标准的 Vue 3 \+ Vite \+ TypeScript 项目，在 Tauri 容器中运行。

### **4.1 目录结构 (示例)**

/src  
 ├── assets/          \# 图片、字体、桌宠精灵图  
 ├── components/  
 │   ├── Dock/  
 │   │   ├── Dock.vue  
 │   │   └── DockIcon.vue  
 │   ├── Wallpaper/  
 │   │   └── WallpaperSettings.vue  
 │   ├── Settings/  
 │   │   └── MainPanel.vue  
 │   └── Widgets/     \# 小组件 UI  
 │       ├── WeatherWidget.vue  
 │       ├── SystemMonitorWidget.vue  
 │       └── ClockWidget.vue  
 ├── composables/     \# Vue Composition API  
 │   └── useTauriBridge.js \# 封装与C++后端的通信  
 ├── styles/          \# 全局 CSS  
 ├── windows/         \# 对应Tauri的多窗口配置  
 │   ├── main/        \# 主设置窗口 (main.js, App.vue)  
 │   ├── dock/        \# Dock栏窗口 (dock.js, DockApp.vue)  
 │   ├── pet/         \# 桌宠窗口 (pet.js, PetApp.vue)  
 │   └── widget/      \# 承载所有小组件的路由/页面  
 └── tauri.conf.json  \# 关键：Tauri 配置文件

### **4.2 关键：tauri.conf.json**

这是连接一切的纽带。

{  
  "build": {  
    "distDir": "../dist" // 指向 Vue build 的输出目录  
  },  
  "package": {  
    "productName": "Aurora",  
    "version": "0.1.0"  
  },  
  "tauri": {  
    "allowlist": {  
      "all": false, // 默认关闭所有API  
      "shell": {  
        "sidecar": true, // 允许执行 sidecar  
        "scope": \[  
          {  
            "name": "bin/AuroraCore", // 仅允许执行这个  
            "cmd": "bin/AuroraCore",  
            "args": \[\]  
          }  
        \]  
      },  
      "window": {  
        "create": true, // 允许创建多窗口  
        "all": true // 允许操作窗口 (show/hide/setSize etc.)  
      },  
      "event": {  
        "emit": true, // 允许前端发送事件  
        "listen": true // 允许前端监听事件  
      },  
      "fs": { // 允许文件系统操作 (用于选择壁纸)  
        "scope": \["$DESKTOP/\*", "$PICTURES/\*", "$VIDEOS/\*"\],  
        "all": true  
      },  
      "dialog": { // 允许打开文件选择对话框  
        "all": true  
      },  
      "http": { // 允许 Vue 直接请求 API (如果选择前端获取天气)  
        "all": true   
      }  
    },  
    // 1\. 配置 C++ Sidecar  
    "bundle": {  
      "externalBin": \[  
        "bin/AuroraCore" // 假设 C++ 编译后放在这里 (相对 /src-tauri)  
      \]  
    },  
    // 2\. 配置多个窗口  
    "windows": \[  
      {  
        "label": "main", // 主设置窗口  
        "title": "Aurora Settings",  
        "width": 800,  
        "height": 600,  
        "decorations": true, // 有边框  
        "visible": false // 启动时隐藏, 点击托盘图标显示  
      },  
      {  
        "label": "dock", // Dock 栏窗口  
        "url": "windows/dock/index.html",  
        "width": "80%",  
        "height": 80,  
        "decorations": false, // 无边框  
        "transparent": true,  
        "alwaysOnTop": true,  
        "skipTaskbar": true, // 不在任务栏显示  
        "center": true,  
        "y": "90%" // 粗略定位在底部  
      },  
      {  
        "label": "pet", // 桌宠窗口  
        "url": "windows/pet/index.html",  
        "width": 150,  
        "height": 150,  
        "decorations": false,  
        "transparent": true,  
        "alwaysOnTop": true,  
        "skipTaskbar": true  
      }  
      // 注意：小组件窗口 (Widget windows) 不会在这里静态定义。  
      // 它们将由 "main" (设置) 窗口根据用户配置，使用 Tauri 的   
      // new WebviewWindow(...) API 动态创建。  
    \],  
    "systemTray": {  
      "iconPath": "icons/tray-icon.png"  
      // ... 可以在此定义托盘菜单  
    }  
  }  
}

### **4.3 Vue 与 C++ 通信封装 (伪代码)**

我们创建一个 useTauriBridge.js 来简化通信。

// composables/useTauriBridge.js  
import { ref, onUnmounted, reactive } from 'vue';  
import { emit, listen } from '@tauri-apps/api/event';  
import { Command } from '@tauri-apps/api/shell';

// C++ Sidecar 的句柄，设计为单例  
let sidecarProcess \= null;  
let listeners \= reactive(new Map()); // 存储事件回调

// 启动并管理 Sidecar 进程  
async function getSidecar() {  
    if (sidecarProcess) {  
        return sidecarProcess;  
    }

    const process \= new Command('bin/AuroraCore'); // 对应 tauri.conf.json  
      
    // 监听 C++ 的 stdout (事件)  
    process.stdout.on('data', (line) \=\> {  
        try {  
            const event \= JSON.parse(line);  
              
            // 检查是广播事件 (app\_list\_updated) 还是定向事件 (widget\_data\_updated)  
            let eventName \= event.event;  
            if (event.widgetId) {  
                // 如果是小组件事件, 我们将事件名定位到特定ID  
                eventName \= \`${event.event}:${event.widgetId}\`;   
            }

            if (listeners.has(eventName)) {  
                // 调用所有注册的该事件的回调  
                listeners.get(eventName).forEach(callback \=\> callback(event.data));  
            }  
        } catch (e) {  
            console.error("C++ stdout parse error:", line, e);  
        }  
    });

    // 监听 C++ 的 stderr (错误日志)  
    process.stderr.on('data', (line) \=\> {  
        console.error("C++ Error:", line);  
    });  
      
    // 监听 C++ 进程关闭  
    process.on('close', (data) \=\> {  
        console.warn("C++ Sidecar process closed.", data);  
        sidecarProcess \= null; // 标记为已关闭  
    });

    sidecarProcess \= await process.spawn();  
    return sidecarProcess;  
}

// 统一的命令发送函数  
export async function runCommand(payload) {  
    const sidecar \= await getSidecar();  
    if (sidecar) {  
        await sidecar.write(JSON.stringify(payload) \+ '\\n');  
    }  
}

// 供 Vue 组件调用的 hook  
export function useTauriBridge() {

    // 注册监听来自 C++ 的事件  
    // eventName: 'app\_list\_updated'  
    // eventName (for widget): 'widget\_data\_updated:system\_monitor'  
    function onEvent(eventName, callback) {  
        if (\!listeners.has(eventName)) {  
            listeners.set(eventName, \[\]);  
        }  
        listeners.get(eventName).push(callback);

        // 返回一个取消监听的函数  
        return () \=\> {  
            const index \= listeners.get(eventName).indexOf(callback);  
            if (index \> \-1) {  
                listeners.get(eventName).splice(index, 1);  
            }  
        };  
    }

    // 确保启动  
    getSidecar();

    return { runCommand, onEvent };  
}

// \------------------------------------------  
// 示例：在 SystemMonitorWidget.vue 中使用  
// \------------------------------------------  
/\*  
import { onMounted, onUnmounted, ref } from 'vue';  
import { useTauriBridge } from '@/composables/useTauriBridge';

export default {  
    props: {  
        widgetId: String // e.g. "system\_monitor\_1"  
    },  
    setup(props) {  
        const { runCommand, onEvent } \= useTauriBridge();  
        const stats \= ref({ cpu: 0, ram: 0 });  
        let unlistenStats \= null;

        onMounted(() \=\> {  
            // 1\. 监听 C++ 转发来的、针对这个特定ID的事件  
            const eventName \= \`widget\_data\_updated:${props.widgetId}\`;  
            unlistenStats \= onEvent(eventName, (data) \=\> {  
                stats.value \= data;  
            });  
              
            // 2\. 向 C++ 请求初始数据 (C++ 后端可能会启动一个定时器)  
            runCommand({ action: 'get\_widget\_data', widgetId: props.widgetId });  
        });  
          
        onUnmounted(() \=\> {  
            if (unlistenStats) unlistenStats(); // 组件销毁时取消监听  
        });  
          
        return { stats };  
    }  
}  
\*/

## **5\. 开发工作流与部署**

1. **C++ 开发：**  
   * 使用 CMake 和 MSVC (Windows) / Clang (macOS) / GCC (Linux) 构建 AuroraCore。  
   * 确保编译目标是 RelWithDebInfo 或 Release 以保证性能。  
   * 将编译好的可执行文件（如 AuroraCore.exe）复制到 Vue 项目的 /src-tauri/bin/ 目录下。  
2. **Vue 开发：**  
   * 运行 npm run tauri dev。  
   * Tauri 会同时启动 Vue 的 Vite 开发服务器和 C++ Sidecar 进程。  
   * 在浏览器中进行 UI 调试。  
3. **打包部署：**  
   * 运行 npm run tauri build。  
   * Tauri 会自动：  
     1. 编译 Vue 前端。  
     2. 拉取 tauri.conf.json 中 externalBin 指定的 AuroraCore.exe。  
     3. 将 Vue 的产物和 C++ 后端打包成一个单一的、轻量级的本地安装包（.msi 或 .AppImage 或 .dmg）。

## **6\. 关键挑战和风险**

1. **动态壁纸的稳定性 (高风险):**  
   * 在 Windows 上操作 WorkerW 窗口是一种“黑科技”手段，可能随 Windows 更新而失效。  
   * libmpv 和 WebView2 的 C++ 集成需要精确的窗口句柄操作和生命周期管理，是项目的技术难点。  
2. **跨平台 C++ 代码 (高成本):**  
   * 本架构设计（尤其是壁纸、Dock 和系统监控小组件）高度依赖特定平台的 API（如 WinAPI）。  
   * 如果要支持 macOS/Linux，C++ 核心模块需要为每个平台编写完全不同的本地代码（使用 Cocoa, X11 等）。  
3. **IPC 通信健壮性：**  
   * 必须确保 C++ 后端进程异常崩溃时，前端能得到通知并尝试重启它。useTauriBridge.js 中的 on('close') 回调是实现这一点的起点。  
4. **多窗口管理 (中风险):**  
   * 应用需要精确管理大量窗口（Dock、Pet、多个 Widgets）的生命周期、位置和状态，并持久化保存它们（以便下次启动时恢复）。