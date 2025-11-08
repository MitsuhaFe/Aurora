import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { WebviewWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window';

// 自定义动画项
export interface CustomAnimation {
  id: string;
  name: string;
  filePath: string;
  type: 'vrma' | 'vmd' | 'gltf' | 'glb'; // 支持 VRMA、VMD（MMD动画）、GLTF、GLB
  loop: boolean;
  createdAt: number;
}

export interface PetSettings {
  enabled: boolean;
  vrmPath: string | null;
  scale: number;
  positionX: number;
  positionY: number;
  modelOffsetX: number; // 模型左右偏移（-2.0 到 2.0）
  modelOffsetY: number; // 模型上下偏移（-2.0 到 2.0）
  rotationX: number; // X轴旋转角度（度数，0-360）
  rotationY: number; // Y轴旋转角度（度数，0-360）
  rotationZ: number; // Z轴旋转角度（度数，0-360）
  alwaysOnTop: boolean;
  clickThrough: boolean; // 整个窗口穿透
  smartClickThrough: boolean; // 智能穿透（仅背景穿透，模型可交互）
  showInTaskbar: boolean;
  // 窗口大小设置
  windowSize: {
    mode: 'auto' | 'custom'; // 自动计算或自定义
    width: number; // 自定义宽度（像素）
    height: number; // 自定义高度（像素）
  };
  animations: {
    idle: boolean;
    blink: boolean;
    breath: boolean;
  };
  lighting: {
    brightness: number;
    ambientColor: string;
    directionalColor: string;
  };
  background: {
    type: 'transparent' | 'color' | 'image'; // 背景类型：透明、纯色、图片
    opacity: number; // 背景透明度（0.0 到 1.0）
    color: string; // 纯色背景颜色
    imagePath: string | null; // 图片背景路径
    imageOpacity: number; // 图片背景透明度（0.0 到 1.0）
    imageBlur: number; // 图片背景模糊度（0 到 20）
  };
  // 动画配置
  animationConfig: {
    enableBreathing: boolean; // 启用呼吸动画
    breathingSpeed: number; // 呼吸速度（0.5 到 2.0）
    enableBlinking: boolean; // 启用眨眼动画
    blinkInterval: number; // 眨眼间隔（秒）
    expression: string; // 当前表情（neutral, happy, angry, sad, surprised, relaxed）
    expressionIntensity: number; // 表情强度（0.0 到 1.0）
    customAnimations: CustomAnimation[]; // 自定义动画列表
    currentAnimation: string | null; // 当前播放的动画ID
    animationSpeed: number; // 动画播放速度（0.5 到 2.0）
  };
}

export const usePetStore = defineStore('pet', () => {
  // 桌面伙伴窗口引用
  const petWindow = ref<WebviewWindow | null>(null);
  
  // 是否已初始化
  const isInitialized = ref(false);
  
  // 当前模式：'desktop' | 'fullscreen'
  const currentMode = ref<'desktop' | 'fullscreen'>('desktop');
  
  // 默认设置模板（用于初始化）
  const getDefaultSettings = (): PetSettings => ({
    enabled: false,
    vrmPath: null,
    scale: 1.0,
    positionX: window.screen.width - 400,
    positionY: window.screen.height - 500,
    modelOffsetX: 0.0,
    modelOffsetY: 0.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    alwaysOnTop: true,
    clickThrough: false,
    smartClickThrough: true,
    showInTaskbar: false,
    windowSize: {
      mode: 'auto',
      width: 500,
      height: 650,
    },
    animations: {
      idle: true,
      blink: true,
      breath: true,
    },
    lighting: {
      brightness: 1.0,
      ambientColor: '#ffffff',
      directionalColor: '#ffffff',
    },
    background: {
      type: 'transparent',
      opacity: 0.0,
      color: '#000000',
      imagePath: null,
      imageOpacity: 0.5,
      imageBlur: 0,
    },
    animationConfig: {
      enableBreathing: true,
      breathingSpeed: 1.0,
      enableBlinking: true,
      blinkInterval: 3.0,
      expression: 'neutral',
      expressionIntensity: 0.8,
      customAnimations: [],
      currentAnimation: null,
      animationSpeed: 1.0,
    },
  });
  
  // 桌面模式设置
  const desktopSettings = ref<PetSettings>(getDefaultSettings());
  
  // 全屏模式设置（默认窗口全屏，模型居中显示）
  const fullscreenSettings = ref<PetSettings>({
    ...getDefaultSettings(),
    windowSize: {
      mode: 'custom',
      width: window.screen.width,
      height: window.screen.height,
    },
    positionX: 0,
    positionY: 0,
    background: {
      type: 'color',
      opacity: 0.3,
      color: '#000000',
      imagePath: null,
      imageOpacity: 0.5,
      imageBlur: 0,
    },
    scale: 1.5, // 全屏模式下模型稍大一些
  });
  
  // 当前激活的设置（根据模式动态返回）
  const settings = computed<PetSettings>({
    get() {
      return currentMode.value === 'desktop' ? desktopSettings.value : fullscreenSettings.value;
    },
    set(newValue: PetSettings) {
      if (currentMode.value === 'desktop') {
        desktopSettings.value = newValue;
      } else {
        fullscreenSettings.value = newValue;
      }
    }
  });

  // 规范化设置（确保所有字段类型正确）
  function normalizeSettings(settings: PetSettings): void {
    // 确保数值字段是数字类型
    settings.scale = Number(settings.scale) || 1.0;
    settings.modelOffsetX = Number(settings.modelOffsetX) || 0;
    settings.modelOffsetY = Number(settings.modelOffsetY) || 0;
    settings.rotationX = Number(settings.rotationX) || 0;
    settings.rotationY = Number(settings.rotationY) || 0;
    settings.rotationZ = Number(settings.rotationZ) || 0;
    settings.lighting.brightness = Number(settings.lighting.brightness) || 1.0;
    
    // 确保背景设置存在且数值类型正确
    if (!settings.background) {
      settings.background = {
        type: 'transparent',
        opacity: 0.0,
        color: '#000000',
        imagePath: null,
        imageOpacity: 0.5,
        imageBlur: 0,
      };
    } else {
      settings.background.opacity = Number(settings.background.opacity) || 0.0;
      settings.background.imageOpacity = Number(settings.background.imageOpacity) || 0.5;
      settings.background.imageBlur = Number(settings.background.imageBlur) || 0;
    }
    
    // 确保动画配置存在且数值类型正确
    if (!settings.animationConfig) {
      settings.animationConfig = {
        enableBreathing: true,
        breathingSpeed: 1.0,
        enableBlinking: true,
        blinkInterval: 3.0,
        expression: 'neutral',
        expressionIntensity: 0.8,
        customAnimations: [],
        currentAnimation: null,
        animationSpeed: 1.0,
      };
    } else {
      settings.animationConfig.breathingSpeed = Number(settings.animationConfig.breathingSpeed) || 1.0;
      settings.animationConfig.blinkInterval = Number(settings.animationConfig.blinkInterval) || 3.0;
      settings.animationConfig.expressionIntensity = Number(settings.animationConfig.expressionIntensity) || 0.8;
      settings.animationConfig.animationSpeed = Number(settings.animationConfig.animationSpeed) || 1.0;
      if (!settings.animationConfig.customAnimations) {
        settings.animationConfig.customAnimations = [];
      }
    }
    
    // 确保窗口大小设置存在
    if (!settings.windowSize) {
      settings.windowSize = {
        mode: 'auto',
        width: 500,
        height: 650,
      };
    } else {
      settings.windowSize.width = Number(settings.windowSize.width) || 500;
      settings.windowSize.height = Number(settings.windowSize.height) || 650;
    }
  }

  // 从 localStorage 加载设置
  function loadSettings() {
    try {
      // 加载当前模式
      const savedMode = localStorage.getItem('aurora-pet-mode');
      if (savedMode === 'fullscreen' || savedMode === 'desktop') {
        currentMode.value = savedMode;
      }
      
      // 加载桌面模式设置
      const savedDesktop = localStorage.getItem('aurora-pet-desktop-settings');
      if (savedDesktop) {
        const parsed = JSON.parse(savedDesktop);
        Object.assign(desktopSettings.value, parsed);
        normalizeSettings(desktopSettings.value);
        console.log('✅ 已加载桌面模式设置');
      } else {
        // 向后兼容：尝试从旧的存储格式加载
        const oldSaved = localStorage.getItem('aurora-pet-settings');
        if (oldSaved) {
          const parsed = JSON.parse(oldSaved);
          Object.assign(desktopSettings.value, parsed);
          normalizeSettings(desktopSettings.value);
          console.log('✅ 已从旧格式迁移桌面模式设置');
        }
      }
      
      // 加载全屏模式设置
      const savedFullscreen = localStorage.getItem('aurora-pet-fullscreen-settings');
      if (savedFullscreen) {
        const parsed = JSON.parse(savedFullscreen);
        Object.assign(fullscreenSettings.value, parsed);
        normalizeSettings(fullscreenSettings.value);
        console.log('✅ 已加载全屏模式设置');
      }
      
      console.log(`📋 当前模式: ${currentMode.value === 'desktop' ? '桌面模式' : '全屏模式'}`);
    } catch (error) {
      console.error('❌ 加载桌面伙伴设置失败:', error);
    }
  }

  // 保存设置到 localStorage
  function saveSettings() {
    try {
      // 保存当前模式
      localStorage.setItem('aurora-pet-mode', currentMode.value);
      
      // 保存桌面模式设置
      localStorage.setItem('aurora-pet-desktop-settings', JSON.stringify(desktopSettings.value));
      
      // 保存全屏模式设置
      localStorage.setItem('aurora-pet-fullscreen-settings', JSON.stringify(fullscreenSettings.value));
      
      console.log(`💾 桌面伙伴设置已保存 (${currentMode.value === 'desktop' ? '桌面模式' : '全屏模式'})`);
      console.log(`📦 保存的设置:`, {
        mode: currentMode.value,
        desktopKey: 'aurora-pet-desktop-settings',
        fullscreenKey: 'aurora-pet-fullscreen-settings'
      });
    } catch (error) {
      console.error('❌ 保存桌面伙伴设置失败:', error);
    }
  }
  
  // 计算自动窗口大小（基于模型缩放）
  function calculateAutoWindowSize(): { width: number; height: number } {
    const scale = settings.value.scale;
    
    // 基础尺寸（适合标准大小的模型）
    const baseWidth = 500;
    const baseHeight = 650;
    
    // 根据缩放调整窗口大小
    // 缩放 < 1.0：窗口略小一些但不要太小
    // 缩放 > 1.0：窗口需要更大
    let width: number;
    let height: number;
    
    if (scale <= 1.0) {
      // 缩小模型时，窗口也适当缩小，但保持最小尺寸
      width = Math.max(350, baseWidth * (0.7 + scale * 0.3)); // 最小 350px
      height = Math.max(450, baseHeight * (0.7 + scale * 0.3)); // 最小 450px
    } else {
      // 放大模型时，窗口需要更大
      width = baseWidth * (0.8 + scale * 0.5); // scale=2时约1300px
      height = baseHeight * (0.8 + scale * 0.5);
    }
    
    // 限制最大尺寸（不要超过屏幕的80%）
    const maxWidth = window.screen.width * 0.8;
    const maxHeight = window.screen.height * 0.8;
    width = Math.min(width, maxWidth);
    height = Math.min(height, maxHeight);
    
    // 四舍五入到整数
    width = Math.round(width);
    height = Math.round(height);
    
    console.log(`📐 自动计算窗口大小: ${width}x${height} (缩放: ${scale})`);
    
    return { width, height };
  }
  
  // 获取窗口大小（根据模式）
  function getWindowSize(): { width: number; height: number } {
    if (settings.value.windowSize.mode === 'auto') {
      return calculateAutoWindowSize();
    } else {
      return {
        width: settings.value.windowSize.width,
        height: settings.value.windowSize.height,
      };
    }
  }

  // 初始化桌面伙伴窗口
  async function initialize() {
    if (isInitialized.value) {
      console.log('⚠️ 桌面伙伴已经初始化');
      return;
    }

    try {
      console.log('🐱 正在初始化桌面伙伴窗口...');
      
      // 检查窗口是否已存在
      const existingWindow = WebviewWindow.getByLabel('pet');
      if (existingWindow) {
        console.log('✅ 桌面伙伴窗口已存在，重新使用');
        petWindow.value = existingWindow;
        isInitialized.value = true;
        settings.value.enabled = true;
        saveSettings();
        return;
      }
      
      // 获取窗口大小
      const windowSize = getWindowSize();
      
      // 创建桌面伙伴窗口
      const window = new WebviewWindow('pet', {
        url: '/pet',
        title: 'Aurora Pet',
        width: windowSize.width,
        height: windowSize.height,
        x: settings.value.positionX,
        y: settings.value.positionY,
        decorations: false,
        transparent: true,
        alwaysOnTop: settings.value.alwaysOnTop,
        skipTaskbar: !settings.value.showInTaskbar,
        resizable: false,
        focus: false,
      });
      
      console.log(`🪟 创建窗口大小: ${windowSize.width}x${windowSize.height} (模式: ${settings.value.windowSize.mode})`);

      // 等待窗口准备就绪
      await new Promise<void>((resolve, reject) => {
        window.once('tauri://created', () => {
          console.log('✅ 桌面伙伴窗口创建成功');
          resolve();
        });

        window.once('tauri://error', (e) => {
          console.error('❌ 桌面伙伴窗口创建失败:', e);
          reject(e);
        });
      });

      petWindow.value = window;
      isInitialized.value = true;
      settings.value.enabled = true;
      saveSettings();

      console.log('✅ 桌面伙伴初始化完成');
    } catch (error) {
      console.error('❌ 初始化桌面伙伴失败:', error);
      settings.value.enabled = false;
      saveSettings();
      throw error;
    }
  }

  // 关闭桌面伙伴
  async function close() {
    if (!isInitialized.value || !petWindow.value) {
      console.log('⚠️ 桌面伙伴未运行');
      return;
    }

    try {
      console.log('🔒 正在关闭桌面伙伴...');
      await petWindow.value.close();
      petWindow.value = null;
      isInitialized.value = false;
      settings.value.enabled = false;
      saveSettings();
      console.log('✅ 桌面伙伴已关闭');
    } catch (error) {
      console.error('❌ 关闭桌面伙伴失败:', error);
      throw error;
    }
  }

  // 切换桌面伙伴显示
  async function toggle(enabled: boolean) {
    if (enabled) {
      await initialize();
    } else {
      await close();
    }
  }

  // 设置VRM模型
  async function setVrmModel(path: string) {
    // 根据当前模式更新对应的设置对象
    const targetSettings = currentMode.value === 'desktop' ? desktopSettings : fullscreenSettings;
    targetSettings.value.vrmPath = path;
    saveSettings();
    
    // 如果桌面伙伴已运行，通知更新模型
    if (isInitialized.value && petWindow.value) {
      await petWindow.value.emit('vrm-model-changed', { path });
    }
  }

  // 更新设置
  async function updateSettings(newSettings: Partial<PetSettings>) {
    console.log(`🔧 更新${currentMode.value === 'desktop' ? '桌面' : '全屏'}模式设置:`, newSettings);
    
    // 根据当前模式更新对应的设置对象
    const targetSettings = currentMode.value === 'desktop' ? desktopSettings : fullscreenSettings;
    Object.assign(targetSettings.value, newSettings);
    saveSettings();

    // 尝试获取桌面伙伴窗口（支持跨窗口调用）
    const petWindowInstance = petWindow.value || WebviewWindow.getByLabel('pet');
    
    // 如果桌面伙伴窗口存在，通知更新设置
    if (petWindowInstance) {
      try {
        console.log('🔍 准备发送事件到窗口:', petWindowInstance.label);
        // 发送设置变化通知（包含具体改变的设置）
        await petWindowInstance.emit('pet-settings-changed', newSettings);
        console.log('📤 事件已发送: pet-settings-changed ✓');
        
        // 更新窗口属性
        if (newSettings.alwaysOnTop !== undefined) {
          await petWindowInstance.setAlwaysOnTop(newSettings.alwaysOnTop);
          console.log('✓ 已更新始终置顶:', newSettings.alwaysOnTop);
        }
        
        if (newSettings.showInTaskbar !== undefined) {
          await petWindowInstance.setSkipTaskbar(!newSettings.showInTaskbar);
          console.log('✓ 已更新任务栏显示:', newSettings.showInTaskbar);
        }
        
        // 注意：不要在这里更新窗口位置和大小
        // 因为 handlePetSettingChange 会传递整个 settings 对象
        // 这会导致窗口意外跳回到存储的位置
        // 
        // 只在以下情况更新窗口位置/大小：
        // 1. 用户在设置中明确修改了窗口大小设置
        // 2. 模式切换（由 switchMode 单独处理）
        
        // 检查是否只包含窗口大小相关的设置
        const settingsKeys = Object.keys(newSettings);
        const isOnlyWindowSizeUpdate = settingsKeys.length === 1 && settingsKeys[0] === 'windowSize';
        
        if (isOnlyWindowSizeUpdate) {
          const windowSize = getWindowSize();
          await petWindowInstance.setSize(new LogicalSize(windowSize.width, windowSize.height));
          console.log(`✓ 已更新窗口大小: ${windowSize.width}x${windowSize.height} (模式: ${settings.value.windowSize.mode})`);
        }
        
        console.log('✅ 桌面伙伴设置已即时更新');
      } catch (error) {
        console.error('❌ 更新桌面伙伴窗口设置失败:', error);
      }
    } else {
      console.log('ℹ️ 桌面伙伴窗口未运行，设置将在下次启动时应用');
    }
  }

  // 切换模式
  async function switchMode(newMode: 'desktop' | 'fullscreen') {
    if (newMode === currentMode.value) {
      console.log('⚠️ 已经是当前模式，无需切换');
      return;
    }
    
    console.log(`🔄 切换模式: ${currentMode.value === 'desktop' ? '桌面' : '全屏'} → ${newMode === 'desktop' ? '桌面' : '全屏'}`);
    
    const oldMode = currentMode.value;
    currentMode.value = newMode;
    
    // 保存模式切换
    saveSettings();
    
    // 获取新模式的设置
    const newSettings = settings.value;
    
    // 如果桌面伙伴窗口已打开，应用新模式的所有设置
    const petWindowInstance = petWindow.value || WebviewWindow.getByLabel('pet');
    if (petWindowInstance) {
      try {
        console.log('📤 发送模式切换通知到桌面伙伴窗口');
        
        // 发送完整的设置到桌面伙伴窗口（触发所有设置的即时应用）
        await petWindowInstance.emit('pet-mode-switched', {
          mode: newMode,
          settings: newSettings,
        });
        
        // 同时更新窗口属性
        await petWindowInstance.setAlwaysOnTop(newSettings.alwaysOnTop);
        await petWindowInstance.setSkipTaskbar(!newSettings.showInTaskbar);
        
        // 更新窗口位置和大小
        await petWindowInstance.setPosition(
          new LogicalPosition(newSettings.positionX, newSettings.positionY)
        );
        
        const windowSize = getWindowSize();
        await petWindowInstance.setSize(new LogicalSize(windowSize.width, windowSize.height));
        
        console.log(`✅ 模式切换完成: ${newMode === 'desktop' ? '桌面模式' : '全屏模式'}`);
      } catch (error) {
        console.error('❌ 切换模式失败:', error);
        // 如果切换失败，回滚模式
        currentMode.value = oldMode;
        saveSettings();
        throw error;
      }
    } else {
      console.log('ℹ️ 桌面伙伴窗口未运行，模式切换将在下次启动时生效');
    }
  }

  // 加载设置
  loadSettings();

  // 如果启动时enabled为true，自动初始化
  if (settings.value.enabled && settings.value.vrmPath) {
    initialize().catch(console.error);
  }

  return {
    settings,
    desktopSettings,
    fullscreenSettings,
    currentMode,
    isInitialized,
    petWindow,
    initialize,
    close,
    toggle,
    setVrmModel,
    updateSettings,
    saveSettings,
    loadSettings,
    switchMode,
  };
});

