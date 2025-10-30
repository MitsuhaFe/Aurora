import { ref } from 'vue';
import { Command } from '@tauri-apps/api/shell';

/**
 * Tauri Bridge Composable
 * 用于与 C++ Sidecar 进程通信的封装
 */

// 单例 Sidecar 进程引用
let sidecarProcess: any = null;

// 事件监听器映射
const eventListeners = new Map<string, Array<(data: any) => void>>();

// 响应回调映射（暂未使用，未来可扩展）
const responseCallbacks = new Map<string, (data: any) => void>();

/**
 * 启动 Sidecar 进程
 */
async function startSidecar() {
  if (sidecarProcess) return sidecarProcess;

  console.log('[Tauri Bridge] Starting AuroraCore sidecar...');

  try {
    const command = Command.sidecar('bin/AuroraCore');

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

      // 尝试自动重启（如果非正常退出）
      if (data.code !== 0) {
        console.log('[Tauri Bridge] Attempting to restart sidecar in 2 seconds...');
        setTimeout(() => startSidecar(), 2000);
      }
    });

    command.on('error', (error: string) => {
      console.error('[Tauri Bridge] Sidecar error:', error);
    });

    sidecarProcess = await command.spawn();
    console.log('[Tauri Bridge] Sidecar started successfully');

    return sidecarProcess;
  } catch (error) {
    console.error('[Tauri Bridge] Failed to start sidecar:', error);
    throw error;
  }
}

/**
 * 发送命令到 C++ 后端
 * 
 * @param action 命令名称
 * @param payload 命令参数
 */
export async function sendCommand(
  action: string,
  payload: any = {}
): Promise<void> {
  const sidecar = await startSidecar();
  
  if (!sidecar) {
    throw new Error('Sidecar process not available');
  }

  const command = {
    action,
    ...payload
  };

  console.log('[Tauri Bridge] Sending command:', command);

  // 发送命令（命令 + 换行符）
  await sidecar.write(JSON.stringify(command) + '\n');
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

  console.log(`[Tauri Bridge] Registered listener for event: ${eventName}`);

  // 返回取消监听函数
  return () => {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log(`[Tauri Bridge] Unregistered listener for event: ${eventName}`);
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
    console.log('[Tauri Bridge] Bridge is ready');
  }).catch((error) => {
    console.error('[Tauri Bridge] Failed to start sidecar:', error);
  });

  return {
    isReady,
    sendCommand,
    onEvent,
  };
}
