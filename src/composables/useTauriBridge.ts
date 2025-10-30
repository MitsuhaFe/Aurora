import { ref, onUnmounted } from 'vue';

/**
 * Tauri Bridge Composable
 * 用于与 C++ Sidecar 进程通信的封装
 * 
 * 注意：当前为占位实现，待 C++ 后端开发完成后启用
 */

// 单例 Sidecar 进程引用
let sidecarProcess: any = null;

// 事件监听器映射
const eventListeners = new Map<string, Array<(data: any) => void>>();

// 响应回调映射
const responseCallbacks = new Map<string, (data: any) => void>();

/**
 * 启动 Sidecar 进程
 * 
 * TODO: 待 C++ 后端实现后启用
 */
async function startSidecar() {
  if (sidecarProcess) return sidecarProcess;

  console.log('[Tauri Bridge] Sidecar 启动功能暂未实现');
  console.log('[Tauri Bridge] 需要先完成 C++ 后端开发');
  
  // TODO: 取消注释以下代码以启用 Sidecar
  /*
  const { Command } = await import('@tauri-apps/api/shell');
  
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

    // 尝试自动重启
    if (data.code !== 0) {
      setTimeout(() => startSidecar(), 2000);
    }
  });

  command.on('error', (error: string) => {
    console.error('[Tauri Bridge] Sidecar error:', error);
  });

  sidecarProcess = await command.spawn();
  console.log('[Tauri Bridge] Sidecar started successfully');
  */

  return null;
}

/**
 * 发送命令到 C++ 后端
 * 
 * @param action 命令名称
 * @param payload 命令参数
 * @returns Promise 返回响应数据
 */
export async function sendCommand<T = any>(
  action: string,
  payload: any = {}
): Promise<T> {
  console.warn(`[Tauri Bridge] sendCommand 暂未实现: ${action}`, payload);
  
  // 返回模拟数据
  return Promise.resolve({} as T);
  
  // TODO: 取消注释以下代码以启用实际通信
  /*
  const sidecar = await startSidecar();
  
  if (!sidecar) {
    throw new Error('Sidecar process not available');
  }

  const requestId = crypto.randomUUID();
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
  */
}

/**
 * 监听事件
 * 
 * @param eventName 事件名称
 * @param callback 回调函数
 * @returns 取消监听函数
 */
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

/**
 * Composable Hook
 */
export function useTauriBridge() {
  const isReady = ref(false);
  
  // 初始化时尝试启动 Sidecar
  startSidecar().then(() => {
    isReady.value = true;
  }).catch((error) => {
    console.error('[Tauri Bridge] Failed to start sidecar:', error);
  });

  return {
    isReady,
    sendCommand,
    onEvent,
  };
}

