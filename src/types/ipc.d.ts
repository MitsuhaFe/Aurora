/**
 * IPC 通信类型定义
 * 定义前后端通信的数据结构
 */

// ============ 基础类型 ============

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

