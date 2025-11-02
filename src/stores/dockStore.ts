import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { WebviewWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window';

/**
 * Dock 图标接口
 */
export interface DockIcon {
  id: string;
  name: string;
  icon: string; // 图标 emoji（作为后备）
  iconPath?: string; // 图标图片路径（base64 或 URL）
  path?: string; // 应用程序路径
  type: 'system' | 'app'; // 系统图标或应用图标
}

/**
 * Dock 设置接口
 */
export interface DockSettings {
  // 基本设置
  enabled: boolean;
  
  // 位置设置
  x: number;
  y: number;
  
  // 三个新增开关
  alwaysOnTop: boolean;
  pinPosition: boolean;
  autoHide: boolean;
  
  // 容器属性
  width: number;
  height: number;
  opacity: number;
  borderRadius: number;
  backgroundColor: string;
  
  // 样式效果
  hasShadow: boolean;
  hasGlassEffect: boolean;
  
  // 图标属性
  iconSize: number;
  iconOpacity: number;
  
  // 动画效果配置
  animations: {
    iconHoverScale: boolean;      // 悬浮放大
    iconHoverGlow: boolean;        // 悬浮发光
    iconClickRipple: boolean;      // 点击涟漪
    iconBounce: boolean;           // 图标弹跳（添加时）
    iconRotate: boolean;           // 悬浮旋转
    smoothTransition: boolean;     // 平滑过渡
    dockSlide: boolean;            // Dock滑入/滑出
    icon3DEffect: boolean;         // 3D效果
    
    // 更多动画效果
    iconHoverFloat: boolean;       // 悬浮浮动（上下移动）
    iconHoverShake: boolean;       // 悬浮摇晃
    iconHoverPulse: boolean;       // 悬浮脉冲
    iconClickBounce: boolean;      // 点击弹性
    iconShine: boolean;            // 光泽闪过
    iconHoverTilt: boolean;        // 悬浮倾斜
    iconRainbowBorder: boolean;    // 彩虹边框
    iconWave: boolean;             // 波浪效果
    iconFlip: boolean;             // 悬浮翻转
    iconHeartbeat: boolean;        // 心跳效果
    iconSwing: boolean;            // 摆动效果
    iconRubberBand: boolean;       // 橡皮筋效果
    iconJello: boolean;            // 果冻效果
    iconWobble: boolean;           // 摇摆效果
    iconFlash: boolean;            // 闪光效果
    iconRotate360: boolean;        // 360度旋转
  };
  
  // 动画速度配置
  animationSpeed: 'slow' | 'normal' | 'fast';
}

/**
 * Dock Store - 响应式状态管理
 * 使用事件驱动模式，避免轮询
 */
export const useDockStore = defineStore('dock', () => {
  // ==================== 状态定义 ====================
  
  // Dock 窗口实例
  const dockWindow = ref<WebviewWindow | null>(null);
  
  // Dock 图标列表
  const icons = ref<DockIcon[]>([
    // 默认图标
    { id: 'pc', name: '此电脑', icon: '💻', type: 'system' },
    { id: 'settings', name: '设置', icon: '⚙️', type: 'system' },
    { id: 'control-panel', name: '控制面板', icon: '🎛️', type: 'system' },
  ]);
  
  // Dock 设置 - 默认值
  const settings = ref<DockSettings>({
    enabled: true,
    x: -1, // -1 表示使用默认位置（屏幕底部居中）
    y: -1,
    alwaysOnTop: true,
    pinPosition: false,
    autoHide: false,
    width: 400,
    height: 80,
    opacity: 0.95,
    borderRadius: 16,
    backgroundColor: '#1e1e1e',
    hasShadow: true,
    hasGlassEffect: true,
    iconSize: 48,
    iconOpacity: 1,
    animations: {
      iconHoverScale: true,
      iconHoverGlow: true,
      iconClickRipple: true,
      iconBounce: true,
      iconRotate: false,
      smoothTransition: true,
      dockSlide: true,
      icon3DEffect: false,
      
      // 更多动画默认值
      iconHoverFloat: false,
      iconHoverShake: false,
      iconHoverPulse: false,
      iconClickBounce: true,
      iconShine: false,
      iconHoverTilt: false,
      iconRainbowBorder: false,
      iconWave: false,
      iconFlip: false,
      iconHeartbeat: false,
      iconSwing: false,
      iconRubberBand: false,
      iconJello: false,
      iconWobble: false,
      iconFlash: false,
      iconRotate360: false,
    },
    animationSpeed: 'normal',
  });
  
  // 自动隐藏相关状态
  const isHovered = ref(false);
  const hideTimeout = ref<number | null>(null);
  const isAutoHidden = ref(false); // 是否处于自动隐藏状态
  
  // 标志：是否正在加载设置（防止 watch 在加载时触发保存）
  let isLoadingSettings = false;
  
  // 标志：是否正在保存位置（用于区分位置更新和其他设置更新）
  let isSavingPosition = false;
  
  // ==================== 本地存储 ====================
  
  const STORAGE_KEY = 'aurora-dock-settings';
  const ICONS_KEY = 'aurora-dock-icons';
  
  /**
   * 从本地存储加载设置
   */
  function loadSettings() {
    isLoadingSettings = true; // 设置标志，防止 watch 触发
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📂 从 localStorage 加载设置:', {
          位置: { x: parsed.x, y: parsed.y },
          尺寸: { width: parsed.width, height: parsed.height },
          enabled: parsed.enabled,
          透明度: parsed.opacity,
          阴影: parsed.hasShadow,
          毛玻璃: parsed.hasGlassEffect
        });
        settings.value = { ...settings.value, ...parsed };
      } else {
        console.log('📂 localStorage 中没有保存的设置，使用默认值');
      }
      
      const storedIcons = localStorage.getItem(ICONS_KEY);
      if (storedIcons) {
        icons.value = JSON.parse(storedIcons);
      }
    } catch (error) {
      console.error('❌ 加载 Dock 设置失败:', error);
    } finally {
      // 延迟重置标志，确保 watch 不会在加载过程中触发
      setTimeout(() => {
        isLoadingSettings = false;
      }, 100);
    }
  }
  
  /**
   * 保存设置到本地存储
   * 
   * 关键修复：多窗口数据同步
   * - 主窗口和 Dock 窗口有各自的 store 实例
   * - Dock 窗口拖动时会更新并保存位置
   * - 主窗口修改其他设置时不应覆盖 Dock 保存的位置
   * 
   * 解决方案：
   * 1. 如果是拖动触发的保存（isSavingPosition = true），使用 store 中的新位置
   * 2. 如果是其他操作触发的保存，保留 localStorage 中的位置
   */
  function saveSettings() {
    try {
      // 先读取 localStorage 中已保存的数据
      const stored = localStorage.getItem(STORAGE_KEY);
      let dataToSave = { ...settings.value };
      
      // 🔑 关键：只有在非位置更新时，才保留 localStorage 的位置
      if (!isSavingPosition && stored) {
        const storedData = JSON.parse(stored);
        
        // 如果 localStorage 中有位置数据，检查是否不一致
        if (storedData.x !== undefined && storedData.y !== undefined) {
          const positionChanged = 
            settings.value.x !== storedData.x || 
            settings.value.y !== storedData.y;
          
          if (positionChanged) {
            console.log('⚠️ 检测到位置数据不一致:');
            console.log('  - 当前 store:', { x: settings.value.x, y: settings.value.y });
            console.log('  - localStorage:', { x: storedData.x, y: storedData.y });
            console.log('  - 保留 localStorage 中的位置（防止覆盖）');
            
            // 保留 localStorage 中的位置
            dataToSave.x = storedData.x;
            dataToSave.y = storedData.y;
          }
        }
      } else if (isSavingPosition) {
        console.log('📍 正在保存位置更新，使用 store 中的新位置');
      }
      
      console.log('💾 保存设置到 localStorage:', {
        位置: { x: dataToSave.x, y: dataToSave.y },
        尺寸: { width: dataToSave.width, height: dataToSave.height },
        enabled: dataToSave.enabled,
        透明度: dataToSave.opacity,
        阴影: dataToSave.hasShadow,
        毛玻璃: dataToSave.hasGlassEffect
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(ICONS_KEY, JSON.stringify(icons.value));
      console.log('✅ 设置已保存');
    } catch (error) {
      console.error('❌ 保存 Dock 设置失败:', error);
    }
  }
  
  // ==================== 响应式监听 - 即时生效 ====================
  
  /**
   * 监听设置变化，自动保存并应用到窗口
   * 使用 watch 实现响应式，避免轮询
   */
  watch(
    settings,
    async (newSettings, oldSettings) => {
      // 如果正在加载设置，跳过保存（避免覆盖刚加载的数据）
      if (isLoadingSettings) {
        console.log('⏭️ 正在加载设置，跳过自动保存');
        return;
      }
      
      console.log('📝 设置已变化，触发自动保存');
      saveSettings();
      
      // 只有非位置相关的设置变化时才应用到窗口
      // 避免开关自动隐藏等设置时意外移动 Dock
      const shouldApply = 
        newSettings.width !== oldSettings?.width ||
        newSettings.height !== oldSettings?.height ||
        newSettings.alwaysOnTop !== oldSettings?.alwaysOnTop;
      
      if (dockWindow.value && shouldApply) {
        await applySettingsToWindow();
      }
    },
    { deep: true }
  );
  
  /**
   * 监听图标变化，自动保存
   */
  watch(
    icons,
    () => {
      // 如果正在加载设置，跳过保存（避免覆盖刚加载的数据）
      if (isLoadingSettings) {
        console.log('⏭️ 正在加载设置，跳过图标保存');
        return;
      }
      console.log('📝 图标已变化，触发自动保存');
      saveSettings();
    },
    { deep: true }
  );
  
  // ==================== Dock 窗口管理 ====================
  
  /**
   * 创建 Dock 窗口
   */
  async function createDockWindow() {
    try {
      // 如果窗口已存在，先关闭
      if (dockWindow.value) {
        await dockWindow.value.close();
      }
      
      // 计算默认位置（屏幕底部居中）
      let x = settings.value.x;
      let y = settings.value.y;
      
      console.log('🪟 [createDockWindow] 从 settings 读取的位置:', { 
        x, 
        y,
        是否为默认标记: x === -1 || y === -1
      });
      
      if (x === -1 || y === -1) {
        // 获取屏幕尺寸
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        x = Math.floor((screenWidth - settings.value.width) / 2);
        y = screenHeight - settings.value.height - 60; // 距离底部 60px
        
        console.log('🎯 [createDockWindow] 首次启动，计算默认位置:', {
          x,
          y,
          屏幕尺寸: `${screenWidth}x${screenHeight}`,
          Dock尺寸: `${settings.value.width}x${settings.value.height}`
        });
        
        // 保存默认位置
        settings.value.x = x;
        settings.value.y = y;
        
        console.log('💾 [createDockWindow] 已保存默认位置到 settings');
      } else {
        console.log('✅ [createDockWindow] 使用保存的位置:', { x, y });
      }
      
      // 🔑 关键修复：使用 LogicalPosition 明确指定逻辑坐标
      // 这样 Tauri 会自动处理 DPI 缩放（如 125%、150% 等）
      console.log('🎯 [createDockWindow] 使用逻辑坐标创建窗口:', { x, y });
      console.log('💡 说明: 逻辑坐标会自动适应系统 DPI 缩放');
      
      // 创建新窗口
      dockWindow.value = new WebviewWindow('dock', {
        url: '/dock',
        title: 'Aurora Dock',
        width: settings.value.width,
        height: settings.value.height,
        x: x,
        y: y,
        resizable: false,
        decorations: false,
        transparent: true,
        alwaysOnTop: settings.value.alwaysOnTop,
        skipTaskbar: true,
        visible: false, // 先隐藏，加载完成后显示
      });
      
      // 等待窗口加载完成
      await new Promise((resolve) => {
        dockWindow.value!.once('tauri://created', () => {
          resolve(null);
        });
      });
      
      // 应用所有设置
      await applySettingsToWindow();
      
      // 显示窗口
      await dockWindow.value.show();
      
      // 调试：验证窗口实际位置（物理坐标 vs 逻辑坐标）
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待窗口完全显示
        const physicalPosition = await dockWindow.value.outerPosition();
        const scaleFactor = await dockWindow.value.scaleFactor();
        
        // 转换为逻辑坐标进行对比
        const actualLogicalX = Math.round(physicalPosition.x / scaleFactor);
        const actualLogicalY = Math.round(physicalPosition.y / scaleFactor);
        
        console.log('🔍 [createDockWindow] 位置验证:', {
          期望位置_逻辑: { x, y },
          实际位置_物理: { x: physicalPosition.x, y: physicalPosition.y },
          实际位置_逻辑: { x: actualLogicalX, y: actualLogicalY },
          DPI缩放: Math.round(scaleFactor * 100) + '%',
          偏差_逻辑坐标: {
            x: actualLogicalX - x,
            y: actualLogicalY - y
          }
        });
        
        // 检查逻辑坐标的偏差
        const xDiff = Math.abs(actualLogicalX - x);
        const yDiff = Math.abs(actualLogicalY - y);
        if (xDiff > 5 || yDiff > 5) {
          console.warn('⚠️ 位置偏差超过阈值（逻辑坐标）！');
          console.log('💡 这可能表示窗口创建时的坐标系统问题');
        } else {
          console.log('✅ 位置精确匹配（逻辑坐标）！');
        }
      } catch (e) {
        console.log('⚠️ 无法验证窗口位置:', e);
      }
      
      console.log('Dock 窗口创建成功');
    } catch (error) {
      console.error('创建 Dock 窗口失败:', error);
      throw error;
    }
  }
  
  /**
   * 关闭 Dock 窗口
   * 注意：关闭窗口时不要重置位置，保留用户最后的位置设置
   */
  async function closeDockWindow() {
    try {
      if (dockWindow.value) {
        console.log('🔒 [closeDockWindow] 关闭前的位置:', {
          x: settings.value.x,
          y: settings.value.y
        });
        
        await dockWindow.value.close();
        dockWindow.value = null;
        
        console.log('✅ [closeDockWindow] Dock 窗口已关闭');
        console.log('📍 [closeDockWindow] 位置保持为:', {
          x: settings.value.x,
          y: settings.value.y
        });
      }
    } catch (error) {
      console.error('❌ 关闭 Dock 窗口失败:', error);
    }
  }
  
  /**
   * 显示 Dock 窗口
   */
  async function showDock() {
    try {
      if (dockWindow.value) {
        await dockWindow.value.show();
      }
    } catch (error) {
      console.error('显示 Dock 失败:', error);
    }
  }
  
  /**
   * 隐藏 Dock 窗口
   */
  async function hideDock() {
    try {
      if (dockWindow.value) {
        await dockWindow.value.hide();
      }
    } catch (error) {
      console.error('隐藏 Dock 失败:', error);
    }
  }
  
  /**
   * 应用设置到窗口
   * 即时生效所有个性化设置
   */
  async function applySettingsToWindow() {
    if (!dockWindow.value) return;
    
    try {
      // 使用 LogicalSize 设置窗口大小（自动处理 DPI 缩放）
      await dockWindow.value.setSize(new LogicalSize(settings.value.width, settings.value.height));
      
      // 设置始终置顶
      await dockWindow.value.setAlwaysOnTop(settings.value.alwaysOnTop);
      
      // 注意：不在这里设置位置，避免意外移动
      // 位置只在以下情况设置：
      // 1. 创建窗口时（createDockWindow）
      // 2. 拖动结束后（savePosition）
      
      // 其他样式属性（透明度、圆角、背景色等）由 CSS 变量控制
      // 在 Dock 组件中通过监听 store 变化即时应用
      
      console.log('设置已应用到窗口:', {
        width: settings.value.width,
        height: settings.value.height,
        alwaysOnTop: settings.value.alwaysOnTop
      });
      
    } catch (error) {
      console.error('应用设置到窗口失败:', error);
    }
  }
  
  // ==================== 位置管理 ====================
  
  /**
   * 保存 Dock 位置
   */
  async function savePosition(x: number, y: number) {
    console.log('📍 保存 Dock 位置:', { x, y });
    
    // 设置标志，表示正在保存位置
    isSavingPosition = true;
    
    try {
      settings.value.x = x;
      settings.value.y = y;
      // watch 会自动触发保存，但为了确保保存，这里也手动调用一次
      saveSettings();
    } finally {
      // 保存完成后重置标志
      isSavingPosition = false;
    }
  }
  
  /**
   * 开始拖动
   */
  async function startDrag() {
    if (settings.value.pinPosition) {
      return; // 固定位置时禁用拖动
    }
    
    try {
      if (dockWindow.value) {
        await dockWindow.value.startDragging();
      }
    } catch (error) {
      console.error('开始拖动失败:', error);
    }
  }
  
  // ==================== 自动隐藏逻辑 ====================
  
  /**
   * 处理鼠标进入
   */
  function handleMouseEnter() {
    isHovered.value = true;
    
    // 清除隐藏计时器
    if (hideTimeout.value) {
      clearTimeout(hideTimeout.value);
      hideTimeout.value = null;
    }
    
    // 如果启用了自动隐藏且当前隐藏，则显示
    if (settings.value.autoHide && isAutoHidden.value) {
      isAutoHidden.value = false;
      console.log('🔼 Dock 显示');
    }
  }
  
  /**
   * 处理鼠标离开
   */
  function handleMouseLeave() {
    isHovered.value = false;
    
    // 如果启用了自动隐藏，启动隐藏计时器
    if (settings.value.autoHide && !isAutoHidden.value) {
      hideTimeout.value = window.setTimeout(() => {
        isAutoHidden.value = true;
        console.log('🔽 Dock 隐藏');
      }, 2000); // 2秒后隐藏
    }
  }
  
  /**
   * 重置自动隐藏状态
   */
  function resetAutoHide() {
    if (hideTimeout.value) {
      clearTimeout(hideTimeout.value);
      hideTimeout.value = null;
    }
    isAutoHidden.value = false;
  }
  
  // ==================== 图标管理 ====================
  
  /**
   * 添加图标
   */
  function addIcon(icon: DockIcon) {
    icons.value.push(icon);
  }
  
  /**
   * 移除图标
   */
  function removeIcon(iconId: string) {
    const index = icons.value.findIndex(icon => icon.id === iconId);
    if (index !== -1) {
      icons.value.splice(index, 1);
    }
  }
  
  /**
   * 更新图标
   */
  function updateIcon(iconId: string, updates: Partial<DockIcon>) {
    const index = icons.value.findIndex(icon => icon.id === iconId);
    if (index !== -1) {
      icons.value[index] = { ...icons.value[index], ...updates };
    }
  }
  
  /**
   * 移动图标位置
   */
  function moveIcon(fromIndex: number, toIndex: number) {
    const item = icons.value.splice(fromIndex, 1)[0];
    icons.value.splice(toIndex, 0, item);
  }
  
  // ==================== 初始化 ====================
  
  /**
   * 初始化 Dock
   */
  async function initialize() {
    loadSettings();
    
    // 如果启用了 Dock，创建窗口
    if (settings.value.enabled) {
      await createDockWindow();
    }
  }
  
  /**
   * 切换 Dock 启用状态
   * 
   * 关键修复：在保存之前先从 localStorage 加载最新数据
   * 原因：主窗口和 Dock 窗口有各自的 store 实例，可能存在数据不同步
   * 
   * 场景：
   * 1. 用户在 Dock 窗口拖动 → Dock 窗口保存新位置
   * 2. 用户在主窗口关闭 Dock → 主窗口 store 还是旧位置
   * 3. 如果直接保存会用旧位置覆盖新位置 ❌
   * 
   * 解决：保存前先重新加载，确保使用最新数据 ✅
   */
  async function toggleDock(enabled: boolean) {
    console.log('🔄 [toggleDock] 切换 Dock 状态:', enabled ? '开启' : '关闭');
    console.log('📍 [toggleDock] 切换前 store 中的位置:', {
      x: settings.value.x,
      y: settings.value.y
    });
    
    // 暂时禁用 watch，防止在切换过程中触发不必要的保存
    isLoadingSettings = true;
    
    try {
      // ⚠️ 关键修复：先从 localStorage 重新加载最新数据
      // 避免主窗口的旧数据覆盖 Dock 窗口保存的新数据
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const latestSettings = JSON.parse(stored);
        console.log('🔄 [toggleDock] 从 localStorage 加载最新位置:', {
          x: latestSettings.x,
          y: latestSettings.y
        });
        
        // 只同步位置等关键数据，不覆盖 enabled（因为我们马上要修改它）
        settings.value.x = latestSettings.x;
        settings.value.y = latestSettings.y;
        settings.value.width = latestSettings.width;
        settings.value.height = latestSettings.height;
        settings.value.opacity = latestSettings.opacity;
        settings.value.borderRadius = latestSettings.borderRadius;
        settings.value.backgroundColor = latestSettings.backgroundColor;
        settings.value.iconSize = latestSettings.iconSize;
        settings.value.iconOpacity = latestSettings.iconOpacity;
        settings.value.alwaysOnTop = latestSettings.alwaysOnTop;
        settings.value.pinPosition = latestSettings.pinPosition;
        settings.value.autoHide = latestSettings.autoHide;
        settings.value.hasShadow = latestSettings.hasShadow;
        settings.value.hasGlassEffect = latestSettings.hasGlassEffect;
        
        console.log('✅ [toggleDock] 已同步最新数据到 store');
      }
      
      // 现在修改 enabled 状态
      settings.value.enabled = enabled;
      
      if (enabled) {
        await createDockWindow();
      } else {
        await closeDockWindow();
      }
      
      console.log('📍 [toggleDock] 切换后的位置:', {
        x: settings.value.x,
        y: settings.value.y
      });
      
      // 切换完成后手动保存一次（现在保存的是最新数据）
      console.log('💾 [toggleDock] 切换完成，保存状态');
      saveSettings();
      
    } catch (error) {
      console.error('❌ [toggleDock] 切换失败:', error);
      throw error;
    } finally {
      // 延迟重新启用 watch
      setTimeout(() => {
        isLoadingSettings = false;
        console.log('✅ [toggleDock] watch 已重新启用');
      }, 200);
    }
  }
  
  /**
   * 验证 localStorage 中的设置
   * 用于调试和排查问题
   */
  function verifySettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔍 localStorage 中的设置:', parsed);
        console.log('🔍 当前 store 中的设置:', settings.value);
        
        // 比较关键字段
        const keys: (keyof DockSettings)[] = ['enabled', 'x', 'y', 'width', 'height', 'opacity', 'backgroundColor', 'hasShadow', 'hasGlassEffect', 'iconSize', 'iconOpacity'];
        let allMatch = true;
        
        keys.forEach(key => {
          if (parsed[key] !== settings.value[key]) {
            console.warn(`⚠️ 字段不匹配: ${key}`, {
              localStorage: parsed[key],
              store: settings.value[key]
            });
            allMatch = false;
          }
        });
        
        if (allMatch) {
          console.log('✅ localStorage 和 store 中的设置完全一致');
        } else {
          console.warn('⚠️ localStorage 和 store 中的设置存在差异');
        }
        
        return { stored: parsed, current: settings.value, match: allMatch };
      } else {
        console.log('❌ localStorage 中没有保存的设置');
        return null;
      }
    } catch (error) {
      console.error('❌ 验证设置失败:', error);
      return null;
    }
  }
  
  // ==================== 自动加载设置 ====================
  
  /**
   * Store 创建时自动加载保存的设置
   * 这样可以确保在任何地方使用 store 时，都能获取到正确的设置值
   */
  loadSettings();
  console.log('✅ Dock Store 已加载设置:', {
    enabled: settings.value.enabled,
    位置: { x: settings.value.x, y: settings.value.y },
    尺寸: { width: settings.value.width, height: settings.value.height },
    透明度: settings.value.opacity,
    阴影: settings.value.hasShadow,
    毛玻璃: settings.value.hasGlassEffect,
  });
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    dockWindow,
    icons,
    settings,
    isHovered,
    isAutoHidden,
    
    // 窗口管理
    createDockWindow,
    closeDockWindow,
    showDock,
    hideDock,
    applySettingsToWindow,
    
    // 位置管理
    savePosition,
    startDrag,
    
    // 自动隐藏
    handleMouseEnter,
    handleMouseLeave,
    resetAutoHide,
    
    // 图标管理
    addIcon,
    removeIcon,
    updateIcon,
    moveIcon,
    
    // 初始化
    initialize,
    toggleDock,
    loadSettings,
    saveSettings,
    verifySettings,
  };
});

