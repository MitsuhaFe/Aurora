import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { WebviewWindow, LogicalSize } from '@tauri-apps/api/window';

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
  
  // 设置
  const settings = ref<PetSettings>({
    enabled: false,
    vrmPath: null,
    scale: 1.0,
    positionX: window.screen.width - 400,
    positionY: window.screen.height - 500,
    modelOffsetX: 0.0, // 默认无偏移
    modelOffsetY: 0.0, // 默认无偏移
    rotationX: 0, // 默认无旋转
    rotationY: 0, // 默认无旋转（正面朝向）
    rotationZ: 0, // 默认无旋转
    alwaysOnTop: true,
    clickThrough: false, // 整个窗口穿透
    smartClickThrough: true, // 智能穿透（默认启用）
    showInTaskbar: false,
    // 窗口大小设置
    windowSize: {
      mode: 'auto', // 默认自动计算
      width: 500, // 默认宽度
      height: 650, // 默认高度
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
      type: 'transparent', // 默认透明背景
      opacity: 0.0, // 完全透明
      color: '#000000', // 默认黑色
      imagePath: null, // 无图片
      imageOpacity: 0.5, // 图片透明度 50%
      imageBlur: 0, // 无模糊
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

  // 从 localStorage 加载设置
  function loadSettings() {
    try {
      const saved = localStorage.getItem('aurora-pet-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // 合并设置，确保数值类型正确（向后兼容）
        Object.assign(settings.value, parsed);
        
        // 确保数值字段是数字类型
        settings.value.scale = Number(settings.value.scale) || 1.0;
        settings.value.modelOffsetX = Number(settings.value.modelOffsetX) || 0;
        settings.value.modelOffsetY = Number(settings.value.modelOffsetY) || 0;
        settings.value.rotationX = Number(settings.value.rotationX) || 0;
        settings.value.rotationY = Number(settings.value.rotationY) || 0;
        settings.value.rotationZ = Number(settings.value.rotationZ) || 0;
        settings.value.lighting.brightness = Number(settings.value.lighting.brightness) || 1.0;
        
        // 确保背景设置存在且数值类型正确（向后兼容）
        if (!settings.value.background) {
          settings.value.background = {
            type: 'transparent',
            opacity: 0.0,
            color: '#000000',
            imagePath: null,
            imageOpacity: 0.5,
            imageBlur: 0,
          };
        } else {
          settings.value.background.opacity = Number(settings.value.background.opacity) || 0.0;
          settings.value.background.imageOpacity = Number(settings.value.background.imageOpacity) || 0.5;
          settings.value.background.imageBlur = Number(settings.value.background.imageBlur) || 0;
        }
        
        // 确保动画配置存在且数值类型正确（向后兼容）
        if (!settings.value.animationConfig) {
          settings.value.animationConfig = {
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
          settings.value.animationConfig.breathingSpeed = Number(settings.value.animationConfig.breathingSpeed) || 1.0;
          settings.value.animationConfig.blinkInterval = Number(settings.value.animationConfig.blinkInterval) || 3.0;
          settings.value.animationConfig.expressionIntensity = Number(settings.value.animationConfig.expressionIntensity) || 0.8;
          settings.value.animationConfig.animationSpeed = Number(settings.value.animationConfig.animationSpeed) || 1.0;
          if (!settings.value.animationConfig.customAnimations) {
            settings.value.animationConfig.customAnimations = [];
          }
        }
        
        // 确保窗口大小设置存在（向后兼容）
        if (!settings.value.windowSize) {
          settings.value.windowSize = {
            mode: 'auto',
            width: 500,
            height: 650,
          };
        } else {
          settings.value.windowSize.width = Number(settings.value.windowSize.width) || 500;
          settings.value.windowSize.height = Number(settings.value.windowSize.height) || 650;
        }
        
        console.log('✅ 已加载桌面伙伴设置:', settings.value);
      }
    } catch (error) {
      console.error('❌ 加载桌面伙伴设置失败:', error);
    }
  }

  // 保存设置到 localStorage
  function saveSettings() {
    try {
      localStorage.setItem('aurora-pet-settings', JSON.stringify(settings.value));
      console.log('💾 桌面伙伴设置已保存');
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
    settings.value.vrmPath = path;
    saveSettings();
    
    // 如果桌面伙伴已运行，通知更新模型
    if (isInitialized.value && petWindow.value) {
      await petWindow.value.emit('vrm-model-changed', { path });
    }
  }

  // 更新设置
  async function updateSettings(newSettings: Partial<PetSettings>) {
    Object.assign(settings.value, newSettings);
    saveSettings();

    // 尝试获取桌面伙伴窗口（支持跨窗口调用）
    const petWindowInstance = petWindow.value || WebviewWindow.getByLabel('pet');
    
    // 如果桌面伙伴窗口存在，通知更新设置
    if (petWindowInstance) {
      try {
        // 发送设置变化通知（包含具体改变的设置）
        await petWindowInstance.emit('pet-settings-changed', newSettings);
        console.log('📤 已发送设置变化通知到桌面伙伴窗口:', newSettings);
        
        // 更新窗口属性
        if (newSettings.alwaysOnTop !== undefined) {
          await petWindowInstance.setAlwaysOnTop(newSettings.alwaysOnTop);
          console.log('✓ 已更新始终置顶:', newSettings.alwaysOnTop);
        }
        
        if (newSettings.showInTaskbar !== undefined) {
          await petWindowInstance.setSkipTaskbar(!newSettings.showInTaskbar);
          console.log('✓ 已更新任务栏显示:', newSettings.showInTaskbar);
        }
        
        if (newSettings.positionX !== undefined || newSettings.positionY !== undefined) {
          await petWindowInstance.setPosition({
            x: settings.value.positionX,
            y: settings.value.positionY,
          });
          console.log('✓ 已更新窗口位置:', { x: settings.value.positionX, y: settings.value.positionY });
        }
        
        // 更新窗口大小（当窗口大小设置改变或缩放改变时）
        if (newSettings.windowSize !== undefined || newSettings.scale !== undefined) {
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

  // 加载设置
  loadSettings();

  // 如果启动时enabled为true，自动初始化
  if (settings.value.enabled && settings.value.vrmPath) {
    initialize().catch(console.error);
  }

  return {
    settings,
    isInitialized,
    petWindow,
    initialize,
    close,
    toggle,
    setVrmModel,
    updateSettings,
    saveSettings,
    loadSettings,
  };
});

