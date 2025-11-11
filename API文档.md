# Aurora API 文档

## 📖 目录

1. [IPC 通信协议](#ipc-通信协议)
2. [前端 API](#前端-api)
3. [后端命令](#后端命令)
4. [事件系统](#事件系统)
5. [Store API](#store-api)
6. [类型定义](#类型定义)

---

## IPC 通信协议

Aurora 使用 **JSON** 格式进行前后端通信。

### 通信流程

```
Vue 前端 → IPC Command (JSON) → C++ 后端
                  ↓
                处理命令
                  ↓
C++ 后端 → IPC Event (JSON) → Vue 前端
```

### 命令格式（前端 → 后端）

```json
{
  "action": "command_name",
  "payload": {
    "param1": "value1",
    "param2": 123
  },
  "requestId": "uuid-1234-5678"
}
```

**字段说明：**
- `action` (string): 命令名称
- `payload` (object): 命令参数
- `requestId` (string, 可选): 请求 ID，用于匹配响应

### 事件格式（后端 → 前端）

```json
{
  "event": "event_name",
  "data": {
    "key1": "value1",
    "key2": 456
  },
  "requestId": "uuid-1234-5678",
  "timestamp": 1672531200000
}
```

**字段说明：**
- `event` (string): 事件名称
- `data` (object): 事件数据
- `requestId` (string, 可选): 对应的请求 ID
- `timestamp` (number, 可选): 时间戳

### 错误格式

```json
{
  "event": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细信息"
  },
  "requestId": "uuid-1234-5678"
}
```

---

## 前端 API

### useTauriBridge

**文件：** `src/composables/useTauriBridge.ts`

#### sendCommand

发送命令到 C++ 后端。

```typescript
async function sendCommand(
  action: string,
  payload?: Record<string, any>
): Promise<void>
```

**参数：**
- `action` (string): 命令名称
- `payload` (object, 可选): 命令参数

**示例：**
```typescript
import { sendCommand } from '@/composables/useTauriBridge'

// 设置静态壁纸
await sendCommand('set_static_wallpaper', {
  path: 'D:/Pictures/wallpaper.jpg'
})

// 获取运行中的应用
await sendCommand('get_running_apps')
```

#### onEvent

监听后端事件。

```typescript
function onEvent(
  eventName: string,
  callback: (data: any) => void
): () => void
```

**参数：**
- `eventName` (string): 事件名称
- `callback` (function): 回调函数

**返回值：**
- (function): 取消监听的函数

**示例：**
```typescript
import { onEvent } from '@/composables/useTauriBridge'

// 监听壁纸变化事件
const unlisten = onEvent('wallpaper_changed', (data) => {
  console.log('壁纸已变更:', data)
})

// 取消监听
unlisten()
```

#### startSidecar

启动 C++ 后端进程（自动调用）。

```typescript
async function startSidecar(): Promise<void>
```

---

## 后端命令

### 壁纸命令

#### set_static_wallpaper

设置静态壁纸。

**命令：**
```json
{
  "action": "set_static_wallpaper",
  "payload": {
    "path": "D:/Pictures/wallpaper.jpg"
  }
}
```

**参数：**
- `path` (string): 图片文件路径

**支持格式：** JPG, PNG, BMP, WEBP

**响应事件：** `wallpaper_changed`

**示例：**
```typescript
await sendCommand('set_static_wallpaper', {
  path: 'D:/Pictures/wallpaper.jpg'
})
```

---

#### set_dynamic_wallpaper

设置动态壁纸（视频）。

**命令：**
```json
{
  "action": "set_dynamic_wallpaper",
  "payload": {
    "path": "D:/Videos/wallpaper.mp4"
  }
}
```

**参数：**
- `path` (string): 视频文件路径

**支持格式：** MP4, MKV, AVI, WEBM

**响应事件：** `wallpaper_changed`

**示例：**
```typescript
await sendCommand('set_dynamic_wallpaper', {
  path: 'D:/Videos/wallpaper.mp4'
})
```

---

#### stop_wallpaper

停止当前壁纸。

**命令：**
```json
{
  "action": "stop_wallpaper"
}
```

**参数：** 无

**响应事件：** `wallpaper_stopped`

**示例：**
```typescript
await sendCommand('stop_wallpaper')
```

---

#### get_current_wallpaper

获取当前壁纸信息。

**命令：**
```json
{
  "action": "get_current_wallpaper"
}
```

**参数：** 无

**响应事件：** `current_wallpaper_info`

**响应数据：**
```json
{
  "type": "static|dynamic",
  "path": "D:/Pictures/wallpaper.jpg"
}
```

**示例：**
```typescript
await sendCommand('get_current_wallpaper')

onEvent('current_wallpaper_info', (data) => {
  console.log('当前壁纸:', data)
})
```

---

### Dock 命令

#### get_running_apps

获取正在运行的应用列表。

**命令：**
```json
{
  "action": "get_running_apps"
}
```

**参数：** 无

**响应事件：** `app_list_updated`

**响应数据：**
```json
{
  "apps": [
    {
      "id": "chrome.exe",
      "title": "Google Chrome",
      "path": "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "icon": "base64_encoded_icon",
      "pid": 12345,
      "hwnd": 67890
    }
  ]
}
```

**示例：**
```typescript
await sendCommand('get_running_apps')

onEvent('app_list_updated', (data) => {
  const apps = data.apps
  console.log('运行中的应用:', apps)
})
```

---

#### launch_app

启动应用程序。

**命令：**
```json
{
  "action": "launch_app",
  "payload": {
    "path": "C:/Program Files/App/app.exe"
  }
}
```

**参数：**
- `path` (string): 应用程序路径

**响应事件：** `app_launched`

**响应数据：**
```json
{
  "success": true,
  "pid": 12345
}
```

**示例：**
```typescript
await sendCommand('launch_app', {
  path: 'C:/Program Files/App/app.exe'
})
```

---

#### focus_window

将指定窗口置于前台。

**命令：**
```json
{
  "action": "focus_window",
  "payload": {
    "pid": 12345
  }
}
```

**参数：**
- `pid` (number): 进程 ID

**响应事件：** `window_focused`

**示例：**
```typescript
await sendCommand('focus_window', {
  pid: 12345
})
```

---

#### close_app

关闭应用程序。

**命令：**
```json
{
  "action": "close_app",
  "payload": {
    "pid": 12345
  }
}
```

**参数：**
- `pid` (number): 进程 ID

**响应事件：** `app_closed`

**示例：**
```typescript
await sendCommand('close_app', {
  pid: 12345
})
```

---

### 小组件命令

#### get_widget_data

获取小组件数据。

**命令：**
```json
{
  "action": "get_widget_data",
  "payload": {
    "widgetId": "system_monitor",
    "params": {
      "interval": 1000
    }
  }
}
```

**参数：**
- `widgetId` (string): 小组件 ID
- `params` (object): 参数

**支持的小组件：**
- `system_monitor` - 系统监控
- `weather` - 天气
- `clock` - 时钟

**响应事件：** `widget_data_updated`

**响应数据（system_monitor）：**
```json
{
  "widgetId": "system_monitor",
  "data": {
    "cpu": 45,
    "memory": 60,
    "disk": 70,
    "network": {
      "download": 1024,
      "upload": 512
    }
  }
}
```

**示例：**
```typescript
await sendCommand('get_widget_data', {
  widgetId: 'system_monitor',
  params: { interval: 1000 }
})

onEvent('widget_data_updated', (data) => {
  if (data.widgetId === 'system_monitor') {
    console.log('CPU:', data.data.cpu + '%')
  }
})
```

---

#### stop_widget

停止小组件数据推送。

**命令：**
```json
{
  "action": "stop_widget",
  "payload": {
    "widgetId": "system_monitor"
  }
}
```

**参数：**
- `widgetId` (string): 小组件 ID

**响应事件：** `widget_stopped`

**示例：**
```typescript
await sendCommand('stop_widget', {
  widgetId: 'system_monitor'
})
```

---

## 事件系统

### 系统事件

#### error

错误事件。

**数据格式：**
```json
{
  "event": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细信息"
  }
}
```

**错误代码：**
- `FILE_NOT_FOUND` - 文件不存在
- `INVALID_FORMAT` - 格式无效
- `COMMAND_FAILED` - 命令执行失败
- `PERMISSION_DENIED` - 权限被拒绝

**示例：**
```typescript
onEvent('error', (data) => {
  console.error('错误:', data.error.message)
})
```

---

### 壁纸事件

#### wallpaper_changed

壁纸已更改。

**数据格式：**
```json
{
  "event": "wallpaper_changed",
  "data": {
    "type": "static",
    "path": "D:/Pictures/wallpaper.jpg",
    "success": true
  }
}
```

#### wallpaper_stopped

壁纸已停止。

**数据格式：**
```json
{
  "event": "wallpaper_stopped",
  "data": {
    "success": true
  }
}
```

---

### Dock 事件

#### app_list_updated

应用列表已更新。

**数据格式：**
```json
{
  "event": "app_list_updated",
  "data": {
    "apps": [ /* 应用列表 */ ]
  }
}
```

#### app_launched

应用已启动。

#### window_focused

窗口已置于前台。

#### app_closed

应用已关闭。

---

### 小组件事件

#### widget_data_updated

小组件数据已更新（定期推送）。

---

## Store API

### useWallpaperStore

**文件：** `src/stores/wallpaperStore.ts`

#### State

```typescript
interface WallpaperState {
  current: {
    type: 'static' | 'video' | 'web' | null
    path: string
    config: Record<string, any>
  }
  history: Array<{
    type: string
    path: string
    timestamp: number
  }>
  isLoading: boolean
}
```

#### Actions

##### setStaticWallpaper

```typescript
async function setStaticWallpaper(path: string): Promise<void>
```

设置静态壁纸。

**示例：**
```typescript
import { useWallpaperStore } from '@/stores/wallpaperStore'

const store = useWallpaperStore()
await store.setStaticWallpaper('D:/Pictures/wallpaper.jpg')
```

##### setVideoWallpaper

```typescript
async function setVideoWallpaper(
  path: string,
  config?: { volume?: number; loop?: boolean }
): Promise<void>
```

设置视频壁纸。

**示例：**
```typescript
await store.setVideoWallpaper('D:/Videos/wallpaper.mp4', {
  volume: 50,
  loop: true
})
```

##### stopWallpaper

```typescript
async function stopWallpaper(): Promise<void>
```

停止当前壁纸。

---

### useDockStore

**文件：** `src/stores/dockStore.ts`

#### State

```typescript
interface DockState {
  apps: Array<{
    id: string
    title: string
    icon: string
    isRunning: boolean
    isPinned: boolean
  }>
  position: 'bottom' | 'left' | 'right' | 'top'
  size: number
  autoHide: boolean
}
```

#### Actions

##### loadApps

```typescript
async function loadApps(): Promise<void>
```

加载应用列表。

##### togglePin

```typescript
function togglePin(appId: string): void
```

切换应用固定状态。

##### launchApp

```typescript
async function launchApp(path: string): Promise<void>
```

启动应用。

---

## 类型定义

### IPC 类型

**文件：** `src/types/ipc.d.ts`

```typescript
// 命令类型
export interface IPCCommand {
  action: string
  payload?: Record<string, any>
  requestId?: string
}

// 事件类型
export interface IPCEvent {
  event: string
  data?: any
  requestId?: string
  timestamp?: number
}

// 错误类型
export interface IPCError {
  code: string
  message: string
  details?: string
}

// 壁纸配置
export interface WallpaperConfig {
  type: 'static' | 'video' | 'web'
  path: string
  options?: {
    volume?: number
    loop?: boolean
    url?: string
  }
}

// 应用信息
export interface AppInfo {
  id: string
  title: string
  path: string
  icon: string
  pid: number
  hwnd: number
  isRunning: boolean
  isPinned: boolean
}

// 小组件数据
export interface WidgetData {
  widgetId: string
  type: string
  data: any
  timestamp: number
}

// 系统监控数据
export interface SystemMonitorData {
  cpu: number
  memory: number
  disk: number
  network: {
    download: number
    upload: number
  }
}
```

---

## 使用示例

### 完整示例：设置壁纸

```typescript
// MyComponent.vue
<script setup lang="ts">
import { ref } from 'vue'
import { sendCommand, onEvent } from '@/composables/useTauriBridge'
import { useWallpaperStore } from '@/stores/wallpaperStore'

const wallpaperPath = ref('')
const store = useWallpaperStore()

// 监听壁纸变化事件
onEvent('wallpaper_changed', (data) => {
  console.log('壁纸已更改:', data)
})

// 设置壁纸
async function setWallpaper() {
  try {
    await store.setStaticWallpaper(wallpaperPath.value)
    // 或直接使用 IPC
    // await sendCommand('set_static_wallpaper', {
    //   path: wallpaperPath.value
    // })
  } catch (error) {
    console.error('设置壁纸失败:', error)
  }
}
</script>

<template>
  <div>
    <input v-model="wallpaperPath" placeholder="输入壁纸路径" />
    <button @click="setWallpaper">设置壁纸</button>
  </div>
</template>
```

### 完整示例：Dock 应用列表

```typescript
// DockComponent.vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { sendCommand, onEvent } from '@/composables/useTauriBridge'

const apps = ref<any[]>([])

onMounted(async () => {
  // 获取应用列表
  await sendCommand('get_running_apps')
  
  // 监听应用列表更新
  onEvent('app_list_updated', (data) => {
    apps.value = data.apps
  })
})

async function launchApp(path: string) {
  await sendCommand('launch_app', { path })
}

async function closeApp(pid: number) {
  await sendCommand('close_app', { pid })
}
</script>

<template>
  <div class="dock">
    <div
      v-for="app in apps"
      :key="app.id"
      class="dock-icon"
      @click="launchApp(app.path)"
    >
      <img :src="app.icon" :alt="app.title" />
      <span>{{ app.title }}</span>
    </div>
  </div>
</template>
```

---

## 错误处理

### 最佳实践

```typescript
import { sendCommand, onEvent } from '@/composables/useTauriBridge'

// 全局错误监听
onEvent('error', (data) => {
  console.error('后端错误:', data.error)
  // 显示错误提示
  showNotification(data.error.message, 'error')
})

// 命令执行错误处理
async function executeCommand() {
  try {
    await sendCommand('my_command', { param: 'value' })
  } catch (error) {
    console.error('命令执行失败:', error)
    // 处理错误
  }
}
```

---

## 版本兼容性

当前 API 版本：**v0.1.0**

### 兼容性说明

- 所有 API 在 v0.x 版本中可能会有破坏性更改
- v1.0 及以后版本将保持向后兼容
- 废弃的 API 会在文档中标注，并在下个大版本中移除

---

**最后更新：** 2025-01-11  
**API 版本：** v0.1.0
