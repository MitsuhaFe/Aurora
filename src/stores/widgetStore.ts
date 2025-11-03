import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { WebviewWindow, LogicalSize } from '@tauri-apps/api/window';

/**
 * 小组件类型
 */
export type WidgetType = 'time' | 'network' | 'system' | 'disk';

/**
 * 小组件设置接口
 */
export interface WidgetSettings {
  id: string;
  type: WidgetType;
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  textColor: string;
  opacity: number;
  borderRadius: number;
  alwaysOnTop: boolean;
  pinPosition: boolean;
}

/**
 * 小组件默认配置
 */
const DEFAULT_WIDGET_CONFIG: Record<WidgetType, Omit<WidgetSettings, 'id' | 'enabled'>> = {
  time: {
    type: 'time',
    x: 100,
    y: 100,
    width: 300,
    height: 120,
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    opacity: 0.95,
    borderRadius: 16,
    alwaysOnTop: true,
    pinPosition: false,
  },
  network: {
    type: 'network',
    x: 420,
    y: 100,
    width: 280,
    height: 180,
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    opacity: 0.95,
    borderRadius: 16,
    alwaysOnTop: true,
    pinPosition: false,
  },
  system: {
    type: 'system',
    x: 720,
    y: 100,
    width: 280,
    height: 180,
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    opacity: 0.95,
    borderRadius: 16,
    alwaysOnTop: true,
    pinPosition: false,
  },
  disk: {
    type: 'disk',
    x: 1020,
    y: 100,
    width: 280,
    height: 150,
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    opacity: 0.95,
    borderRadius: 16,
    alwaysOnTop: true,
    pinPosition: false,
  },
};

/**
 * 小组件 Store
 */
export const useWidgetStore = defineStore('widget', () => {
  // ==================== 状态定义 ====================
  
  // 小组件窗口实例
  const widgetWindows = ref<Map<string, WebviewWindow>>(new Map());
  
  // 小组件设置列表
  const widgets = ref<WidgetSettings[]>([]);
  
  // 标志：是否正在加载设置
  let isLoadingSettings = false;
  
  // 标志：是否正在保存位置/大小（用于区分位置/大小更新和其他设置更新）
  let isSavingPositionOrSize = false;
  
  // ==================== 本地存储 ====================
  
  const STORAGE_KEY = 'aurora-widgets-settings';
  
  /**
   * 从本地存储加载设置
   */
  function loadSettings() {
    isLoadingSettings = true;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        widgets.value = parsed;
        console.log('📂 从 localStorage 加载小组件设置:', widgets.value.length, '个');
        widgets.value.forEach(w => {
          console.log(`  - ${w.type} (${w.id}): 位置(${w.x}, ${w.y}), 大小(${w.width}x${w.height})`);
        });
      } else {
        console.log('📂 localStorage 中没有保存的小组件设置');
      }
    } catch (error) {
      console.error('❌ 加载小组件设置失败:', error);
    } finally {
      setTimeout(() => {
        isLoadingSettings = false;
      }, 100);
    }
  }
  
  /**
   * 保存设置到本地存储
   * 
   * 关键机制（参考 Dock 实现）：
   * - 主窗口和小组件窗口有各自的 store 实例
   * - 小组件窗口拖动/调整大小时会更新并保存位置/大小
   * - 主窗口修改其他设置时不应覆盖小组件保存的位置/大小
   * 
   * 解决方案：
   * 1. 如果是拖动/调整大小触发的保存（isSavingPositionOrSize = true），使用 store 中的新值
   * 2. 如果是其他操作触发的保存，保留 localStorage 中的位置/大小
   */
  function saveSettings() {
    try {
      // 先读取 localStorage 中已保存的数据
      const stored = localStorage.getItem(STORAGE_KEY);
      let dataToSave = [...widgets.value];
      
      // 🔑 关键：只有在非位置/大小更新时，才保留 localStorage 中的位置/大小
      if (!isSavingPositionOrSize && stored) {
        try {
          const storedWidgets: WidgetSettings[] = JSON.parse(stored);
          
          // 为每个小组件检查并保留 localStorage 中的位置/大小
          dataToSave = dataToSave.map(widget => {
            const storedWidget = storedWidgets.find((w: WidgetSettings) => w.id === widget.id);
            
            if (storedWidget) {
              // 检查位置/大小是否不一致
              const positionOrSizeChanged = 
                widget.x !== storedWidget.x || 
                widget.y !== storedWidget.y ||
                widget.width !== storedWidget.width ||
                widget.height !== storedWidget.height;
              
              if (positionOrSizeChanged) {
                console.log(`⚠️ 检测到小组件 ${widget.id} 位置/大小不一致，保留 localStorage 中的值`);
                // 保留 localStorage 中的位置和大小
                return {
                  ...widget,
                  x: storedWidget.x,
                  y: storedWidget.y,
                  width: storedWidget.width,
                  height: storedWidget.height,
                };
              }
            }
            
            return widget;
          });
        } catch (parseError) {
          console.error('❌ 解析 localStorage 数据失败:', parseError);
        }
      } else if (isSavingPositionOrSize) {
        console.log('📍 正在保存位置/大小更新，使用 store 中的新值');
      }
      
      console.log('💾 保存小组件设置到 localStorage');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('✅ 小组件设置已保存');
    } catch (error) {
      console.error('❌ 保存小组件设置失败:', error);
    }
  }
  
  // ==================== 响应式监听 ====================
  
  // 防抖定时器
  let autoSaveTimer: number | null = null;
  
  /**
   * 监听设置变化，自动保存（带防抖）
   */
  watch(
    widgets,
    () => {
      if (isLoadingSettings) {
        console.log('⏭️ 正在加载设置，跳过自动保存');
        return;
      }
      
      // 清除之前的定时器
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      // 设置新的防抖定时器（800ms 后保存）
      autoSaveTimer = window.setTimeout(() => {
        console.log('📝 小组件设置已变化，触发自动保存');
        saveSettings();
        autoSaveTimer = null;
      }, 800);
    },
    { deep: true }
  );
  
  // ==================== 小组件窗口管理 ====================
  
  /**
   * 创建小组件窗口
   */
  async function createWidgetWindow(widget: WidgetSettings) {
    try {
      console.log(`🪟 创建小组件窗口: ${widget.type} (${widget.id})`);
      
      // 如果窗口已存在，先关闭
      const existingWindow = widgetWindows.value.get(widget.id);
      if (existingWindow) {
        await existingWindow.close();
        widgetWindows.value.delete(widget.id);
      }
      
      // 创建新窗口
      const window = new WebviewWindow(`widget-${widget.id}`, {
        url: `/widget?id=${widget.id}`,
        title: `Aurora Widget - ${widget.type}`,
        width: widget.width,
        height: widget.height,
        x: widget.x,
        y: widget.y,
        resizable: true,
        decorations: false,
        transparent: true,
        alwaysOnTop: widget.alwaysOnTop,
        skipTaskbar: true,
        visible: false,
      });
      
      // 等待窗口加载完成
      await new Promise((resolve) => {
        window.once('tauri://created', () => {
          resolve(null);
        });
      });
      
      // 显示窗口
      await window.show();
      
      widgetWindows.value.set(widget.id, window);
      console.log(`✅ 小组件窗口创建成功: ${widget.id}`);
      
      return window;
    } catch (error) {
      console.error(`❌ 创建小组件窗口失败: ${widget.id}`, error);
      throw error;
    }
  }
  
  /**
   * 关闭小组件窗口
   */
  async function closeWidgetWindow(widgetId: string) {
    try {
      const window = widgetWindows.value.get(widgetId);
      if (window) {
        await window.close();
        widgetWindows.value.delete(widgetId);
        console.log(`✅ 小组件窗口已关闭: ${widgetId}`);
      }
    } catch (error) {
      console.error(`❌ 关闭小组件窗口失败: ${widgetId}`, error);
    }
  }
  
  // ==================== 小组件管理 ====================
  
  /**
   * 添加小组件
   */
  async function addWidget(type: WidgetType) {
    const id = `${type}-${Date.now()}`;
    const defaultConfig = DEFAULT_WIDGET_CONFIG[type];
    
    const widget: WidgetSettings = {
      id,
      enabled: true,
      ...defaultConfig,
    };
    
    console.log(`📝 准备添加小组件: ${type}`, {
      id,
      位置: { x: widget.x, y: widget.y },
      大小: { width: widget.width, height: widget.height }
    });
    
    widgets.value.push(widget);
    
    // 🔑 关键：立即保存到 localStorage，确保新窗口能读取到数据
    console.log(`💾 立即保存小组件数据到 localStorage...`);
    saveSettings();
    
    // 验证保存是否成功
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const savedWidget = parsed.find((w: WidgetSettings) => w.id === id);
      if (savedWidget) {
        console.log(`✅ 验证: 小组件已保存到 localStorage`, {
          位置: { x: savedWidget.x, y: savedWidget.y },
          大小: { width: savedWidget.width, height: savedWidget.height }
        });
      } else {
        console.error(`❌ 验证失败: localStorage 中找不到新小组件 ${id}`);
      }
    }
    
    // 创建窗口
    await createWidgetWindow(widget);
    
    console.log(`✅ 添加小组件完成: ${type} (${id})`);
  }
  
  /**
   * 移除小组件
   */
  async function removeWidget(widgetId: string) {
    const index = widgets.value.findIndex(w => w.id === widgetId);
    if (index !== -1) {
      // 先关闭窗口
      await closeWidgetWindow(widgetId);
      
      // 从列表移除
      widgets.value.splice(index, 1);
      
      // 🔑 关键：立即保存，确保数据同步
      saveSettings();
      
      console.log(`✅ 移除小组件: ${widgetId}`);
    }
  }
  
  /**
   * 更新小组件设置
   */
  async function updateWidget(widgetId: string, updates: Partial<WidgetSettings>) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget) {
      Object.assign(widget, updates);
      
      // 如果窗口存在，更新窗口属性
      const window = widgetWindows.value.get(widgetId);
      if (window) {
        if (updates.width !== undefined || updates.height !== undefined) {
          await window.setSize(new LogicalSize(widget.width, widget.height));
        }
        if (updates.alwaysOnTop !== undefined) {
          await window.setAlwaysOnTop(widget.alwaysOnTop);
        }
      }
      
      console.log(`✅ 更新小组件设置: ${widgetId}`);
    }
  }
  
  /**
   * 切换小组件启用状态
   */
  async function toggleWidget(widgetId: string, enabled: boolean) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget) {
      widget.enabled = enabled;
      
      // 🔑 关键：立即保存状态，确保窗口能读取最新数据
      saveSettings();
      
      if (enabled) {
        await createWidgetWindow(widget);
      } else {
        await closeWidgetWindow(widgetId);
      }
      
      console.log(`✅ 切换小组件状态: ${widgetId} -> ${enabled ? '启用' : '禁用'}`);
    }
  }
  
  /**
   * 保存小组件位置
   */
  function saveWidgetPosition(widgetId: string, x: number, y: number) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget && (widget.x !== x || widget.y !== y)) {
      // 设置标志，表示正在保存位置
      isSavingPositionOrSize = true;
      
      try {
        widget.x = x;
        widget.y = y;
        // watch 监听器会自动触发防抖保存，但为了确保保存，这里也手动调用一次
        // saveSettings(); // 由 watch 处理即可
      } finally {
        // 保存完成后重置标志（稍微延迟）
        setTimeout(() => {
          isSavingPositionOrSize = false;
        }, 1000);
      }
    }
  }
  
  /**
   * 保存小组件大小
   */
  function saveWidgetSize(widgetId: string, width: number, height: number) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget && (widget.width !== width || widget.height !== height)) {
      // 设置标志，表示正在保存大小
      isSavingPositionOrSize = true;
      
      try {
        widget.width = width;
        widget.height = height;
        // watch 监听器会自动触发防抖保存
      } finally {
        // 保存完成后重置标志（稍微延迟）
        setTimeout(() => {
          isSavingPositionOrSize = false;
        }, 1000);
      }
    }
  }
  
  /**
   * 获取小组件设置
   */
  function getWidget(widgetId: string): WidgetSettings | undefined {
    return widgets.value.find(w => w.id === widgetId);
  }
  
  // ==================== 初始化 ====================
  
  /**
   * 初始化所有已启用的小组件
   */
  async function initialize() {
    loadSettings();
    
    // 创建所有已启用的小组件窗口
    const enabledWidgets = widgets.value.filter(w => w.enabled);
    for (const widget of enabledWidgets) {
      try {
        await createWidgetWindow(widget);
      } catch (error) {
        console.error(`初始化小组件失败: ${widget.id}`, error);
      }
    }
    
    console.log(`✅ 小组件初始化完成，共 ${enabledWidgets.length} 个`);
  }
  
  // 自动加载设置
  loadSettings();
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    widgets,
    widgetWindows,
    
    // 方法
    addWidget,
    removeWidget,
    updateWidget,
    toggleWidget,
    saveWidgetPosition,
    saveWidgetSize,
    getWidget,
    initialize,
    loadSettings,
    saveSettings,
  };
});

