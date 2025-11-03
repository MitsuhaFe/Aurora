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
  
  // 标志：是否正在保存位置（用于区分位置更新和其他设置更新）
  const isSavingPositionMap = new Map<string, boolean>();
  
  // 标志：是否正在保存大小
  const isSavingSizeMap = new Map<string, boolean>();
  
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
        console.log('📂 从 localStorage 加载小组件设置:', widgets.value);
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
   * 参考 Dock 的实现，智能处理位置和大小数据，防止覆盖
   */
  function saveSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let dataToSave = [...widgets.value];
      
      // 🔑 关键：检查每个小组件，保留 localStorage 中的位置和大小（如果不是正在保存）
      if (stored) {
        try {
          const storedWidgets = JSON.parse(stored) as WidgetSettings[];
          
          dataToSave = dataToSave.map(widget => {
            const storedWidget = storedWidgets.find(w => w.id === widget.id);
            if (!storedWidget) return widget;
            
            const isSavingPosition = isSavingPositionMap.get(widget.id);
            const isSavingSize = isSavingSizeMap.get(widget.id);
            
            let updatedWidget = { ...widget };
            
            // 如果不是正在保存位置，检查位置是否不一致，保留 localStorage 的位置
            if (!isSavingPosition) {
              const positionChanged = 
                widget.x !== storedWidget.x || 
                widget.y !== storedWidget.y;
              
              if (positionChanged) {
                console.log(`⚠️ 小组件 ${widget.id} 位置数据不一致:`);
                console.log('  - 当前 store:', { x: widget.x, y: widget.y });
                console.log('  - localStorage:', { x: storedWidget.x, y: storedWidget.y });
                console.log('  - 保留 localStorage 中的位置（防止覆盖）');
                updatedWidget.x = storedWidget.x;
                updatedWidget.y = storedWidget.y;
              }
            }
            
            // 如果不是正在保存大小，检查大小是否不一致，保留 localStorage 的大小
            if (!isSavingSize) {
              const sizeChanged = 
                widget.width !== storedWidget.width || 
                widget.height !== storedWidget.height;
              
              if (sizeChanged) {
                console.log(`⚠️ 小组件 ${widget.id} 大小数据不一致:`);
                console.log('  - 当前 store:', { width: widget.width, height: widget.height });
                console.log('  - localStorage:', { width: storedWidget.width, height: storedWidget.height });
                console.log('  - 保留 localStorage 中的大小（防止覆盖）');
                updatedWidget.width = storedWidget.width;
                updatedWidget.height = storedWidget.height;
              }
            }
            
            return updatedWidget;
          });
        } catch (parseError) {
          console.warn('⚠️ 解析 localStorage 数据失败，使用当前数据');
        }
      }
      
      console.log('💾 保存小组件设置到 localStorage');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('✅ 小组件设置已保存');
    } catch (error) {
      console.error('❌ 保存小组件设置失败:', error);
    }
  }
  
  // ==================== 响应式监听 ====================
  
  /**
   * 监听设置变化，自动保存
   */
  watch(
    widgets,
    () => {
      if (isLoadingSettings) {
        console.log('⏭️ 正在加载设置，跳过自动保存');
        return;
      }
      console.log('📝 小组件设置已变化，触发自动保存');
      saveSettings();
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
    
    widgets.value.push(widget);
    
    // 创建窗口
    await createWidgetWindow(widget);
    
    console.log(`✅ 添加小组件: ${type} (${id})`);
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
      
      console.log(`✅ 移除小组件: ${widgetId}`);
    }
  }
  
  /**
   * 更新小组件设置
   */
  async function updateWidget(widgetId: string, updates: Partial<WidgetSettings>) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget) {
      // 更新小组件设置
      Object.assign(widget, updates);
      
      // 如果窗口存在，更新窗口属性
      const window = widgetWindows.value.get(widgetId);
      if (window) {
        try {
          // 更新窗口大小
          if (updates.width !== undefined || updates.height !== undefined) {
            await window.setSize(new LogicalSize(widget.width, widget.height));
            console.log(`📐 更新窗口大小: ${widget.width}x${widget.height}`);
          }
          
          // 更新置顶状态
          if (updates.alwaysOnTop !== undefined) {
            await window.setAlwaysOnTop(widget.alwaysOnTop);
            console.log(`📌 更新置顶状态: ${widget.alwaysOnTop}`);
          }
          
          // 其他样式属性（backgroundColor, textColor, opacity, borderRadius）
          // 会通过响应式系统自动更新，无需手动处理窗口属性
          if (updates.backgroundColor || updates.textColor || 
              updates.opacity !== undefined || updates.borderRadius !== undefined) {
            console.log(`🎨 样式属性已更新，将通过响应式系统自动应用`);
          }
        } catch (error) {
          console.error(`❌ 更新窗口属性失败:`, error);
        }
      }
      
      console.log(`✅ 更新小组件设置: ${widgetId}`, updates);
    }
  }
  
  /**
   * 切换小组件启用状态
   * 参考 Dock 的实现，重新加载数据以避免使用过期的位置和大小
   */
  async function toggleWidget(widgetId: string, enabled: boolean) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget) {
      // 🔑 关键：在切换前重新加载设置，获取最新的位置和大小
      console.log(`🔄 [toggleWidget] 重新加载设置以获取最新位置...`);
      loadSettings();
      
      // 等待加载完成
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 重新获取组件（现在是最新数据）
      const updatedWidget = widgets.value.find(w => w.id === widgetId);
      if (!updatedWidget) {
        console.error(`❌ 找不到小组件: ${widgetId}`);
        return;
      }
      
      updatedWidget.enabled = enabled;
      
      if (enabled) {
        console.log(`📍 [toggleWidget] 使用最新位置创建窗口:`, {
          x: updatedWidget.x,
          y: updatedWidget.y,
          width: updatedWidget.width,
          height: updatedWidget.height
        });
        await createWidgetWindow(updatedWidget);
      } else {
        await closeWidgetWindow(widgetId);
      }
      
      console.log(`✅ 切换小组件状态: ${widgetId} -> ${enabled ? '启用' : '禁用'}`);
    }
  }
  
  /**
   * 保存小组件位置（逻辑坐标）
   * 参考 Dock 的实现，使用标志位防止被其他更新覆盖
   */
  function saveWidgetPosition(widgetId: string, x: number, y: number) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget) {
      console.log(`📍 保存小组件位置: ${widgetId} (逻辑坐标: ${x}, ${y})`);
      
      // 🔑 设置标志，表示正在保存位置
      isSavingPositionMap.set(widgetId, true);
      
      try {
        widget.x = x;
        widget.y = y;
        saveSettings(); // 此时 saveSettings 知道是位置更新
      } finally {
        isSavingPositionMap.set(widgetId, false); // 保存完成后重置
      }
    }
  }
  
  /**
   * 保存小组件大小（逻辑尺寸）
   * 参考 Dock 的实现，使用标志位防止被其他更新覆盖
   */
  function saveWidgetSize(widgetId: string, width: number, height: number) {
    const widget = widgets.value.find(w => w.id === widgetId);
    if (widget) {
      console.log(`📏 保存小组件大小: ${widgetId} (${width}x${height})`);
      
      // 🔑 设置标志，表示正在保存大小
      isSavingSizeMap.set(widgetId, true);
      
      try {
        widget.width = width;
        widget.height = height;
        saveSettings(); // 此时 saveSettings 知道是大小更新
      } finally {
        isSavingSizeMap.set(widgetId, false); // 保存完成后重置
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

