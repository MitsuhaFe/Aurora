<template>
  <div class="pet-window" @contextmenu.prevent="showContextMenu">
    <!-- 背景层 -->
    <div class="background-layer" :style="backgroundStyle"></div>
    
    <!-- 加载中状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>正在加载模型...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-overlay">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="retryLoad" class="retry-btn">重试</button>
    </div>

    <!-- 无模型提示 -->
    <div v-if="!vrmPath && !isLoading" class="no-model-overlay">
      <div class="icon">🐱</div>
      <p>请在设置中选择VRM模型</p>
    </div>

    <!-- Three.js 渲染容器 -->
    <div ref="containerRef" class="render-container"></div>

    <!-- 吸附视觉反馈 -->
    <div v-if="petStore.settings.snapConfig.enabled && petStore.settings.snapConfig.showSnapZones && isDragging" class="snap-overlay">
      <!-- 任务栏吸附区域 -->
      <div v-if="petStore.settings.snapConfig.snapToTaskbar && taskbarInfo" 
           class="snap-zone taskbar-zone"
           :class="{ 
             'active': currentScene.includes('taskbar'),
             [`taskbar-${taskbarInfo.position}`]: true 
           }"
           :style="getTaskbarZoneStyle()">
        <div class="snap-zone-label">📌 任务栏吸附区</div>
      </div>
      
      <!-- 屏幕边缘吸附区域 -->
      <div v-if="petStore.settings.snapConfig.snapToScreenEdges" class="screen-zones">
        <!-- 顶部 -->
        <div class="snap-zone screen-zone screen-top" 
             :class="{ 'active': currentScene === 'screen-top' }">
          <div class="snap-zone-label">⬆️ 顶部吸附区</div>
        </div>
        <!-- 左侧 -->
        <div class="snap-zone screen-zone screen-left" 
             :class="{ 'active': currentScene === 'screen-left' }">
          <div class="snap-zone-label">⬅️ 左侧吸附区</div>
        </div>
        <!-- 右侧 -->
        <div class="snap-zone screen-zone screen-right" 
             :class="{ 'active': currentScene === 'screen-right' }">
          <div class="snap-zone-label">➡️ 右侧吸附区</div>
        </div>
      </div>
      
      <!-- 窗口吸附检测区域（中心60%区域） -->
      <div class="window-snap-detection-zone" :class="{ 'active': currentScene === 'window-top' }">
        <div class="detection-zone-border"></div>
        <div class="detection-zone-label">
          🪟 窗口检测区域
          <span v-if="snappedWindowInfo" class="detected-window">
            {{ snappedWindowInfo.title }}
          </span>
        </div>
        <div class="detection-zone-corners">
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
        </div>
      </div>
      
      <!-- 吸附状态提示 -->
      <div v-if="isSnapped" class="snap-indicator">
        🧲 已吸附: {{ getSceneName(currentScene) }}
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
      @click="hideContextMenu"
    >
      <div class="menu-item" @click="openSettings">⚙️ 设置</div>
      <div class="menu-item" @click="toggleClickThrough">
        {{ clickThrough ? '✅' : '⬜' }} 点击穿透
      </div>
      <div class="menu-separator"></div>
      <div class="menu-item danger" @click="closePet">❌ 关闭桌面伙伴</div>
    </div>

    <!-- 调试面板 (Ctrl+Shift+D 切换) -->
    <div v-if="debugMode && smartClickThrough" class="debug-panel">
      <div class="debug-title">🔍 智能穿透调试</div>
      <div class="debug-item">
        <span class="debug-label">鼠标坐标:</span>
        <span class="debug-value">{{ debugInfo.mouseX.toFixed(2) }}, {{ debugInfo.mouseY.toFixed(2) }}</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">模型状态:</span>
        <span :class="debugInfo.isOverModel ? 'debug-on' : 'debug-off'">
          {{ debugInfo.isOverModel ? '🖱️ 可交互' : '👻 穿透' }}
        </span>
      </div>
      <div class="debug-item">
        <span class="debug-label">检测间隔:</span>
        <span class="debug-value">{{ debugInfo.checkInterval }}ms</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">检测模式:</span>
        <span :class="debugInfo.usingSimplifiedMesh ? 'debug-on' : 'debug-off'">
          {{ debugInfo.usingSimplifiedMesh ? '⚡ 简化网格' : '🎯 精确检测' }}
        </span>
      </div>
      <div class="debug-item">
        <span class="debug-label">交点数:</span>
        <span class="debug-value">{{ debugInfo.intersectCount }}</span>
      </div>
      <div class="debug-item" v-if="debugInfo.distance > 0">
        <span class="debug-label">距离:</span>
        <span class="debug-value">{{ debugInfo.distance.toFixed(2) }}</span>
      </div>
      <div class="debug-hint">按 Ctrl+Shift+D 关闭</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { appWindow, LogicalSize } from '@tauri-apps/api/window';
import { readBinaryFile } from '@tauri-apps/api/fs';
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri';
import { useVrmLoader } from '@/composables/useVrmLoader';
import { usePetStore } from '@/stores/petStore';
import * as THREE from 'three';

const petStore = usePetStore();
const containerRef = ref<HTMLElement | null>(null);

const isLoading = ref(false);
const error = ref<string | null>(null);
const vrmPath = ref<string | null>(null);
const clickThrough = ref(false);
const smartClickThrough = ref(true); // 智能穿透

// 右键菜单
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);

// VRM加载器
let vrmLoader: ReturnType<typeof useVrmLoader> | null = null;

// ========== 智能吸附相关 ==========
import type { SnapSceneType } from '@/stores/petStore';

// 吸附状态
const isSnapped = ref(false);
const currentScene = ref<SnapSceneType>('idle');
const isDragging = ref(false);

// 任务栏信息（Windows）
interface TaskbarInfo {
  position: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
}

// 其他窗口信息
interface WindowInfo {
  hwnd: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_visible: boolean;
}

let taskbarInfo: TaskbarInfo | null = null;
let otherWindows: WindowInfo[] = [];
let lastWindowsUpdate = 0;
const WINDOWS_CACHE_TIME = 500; // 窗口信息缓存500ms（频繁更新以提高响应）

// 吸附区域检测间隔
let snapCheckInterval: number | null = null;

// 当前吸附的窗口信息（响应式）
const snappedWindowInfo = ref<WindowInfo | null>(null);

// ========== 背景样式计算 ==========
const backgroundStyle = computed(() => {
  try {
    const bg = petStore.settings?.background;
    
    // 安全检查：如果背景设置不存在，返回默认透明背景
    if (!bg || !bg.type) {
      return {
        backgroundColor: 'transparent',
        opacity: 1,
        filter: 'none',
      };
    }
    
    if (bg.type === 'transparent') {
      // 透明背景
      return {
        backgroundColor: `rgba(0, 0, 0, ${bg.opacity ?? 0})`,
        opacity: 1,
        filter: 'none',
      };
    } else if (bg.type === 'color') {
      // 纯色背景
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };
      const rgb = hexToRgb(bg.color ?? '#000000');
      return {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bg.opacity ?? 0.5})`,
        opacity: 1,
        filter: 'none',
      };
    } else if (bg.type === 'image' && bg.imagePath) {
      // 图片背景
      const imageUrl = convertFileSrc(bg.imagePath);
      return {
        backgroundImage: `url("${imageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'transparent',
        opacity: bg.imageOpacity ?? 0.5,
        filter: `blur(${bg.imageBlur ?? 0}px)`,
      };
    }
    
    // 默认透明
    return {
      backgroundColor: 'transparent',
      opacity: 1,
      filter: 'none',
    };
  } catch (error) {
    console.error('背景样式计算错误:', error);
    // 发生任何错误时返回默认透明背景
    return {
      backgroundColor: 'transparent',
      opacity: 1,
      filter: 'none',
    };
  }
});

// 智能穿透相关
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isMouseOverModel = true; // 初始化为 true，确保第一次检测时能触发状态改变
let smartClickThroughInterval: number | null = null;

// 边界盒检测用（性能更好）
let modelBoundingBox: THREE.Box3 | null = null;

// 简化的碰撞检测几何体（用于性能优化）
let simplifiedCollisionMesh: THREE.Mesh | null = null;

// 优化 raycaster 性能
raycaster.firstHitOnly = true; // 只检测第一个交点
raycaster.params.Points = { threshold: 0.1 };
raycaster.params.Line = { threshold: 0.1 };

// 缓存窗口信息，避免频繁调用 API
let cachedWindowPosition = { x: 0, y: 0 };
let cachedWindowSize = { width: 500, height: 650 };
let lastWindowInfoUpdate = 0;
const WINDOW_INFO_CACHE_TIME = 1000; // 窗口信息缓存1秒

// 检测节流
let isCheckingSmartClickThrough = false;

// 鼠标位置缓存（用于检测鼠标是否移动，优化性能）
let lastMouseX = -999;
let lastMouseY = -999;
const MOUSE_MOVE_THRESHOLD = 3; // 鼠标移动阈值（像素），减少微小移动的检测

// 动态检测间隔（根据是否播放动画调整）
let currentCheckInterval = 150; // 默认150ms
const NORMAL_CHECK_INTERVAL = 150; // 正常检测间隔
const ANIMATION_CHECK_INTERVAL = 400; // 播放动画时的检测间隔（大幅降低以减少卡顿）
const SCENE_ANIMATION_CHECK_INTERVAL = 800; // 场景动画时的检测间隔（极低频率，避免卡顿）
let isAnimationPlaying = false;
let isPlayingSceneAnimation = false; // 是否正在播放场景动画

// 重置简化的碰撞检测几何体
function resetSimplifiedCollisionMesh() {
  if (simplifiedCollisionMesh) {
    // 从场景中移除旧的碰撞网格
    if (simplifiedCollisionMesh.parent) {
      simplifiedCollisionMesh.parent.remove(simplifiedCollisionMesh);
    }
    simplifiedCollisionMesh.geometry.dispose();
    (simplifiedCollisionMesh.material as THREE.Material).dispose();
    simplifiedCollisionMesh = null;
  }
  // 同时重置边界盒
  modelBoundingBox = null;
}

// 计算窗口大小（根据设置模式）
function calculateWindowSize(): { width: number; height: number } {
  const windowSizeSettings = petStore.settings.windowSize;
  
  // 如果是自定义模式，直接返回用户设置的尺寸
  if (windowSizeSettings?.mode === 'custom') {
    return {
      width: windowSizeSettings.width || 500,
      height: windowSizeSettings.height || 650,
    };
  }
  
  // 自动模式：根据模型缩放计算窗口大小
  const scale = petStore.settings.scale || 1.0;
  
  // 基础尺寸（适合标准大小的模型）
  const baseWidth = 500;
  const baseHeight = 650;
  
  // 根据缩放调整窗口大小
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
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

// 创建简化的碰撞检测几何体（性能优化）
function createSimplifiedCollisionMesh(vrm: any): THREE.Mesh {
  // 计算模型的边界盒
  const boundingBox = new THREE.Box3().setFromObject(vrm.scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  boundingBox.getSize(size);
  boundingBox.getCenter(center);
  
  // 创建一个极简的圆柱体作为碰撞体（性能优先）
  // 使用极少的分段数来提升 raycasting 性能
  const radius = (size.x + size.z) / 4;
  const height = size.y;
  
  // 使用 8 个分段（足够精确，性能极佳）
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 8, 1);
  const material = new THREE.MeshBasicMaterial({ 
    visible: false,
    transparent: true,
    opacity: 0,
    depthTest: false,  // 禁用深度测试，提升性能
    depthWrite: false  // 禁用深度写入，提升性能
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(center);
  
  // 设置渲染顺序，确保在其他对象之后（但不参与实际渲染）
  mesh.renderOrder = -1;
  
  console.log('✓ 已创建极简碰撞检测几何体（圆柱体）:', {
    radius: radius.toFixed(2),
    height: height.toFixed(2),
    segments: 8,
    优化: 'depthTest=false, depthWrite=false'
  });
  
  return mesh;
}

// 更新检测间隔（根据动画状态和类型）
function updateCheckInterval(animationActive: boolean, isSceneAnimation: boolean = false) {
  // 检查状态是否变化
  const stateChanged = (animationActive !== isAnimationPlaying) || (isSceneAnimation !== isPlayingSceneAnimation);
  
  if (!stateChanged) {
    return; // 状态没变，不需要更新
  }
  
  isAnimationPlaying = animationActive;
  isPlayingSceneAnimation = isSceneAnimation;
  
  // 根据动画类型选择检测间隔
  let newInterval = NORMAL_CHECK_INTERVAL;
  if (isSceneAnimation) {
    // 场景动画（吸附动画）：极低频率，大幅减少卡顿
    newInterval = SCENE_ANIMATION_CHECK_INTERVAL;
  } else if (animationActive) {
    // 普通自定义动画：中等频率
    newInterval = ANIMATION_CHECK_INTERVAL;
  }
  
  if (newInterval !== currentCheckInterval && smartClickThroughInterval !== null) {
    currentCheckInterval = newInterval;
    
    // 重启定时器以应用新的间隔
    clearInterval(smartClickThroughInterval);
    smartClickThroughInterval = window.setInterval(checkSmartClickThrough, currentCheckInterval);
    
    console.log(
      isSceneAnimation 
        ? `⏱️ 场景动画播放中，大幅降低检测频率至 ${currentCheckInterval}ms` 
        : animationActive 
        ? `⏱️ 检测到动画播放，降低检测频率至 ${currentCheckInterval}ms` 
        : `⏱️ 动画停止，恢复检测频率至 ${currentCheckInterval}ms`
    );
  }
}

// 智能穿透：定时检测鼠标是否在模型上（优化版）
async function checkSmartClickThrough() {
  // 节流：如果正在检测，跳过
  if (isCheckingSmartClickThrough) {
    return;
  }
  
  // 如果禁用智能穿透或启用了完全穿透，不处理
  if (!smartClickThrough.value || clickThrough.value || !vrmLoader || !containerRef.value) {
    return;
  }

  // 获取相机和VRM模型
  const camera = vrmLoader.getCamera();
  const vrm = vrmLoader.getVrm();
  
  if (!camera || !vrm) {
    return;
  }

  isCheckingSmartClickThrough = true;

  try {
    // 获取鼠标的屏幕坐标（使用 Rust 后端，即使窗口穿透也能获取）
    const cursorPosition = await invoke<{ x: number; y: number }>('get_cursor_position');
    
    // 优化：检查鼠标是否移动（如果鼠标静止，跳过检测）
    const mouseMoveX = Math.abs(cursorPosition.x - lastMouseX);
    const mouseMoveY = Math.abs(cursorPosition.y - lastMouseY);
    
    if (mouseMoveX < MOUSE_MOVE_THRESHOLD && mouseMoveY < MOUSE_MOVE_THRESHOLD) {
      // 鼠标几乎没有移动，跳过本次检测以节省性能
      isCheckingSmartClickThrough = false;
      return;
    }
    
    // 更新鼠标位置缓存
    lastMouseX = cursorPosition.x;
    lastMouseY = cursorPosition.y;
    
    // 更新窗口信息缓存（每秒最多更新一次）
    const now = Date.now();
    if (now - lastWindowInfoUpdate > WINDOW_INFO_CACHE_TIME) {
      const [windowPosition, windowSize] = await Promise.all([
        appWindow.outerPosition(),
        appWindow.outerSize()
      ]);
      cachedWindowPosition = windowPosition;
      cachedWindowSize = windowSize;
      lastWindowInfoUpdate = now;
    }
    
    // 使用缓存的窗口信息计算鼠标相对位置
    const relativeX = cursorPosition.x - cachedWindowPosition.x;
    const relativeY = cursorPosition.y - cachedWindowPosition.y;
    
    // 计算鼠标在标准化设备坐标中的位置 (-1 到 +1)
    mouse.x = (relativeX / cachedWindowSize.width) * 2 - 1;
    mouse.y = -(relativeY / cachedWindowSize.height) * 2 + 1;

    // 设置射线
    raycaster.setFromCamera(mouse, camera);
    
    let isOverModel = false;
    let intersects: any[] = [];
    
    // 如果正在播放动画，使用简化的碰撞检测几何体（性能优化）
    if (isAnimationPlaying) {
      // 创建或使用简化的碰撞网格
      if (!simplifiedCollisionMesh) {
        simplifiedCollisionMesh = createSimplifiedCollisionMesh(vrm);
        // 将碰撞网格添加到场景中（虽然不可见）
        vrm.scene.add(simplifiedCollisionMesh);
      }
      
      // 只检测简化的碰撞网格（性能极佳）
      intersects = raycaster.intersectObject(simplifiedCollisionMesh, false);
      isOverModel = intersects.length > 0;
    } else {
      // 没有播放动画时，使用边界盒 + 精确检测
      if (!modelBoundingBox) {
        modelBoundingBox = new THREE.Box3().setFromObject(vrm.scene);
      }
      
      const ray = raycaster.ray;
      const boxIntersection = ray.intersectBox(modelBoundingBox, new THREE.Vector3());
      
      // 只有在边界盒内时才进行精确的网格检测
      if (boxIntersection) {
        // 精确检测，但只检测第一个交点（firstHitOnly 已设置）
        intersects = raycaster.intersectObject(vrm.scene, true);
        isOverModel = intersects.length > 0;
      }
    }

    const wasOverModel = isMouseOverModel;
    isMouseOverModel = isOverModel;

    // 更新调试信息
    if (debugMode.value) {
      debugInfo.value = {
        mouseX: mouse.x,
        mouseY: mouse.y,
        isOverModel: isMouseOverModel,
        intersectCount: intersects.length,
        distance: intersects[0]?.distance || 0,
        checkInterval: currentCheckInterval,
        usingSimplifiedMesh: isAnimationPlaying,
      };
    }

    // 只有当状态改变时才更新窗口穿透设置并输出日志
    if (wasOverModel !== isMouseOverModel) {
      // 如果鼠标在模型上，禁用穿透（可以交互）
      // 如果鼠标在背景上，启用穿透
      await appWindow.setIgnoreCursorEvents(!isMouseOverModel);
      
      if (isMouseOverModel) {
        console.log('🖱️ 鼠标在模型上，可交互 | 交点数:', intersects.length, '| 最近距离:', intersects[0]?.distance.toFixed(2));
      } else {
        console.log('👻 鼠标在背景上，穿透 | 坐标:', { x: mouse.x.toFixed(2), y: mouse.y.toFixed(2) });
      }
    }
  } catch (error) {
    console.error('智能穿透检测错误:', error);
  } finally {
    isCheckingSmartClickThrough = false;
  }
}

// 调试模式（按 Ctrl+Shift+D 切换）
const debugMode = ref(false);
const debugInfo = ref({
  mouseX: 0,
  mouseY: 0,
  isOverModel: false,
  intersectCount: 0,
  distance: 0,
  checkInterval: 150,
  usingSimplifiedMesh: false,
});

// 初始化
onMounted(async () => {
  console.log('🐱 桌面伙伴窗口已挂载');

  // 加载设置
  petStore.loadSettings();
  vrmPath.value = petStore.settings.vrmPath;
  clickThrough.value = petStore.settings.clickThrough;
  smartClickThrough.value = petStore.settings.smartClickThrough;
  
  // 初始化任务栏信息（用于吸附功能）
  if (petStore.settings.snapConfig.enabled) {
    // 输出 DPI 缩放信息
    const dpiScale = window.devicePixelRatio || 1;
    console.log(`🖥️ 屏幕信息 - DPI缩放: ${dpiScale}x (${Math.round(dpiScale * 100)}%)`);
    console.log(`🖥️ 逻辑分辨率: ${window.screen.width}x${window.screen.height}`);
    console.log(`🖥️ 物理分辨率: ${window.screen.width * dpiScale}x${window.screen.height * dpiScale}`);
    
    taskbarInfo = await detectTaskbar();
    if (taskbarInfo) {
      console.log('✅ 任务栏信息:', taskbarInfo);
    }
  }

  // 设置窗口属性
  if (clickThrough.value) {
    // 完全穿透模式
    await appWindow.setIgnoreCursorEvents(true);
    console.log('🌐 完全穿透模式已启用');
  } else {
    // 智能穿透或不穿透模式，初始状态为不穿透（确保可以拖动）
    await appWindow.setIgnoreCursorEvents(false);
    // 注意：isMouseOverModel 的状态会在后续的 checkSmartClickThrough() 中自动设置
    console.log(smartClickThrough.value ? '🎯 智能穿透模式已启用（初始状态：不穿透）' : '🔒 穿透已禁用，可以正常拖动');
  }

  // 初始化Three.js场景
  if (containerRef.value) {
    vrmLoader = useVrmLoader(containerRef.value);
    vrmLoader.initScene();

    // 如果有VRM路径，加载模型
    if (vrmPath.value) {
      await loadVrmModel(vrmPath.value);
    }

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
  }

  // 监听设置变化（通过 Tauri 事件）
  const unlistenSettings = await appWindow.listen('pet-settings-changed', (event) => {
    console.log('📢 收到设置变化通知:', event.payload);
    
    // 先重新加载 localStorage 中的最新设置到本地 petStore
    petStore.loadSettings();
    console.log('✓ 已从 localStorage 重新加载设置');
    
    // 然后应用变化
    handleSettingsChanged(event.payload as any);
  });
  
  console.log('✅ pet-settings-changed 事件监听器已注册');

  // 监听 localStorage 变化（跨窗口同步的备用机制）
  window.addEventListener('storage', (event) => {
    // 监听桌面模式和全屏模式的设置变化
    const isDesktopSettings = event.key === 'aurora-pet-desktop-settings';
    const isFullscreenSettings = event.key === 'aurora-pet-fullscreen-settings';
    const isModeChange = event.key === 'aurora-pet-mode';
    
    if ((isDesktopSettings || isFullscreenSettings || isModeChange) && event.newValue) {
      console.log('🔄 检测到 localStorage 变化，重新加载设置');
      petStore.loadSettings();
      
      // 应用所有设置
      handleSettingsChanged(petStore.settings);
    }
  });

  // 监听模型变化
  await appWindow.listen('vrm-model-changed', (event) => {
    console.log('📢 收到模型变化通知:', event.payload);
    const payload = event.payload as { path: string };
    if (payload.path) {
      loadVrmModel(payload.path);
    }
  });

  // 监听模式切换
  await appWindow.listen('pet-mode-switched', (event) => {
    console.log('📢 收到模式切换通知:', event.payload);
    const payload = event.payload as { mode: string; settings: any };
    
    // 重新加载 petStore 设置（确保从 localStorage 获取最新数据）
    petStore.loadSettings();
    console.log('✓ 已从 localStorage 重新加载设置');
    
    // 应用新模式的所有设置（触发完整的设置更新）
    handleSettingsChanged(payload.settings);
  });

  // 如果启用了智能穿透，启动定时检测（每 150ms 检测一次，进一步降低性能消耗）
  // 注意：使用 Tauri API 获取鼠标位置是异步的，不能太频繁
  if (smartClickThrough.value && !clickThrough.value) {
    // 初始化窗口信息缓存
    try {
      const [windowPosition, windowSize] = await Promise.all([
        appWindow.outerPosition(),
        appWindow.outerSize()
      ]);
      cachedWindowPosition = windowPosition;
      cachedWindowSize = windowSize;
      lastWindowInfoUpdate = Date.now();
      console.log('✓ 窗口信息缓存已初始化');
    } catch (err) {
      console.warn('⚠️ 初始化窗口信息缓存失败，使用默认值');
    }
    
    // 立即执行一次检测，确保初始状态正确
    await checkSmartClickThrough();
    // 然后启动定时检测（使用当前检测间隔）
    smartClickThroughInterval = window.setInterval(checkSmartClickThrough, currentCheckInterval);
    console.log(`🎯 智能穿透检测已启动（间隔: ${currentCheckInterval}ms）`);
  }

  // 调试模式快捷键（Ctrl+Shift+D）
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      debugMode.value = !debugMode.value;
      console.log(debugMode.value ? '🔍 调试模式已启用' : '🔍 调试模式已禁用');
    }
  });

  // 右键菜单自动关闭事件
  // 1. 监听窗口失焦 (Window Blur)
  const handleWindowBlur = () => {
    if (contextMenuVisible.value) {
      console.log('🔽 窗口失焦，关闭右键菜单');
      hideContextMenu();
    }
  };
  window.addEventListener('blur', handleWindowBlur);

  // 2. 监听 Tauri 窗口失焦事件（更可靠）
  let unlistenFocus: (() => void) | null = null;
  appWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused && contextMenuVisible.value) {
      console.log('🔽 Tauri 窗口失焦，关闭右键菜单');
      hideContextMenu();
    }
  }).then(unlisten => {
    unlistenFocus = unlisten;
  });

  // 3. 监听鼠标离开窗口（监听 pet-window 元素）
  const handleMouseLeave = (e: MouseEvent) => {
    // 检查鼠标是否真的离开了窗口区域
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isOutside = e.clientX < rect.left || 
                      e.clientX > rect.right || 
                      e.clientY < rect.top || 
                      e.clientY > rect.bottom;
    
    if (isOutside && contextMenuVisible.value) {
      console.log('🔽 鼠标离开窗口，关闭右键菜单');
      hideContextMenu();
    }
  };
  
  // 监听整个窗口容器的 mouseleave
  const petWindowEl = document.querySelector('.pet-window') as HTMLElement;
  if (petWindowEl) {
    petWindowEl.addEventListener('mouseleave', handleMouseLeave);
  }

  // 4. 监听点击窗口其他区域（点击菜单外关闭）
  const handleClickOutside = (e: MouseEvent) => {
    if (contextMenuVisible.value) {
      const target = e.target as HTMLElement;
      // 如果点击的不是菜单本身，则关闭菜单
      if (!target.closest('.context-menu')) {
        console.log('🔽 点击菜单外区域，关闭右键菜单');
        hideContextMenu();
      }
    }
  };
  document.addEventListener('click', handleClickOutside);

  // 5. 监听右键点击其他区域（右键菜单外再次右键也关闭）
  // 使用标志避免在打开菜单的同时立即关闭它
  let isOpeningContextMenu = false;
  
  const handleContextMenuOutside = (e: MouseEvent) => {
    // 如果正在打开菜单，忽略此次事件
    if (isOpeningContextMenu) {
      isOpeningContextMenu = false;
      return;
    }
    
    if (contextMenuVisible.value) {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        console.log('🔽 右键点击菜单外区域，关闭右键菜单');
        hideContextMenu();
      }
    }
  };
  document.addEventListener('contextmenu', handleContextMenuOutside);
  
  // 将标志存储到 handlers 对象中，以便 showContextMenu 可以访问
  (window as any)._isOpeningContextMenu = () => {
    isOpeningContextMenu = true;
  };

  // 6. 监听 Escape 键关闭菜单
  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && contextMenuVisible.value) {
      console.log('🔽 按下 Escape，关闭右键菜单');
      hideContextMenu();
    }
  };
  document.addEventListener('keydown', handleEscapeKey);

  // 7. 监听滚轮事件关闭菜单
  const handleWheel = () => {
    if (contextMenuVisible.value) {
      console.log('🔽 滚轮滚动，关闭右键菜单');
      hideContextMenu();
    }
  };
  window.addEventListener('wheel', handleWheel, { passive: true });

  // 存储事件处理器引用，以便在 onUnmounted 中移除
  (window as any)._petMenuEventHandlers = {
    handleWindowBlur,
    handleMouseLeave,
    handleClickOutside,
    handleContextMenuOutside,
    handleEscapeKey,
    handleWheel,
    unlistenFocus,
    petWindowEl,
  };

  // 窗口拖动（集成吸附功能）
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTime = 0;
  let dragTimeoutCheckInterval: number | null = null;
  let dragTimeoutHandled = false; // 标记是否已经处理过超时

  // 停止拖动的统一处理函数（立即隐藏吸附区域）
  let blurTimeout: number | null = null;
  
  const stopDragging = async () => {
    if (!isDragging.value) {
      return; // 已经停止，避免重复处理
    }
    
    console.log('🛑 停止拖动，立即隐藏吸附区域');
    
    // 第一步：立即设置为 false，触发 Vue 响应式更新，立即隐藏吸附区域
    isDragging.value = false;
    
    // 重置超时处理标志
    dragTimeoutHandled = false;
    
    // 第二步：停止吸附检测定时器
    stopSnapDetection();
    
    // 清除拖动超时检查
    if (dragTimeoutCheckInterval !== null) {
      clearInterval(dragTimeoutCheckInterval);
      dragTimeoutCheckInterval = null;
    }
    
    // 清除失焦延迟检查
    if (blurTimeout !== null) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
    }
    
    // 第三步：等待下一个 tick，确保 UI 已更新，然后在后台执行最后的吸附检查
    await nextTick();
    
    // 拖动结束时执行最后一次吸附检查（不阻塞 UI）
    if (petStore.settings.snapConfig.enabled) {
      const finalScene = await detectSnapScene();
      if (finalScene !== 'idle' && finalScene !== currentScene.value) {
        currentScene.value = finalScene;
        await applySnap(finalScene);
        await playSceneAnimation(finalScene);
      }
    }
    
    console.log('✅ 拖动已完全停止');
  };

  containerRef.value?.addEventListener('mousedown', (e) => {
    // 拖动条件：
    // 1. 没有启用完全穿透
    // 2. 是左键点击
    // 3. 如果启用了智能穿透，则必须在模型上；如果未启用智能穿透，则总是可以拖动
    const canDrag = !clickThrough.value && e.button === 0 && (!smartClickThrough.value || isMouseOverModel);
    
    if (canDrag) {
      console.log('🖱️ 开始拖动，显示吸附区域');
      isDragging.value = true;
      dragStartX = e.screenX;
      dragStartY = e.screenY;
      dragStartTime = Date.now();
      dragTimeoutHandled = false; // 重置超时处理标志
      
      // 启动吸附检测
      if (petStore.settings.snapConfig.enabled) {
        startSnapDetection();
      }
      
      // 启动超时保护：每500ms检查一次，如果拖动超过3秒强制停止
      dragTimeoutCheckInterval = window.setInterval(() => {
        // 如果已经停止拖动，清除定时器并返回
        if (!isDragging.value) {
          if (dragTimeoutCheckInterval !== null) {
            clearInterval(dragTimeoutCheckInterval);
            dragTimeoutCheckInterval = null;
          }
          return;
        }
        
        // 如果已经处理过超时，不再重复处理
        if (dragTimeoutHandled) {
          return;
        }
        
        const dragDuration = Date.now() - dragStartTime;
        if (dragDuration > 3000) {
          // 标记为已处理，避免重复输出日志
          dragTimeoutHandled = true;
          
          console.warn('⚠️ 拖动超时（3秒），强制停止');
          
          // 先清除定时器，避免重复触发
          if (dragTimeoutCheckInterval !== null) {
            clearInterval(dragTimeoutCheckInterval);
            dragTimeoutCheckInterval = null;
          }
          
          // 然后停止拖动
          stopDragging();
        }
      }, 500);
      
      appWindow.startDragging();
    }
  });

  // 监听器 1: document 的 mouseup（主要监听点）
  const handleDocumentMouseUp = (e: MouseEvent) => {
    if (isDragging.value) {
      // 只有左键松开才算结束拖动
      if (e.button === 0) {
        console.log('📍 document mouseup (左键) - 停止拖动');
        stopDragging();
      }
    }
  };
  document.addEventListener('mouseup', handleDocumentMouseUp);

  // 监听器 2: window 的 mouseup（全局捕获，作为备份）
  const handleWindowMouseUp = (e: MouseEvent) => {
    if (isDragging.value && e.button === 0) {
      console.log('📍 window mouseup (左键) - 停止拖动');
      stopDragging();
    }
  };
  window.addEventListener('mouseup', handleWindowMouseUp, true); // 使用捕获阶段

  // 监听器 3: 窗口失焦（只在真正失焦时处理，延迟检查避免误触发）
  const handleWindowBlurDrag = () => {
    if (!isDragging.value) return;
    
    // 延迟300ms检查，避免短暂失焦导致误触发
    blurTimeout = window.setTimeout(() => {
      if (isDragging.value) {
        console.log('📍 窗口失焦（延迟确认）- 停止拖动');
        stopDragging();
      }
    }, 300);
  };
  
  // 窗口重新聚焦时取消失焦处理
  const handleWindowFocusDrag = () => {
    if (blurTimeout !== null) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
      console.log('✓ 窗口重新聚焦，取消失焦处理');
    }
  };
  
  window.addEventListener('blur', handleWindowBlurDrag);
  window.addEventListener('focus', handleWindowFocusDrag);

  // 存储清理函数
  (window as any)._petDragCleanup = () => {
    document.removeEventListener('mouseup', handleDocumentMouseUp);
    window.removeEventListener('mouseup', handleWindowMouseUp, true);
    window.removeEventListener('blur', handleWindowBlurDrag);
    window.removeEventListener('focus', handleWindowFocusDrag);
    if (blurTimeout !== null) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
    }
    if (dragTimeoutCheckInterval !== null) {
      clearInterval(dragTimeoutCheckInterval);
      dragTimeoutCheckInterval = null;
    }
    console.log('✓ 已移除拖动监听器');
  };
});

onUnmounted(() => {
  console.log('👋 桌面伙伴窗口卸载');
  window.removeEventListener('resize', handleResize);
  
  // 清理吸附检测
  stopSnapDetection();
  
  // 清理拖动事件监听器
  const dragCleanup = (window as any)._petDragCleanup;
  if (dragCleanup) {
    dragCleanup();
    delete (window as any)._petDragCleanup;
  }
  
  // 清理右键菜单事件监听器
  const handlers = (window as any)._petMenuEventHandlers;
  if (handlers) {
    // 移除 window 和 document 事件监听器
    window.removeEventListener('blur', handlers.handleWindowBlur);
    document.removeEventListener('click', handlers.handleClickOutside);
    document.removeEventListener('contextmenu', handlers.handleContextMenuOutside);
    document.removeEventListener('keydown', handlers.handleEscapeKey);
    window.removeEventListener('wheel', handlers.handleWheel);
    
    // 移除 pet-window 元素的事件监听器
    if (handlers.petWindowEl) {
      handlers.petWindowEl.removeEventListener('mouseleave', handlers.handleMouseLeave);
    }
    
    // 取消 Tauri 窗口焦点监听
    if (handlers.unlistenFocus) {
      handlers.unlistenFocus();
    }
    
    delete (window as any)._petMenuEventHandlers;
    console.log('✓ 已移除右键菜单事件监听器');
  }
  
  // 清理全局标志
  delete (window as any)._isOpeningContextMenu;
  
  // 清理智能穿透定时器
  if (smartClickThroughInterval !== null) {
    clearInterval(smartClickThroughInterval);
    smartClickThroughInterval = null;
  }
  
  if (vrmLoader) {
    vrmLoader.dispose();
  }
});

// 加载VRM模型
async function loadVrmModel(path: string) {
  if (!vrmLoader) {
    console.error('❌ VRM加载器未初始化');
    error.value = 'VRM加载器未正确初始化，请刷新页面重试';
    return;
  }

  console.log('🐱 准备加载VRM模型...');
  console.log('📁 原始路径:', path);
  
  isLoading.value = true;
  error.value = null;

  try {
    // 验证文件扩展名
    if (!path.toLowerCase().endsWith('.vrm')) {
      throw new Error('请选择VRM格式的文件（.vrm扩展名）');
    }

    // 直接读取文件为二进制数据
    console.log('📖 正在读取文件...');
    const fileData = await readBinaryFile(path);
    console.log('✅ 文件读取成功，大小:', (fileData.length / 1024 / 1024).toFixed(2), 'MB');
    
    // 创建Blob和URL
    console.log('🔗 创建Blob URL...');
    const blob = new Blob([fileData], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    console.log('✅ Blob URL创建成功:', blobUrl);

    // 加载模型
    await vrmLoader.loadVrm(blobUrl);
    
    // 释放Blob URL（模型加载后就不需要了）
    URL.revokeObjectURL(blobUrl);
    console.log('🧹 Blob URL已释放');
    
    console.log('✅ 模型加载成功，正在应用设置...');
    
    // 应用缩放
    vrmLoader.setScale(petStore.settings.scale);
    console.log('✓ 已应用缩放:', petStore.settings.scale);
    
    // 应用位置偏移
    vrmLoader.setPosition(petStore.settings.modelOffsetX, petStore.settings.modelOffsetY);
    console.log('✓ 已应用位置偏移:', { x: petStore.settings.modelOffsetX, y: petStore.settings.modelOffsetY });
    
    // 应用旋转
    vrmLoader.setRotation(petStore.settings.rotationX, petStore.settings.rotationY, petStore.settings.rotationZ);
    console.log('✓ 已应用旋转:', { x: petStore.settings.rotationX, y: petStore.settings.rotationY, z: petStore.settings.rotationZ });
    
    // 应用光照
    vrmLoader.setLighting(
      petStore.settings.lighting.brightness,
      petStore.settings.lighting.ambientColor,
      petStore.settings.lighting.directionalColor
    );
    console.log('✓ 已应用光照设置');
    
    // 应用动画设置
    const animConfig = petStore.settings.animationConfig;
    
    // 设置呼吸动画
    vrmLoader.setBreathing(animConfig.enableBreathing, animConfig.breathingSpeed);
    console.log('✓ 已应用呼吸动画:', { enabled: animConfig.enableBreathing, speed: animConfig.breathingSpeed });
    
    // 设置眨眼动画
    vrmLoader.setBlinking(animConfig.enableBlinking, animConfig.blinkInterval);
    console.log('✓ 已应用眨眼动画:', { enabled: animConfig.enableBlinking, interval: animConfig.blinkInterval });
    
    // 设置表情
    vrmLoader.playExpression(animConfig.expression, animConfig.expressionIntensity);
    console.log('✓ 已应用表情:', { expression: animConfig.expression, intensity: animConfig.expressionIntensity });
    
    // 加载自定义动画（如果有）
    if (animConfig.currentAnimation) {
      const animation = animConfig.customAnimations.find(a => a.id === animConfig.currentAnimation);
      if (animation) {
        vrmLoader.loadCustomAnimation(animation.filePath, animation.loop, animConfig.animationSpeed)
          .then(success => {
            if (success) {
              console.log('✓ 已加载自定义动画:', animation.name);
              
              // 降低检测频率以减少卡顿
              updateCheckInterval(true);
            }
          })
          .catch(error => {
            console.error('❌ 加载自定义动画失败:', error);
            // 初始化时如果动画加载失败，静默处理（不弹窗）
            
            // 恢复正常检测频率
            updateCheckInterval(false);
          });
      }
    }

    // 重置边界盒和碰撞网格（模型变化后需要重新计算）
    resetSimplifiedCollisionMesh();
    console.log('✓ 已重置边界盒和碰撞网格缓存');
    
    isLoading.value = false;
    vrmPath.value = path;
    console.log('🎉 VRM模型加载完成！');
  } catch (err: any) {
    console.error('❌ 加载VRM模型失败:', err);
    console.error('错误详情:', {
      message: err.message,
      stack: err.stack,
      type: typeof err,
    });
    
    // 更友好的错误信息
    let errorMsg = '加载失败';
    if (err.message) {
      errorMsg = err.message;
    } else if (err.toString().includes('path not allowed')) {
      errorMsg = '文件访问权限不足，请将文件移动到用户文档目录';
    } else if (err.toString().includes('NotFound')) {
      errorMsg = '文件不存在或路径无效';
    } else {
      errorMsg = String(err);
    }
    
    error.value = errorMsg;
    isLoading.value = false;
  }
}

// 重试加载
function retryLoad() {
  if (vrmPath.value) {
    loadVrmModel(vrmPath.value);
  }
}

// 处理设置变化
async function handleSettingsChanged(newSettings: any) {
  console.log('🔄 处理设置变化:', newSettings);
  
  if (!vrmLoader) {
    console.warn('⚠️ VRM加载器未初始化，跳过设置更新');
    return;
  }

  // 更新缩放
  if (newSettings.scale !== undefined) {
    vrmLoader.setScale(newSettings.scale);
    resetSimplifiedCollisionMesh(); // 缩放改变后需要重置碰撞网格
    console.log('✓ 已更新缩放:', newSettings.scale);
  }

  // 更新位置偏移
  if (newSettings.modelOffsetX !== undefined || newSettings.modelOffsetY !== undefined) {
    const offsetX = newSettings.modelOffsetX ?? petStore.settings.modelOffsetX;
    const offsetY = newSettings.modelOffsetY ?? petStore.settings.modelOffsetY;
    vrmLoader.setPosition(offsetX, offsetY);
    resetSimplifiedCollisionMesh(); // 位置改变后需要重置碰撞网格
    console.log('✓ 已更新位置偏移:', { x: offsetX, y: offsetY });
  }

  // 更新旋转
  if (newSettings.rotationX !== undefined || newSettings.rotationY !== undefined || newSettings.rotationZ !== undefined) {
    const rotX = newSettings.rotationX ?? petStore.settings.rotationX;
    const rotY = newSettings.rotationY ?? petStore.settings.rotationY;
    const rotZ = newSettings.rotationZ ?? petStore.settings.rotationZ;
    vrmLoader.setRotation(rotX, rotY, rotZ);
    resetSimplifiedCollisionMesh(); // 旋转改变后需要重置碰撞网格
    console.log('✓ 已更新旋转:', { x: rotX, y: rotY, z: rotZ });
  }

  // 更新光照
  if (newSettings.lighting) {
    const brightness = newSettings.lighting.brightness ?? petStore.settings.lighting.brightness;
    const ambient = newSettings.lighting.ambientColor ?? petStore.settings.lighting.ambientColor;
    const directional = newSettings.lighting.directionalColor ?? petStore.settings.lighting.directionalColor;
    vrmLoader.setLighting(brightness, ambient, directional);
    console.log('✓ 已更新光照:', { brightness, ambient, directional });
  }

  // 更新窗口大小（仅在明确需要时）
  // 只在以下情况更新窗口大小：
  // 1. 用户明确修改了 windowSize 设置
  // 2. 在自动模式下修改了 scale（需要重新计算窗口大小）
  const shouldUpdateWindowSize = 
    (newSettings.windowSize !== undefined) || 
    (newSettings.scale !== undefined && petStore.settings.windowSize?.mode === 'auto');
  
  if (shouldUpdateWindowSize) {
    try {
      // 计算新的窗口大小
      const windowSize = calculateWindowSize();
      
      // 应用窗口大小（使用 LogicalSize 实例）
      await appWindow.setSize(new LogicalSize(windowSize.width, windowSize.height));
      
      console.log(`✓ 已更新窗口大小: ${windowSize.width}x${windowSize.height} (模式: ${petStore.settings.windowSize?.mode || 'auto'})`);
      
      // 更新窗口信息缓存（用于智能穿透）
      if (smartClickThrough.value) {
        try {
          const [windowPosition, windowSizeFromApi] = await Promise.all([
            appWindow.outerPosition(),
            appWindow.outerSize()
          ]);
          cachedWindowPosition = windowPosition;
          cachedWindowSize = windowSizeFromApi;
          lastWindowInfoUpdate = Date.now();
          console.log('✓ 窗口信息缓存已更新');
        } catch (err) {
          console.warn('⚠️ 更新窗口信息缓存失败');
        }
      }
    } catch (error) {
      console.error('❌ 更新窗口大小失败:', error);
    }
  }
  
  // 更新智能穿透
  if (newSettings.smartClickThrough !== undefined) {
    smartClickThrough.value = newSettings.smartClickThrough;
    console.log('✓ 已更新智能穿透:', newSettings.smartClickThrough);
    
    // 如果启用智能穿透，禁用完全穿透并启动定时检测
    if (newSettings.smartClickThrough && clickThrough.value) {
      clickThrough.value = false;
      petStore.settings.clickThrough = false;
    }
    
    // 启动或停止智能穿透检测
    if (newSettings.smartClickThrough) {
      // 启动智能穿透
      if (smartClickThroughInterval === null) {
        // 初始化窗口信息缓存
        try {
          const [windowPosition, windowSize] = await Promise.all([
            appWindow.outerPosition(),
            appWindow.outerSize()
          ]);
          cachedWindowPosition = windowPosition;
          cachedWindowSize = windowSize;
          lastWindowInfoUpdate = Date.now();
        } catch (err) {
          console.warn('⚠️ 初始化窗口信息缓存失败');
        }
        
        // 立即执行一次检测，确保初始状态正确
        await checkSmartClickThrough();
        // 然后启动定时检测（使用当前检测间隔）
        smartClickThroughInterval = window.setInterval(checkSmartClickThrough, currentCheckInterval);
        console.log(`🎯 智能穿透检测已启动（间隔: ${currentCheckInterval}ms）`);
      }
      // 注意：不需要手动设置初始状态，checkSmartClickThrough 会自动处理
    } else {
      // 停止智能穿透
      if (smartClickThroughInterval !== null) {
        clearInterval(smartClickThroughInterval);
        smartClickThroughInterval = null;
        console.log('🎯 智能穿透检测已停止');
      }
      // 关闭智能穿透后，确保窗口不穿透（可以正常交互和拖动）
      appWindow.setIgnoreCursorEvents(false);
      isMouseOverModel = true; // 重置为初始状态
      console.log('✓ 窗口穿透已禁用，可以正常拖动');
    }
  }
  
  // 更新完全穿透
  if (newSettings.clickThrough !== undefined) {
    clickThrough.value = newSettings.clickThrough;
    console.log('✓ 已更新完全穿透:', newSettings.clickThrough);
    
    // 如果启用完全穿透，禁用智能穿透并停止定时检测
    if (newSettings.clickThrough) {
      smartClickThrough.value = false;
      petStore.settings.smartClickThrough = false;
      
      // 停止智能穿透检测
      if (smartClickThroughInterval !== null) {
        clearInterval(smartClickThroughInterval);
        smartClickThroughInterval = null;
      }
      
      appWindow.setIgnoreCursorEvents(true);
    } else if (!smartClickThrough.value) {
      // 如果两者都禁用，则不穿透
      appWindow.setIgnoreCursorEvents(false);
    }
  }
  
  // 更新动画设置
  if (newSettings.animationConfig) {
    const config = newSettings.animationConfig;
    
    // 更新呼吸动画
    if (config.enableBreathing !== undefined || config.breathingSpeed !== undefined) {
      const enabled = config.enableBreathing ?? petStore.settings.animationConfig.enableBreathing;
      const speed = config.breathingSpeed ?? petStore.settings.animationConfig.breathingSpeed;
      vrmLoader.setBreathing(enabled, speed);
      console.log('✓ 已更新呼吸动画:', { enabled, speed });
    }
    
    // 更新眨眼动画
    if (config.enableBlinking !== undefined || config.blinkInterval !== undefined) {
      const enabled = config.enableBlinking ?? petStore.settings.animationConfig.enableBlinking;
      const interval = config.blinkInterval ?? petStore.settings.animationConfig.blinkInterval;
      vrmLoader.setBlinking(enabled, interval);
      console.log('✓ 已更新眨眼动画:', { enabled, interval });
    }
    
    // 更新表情
    if (config.expression !== undefined || config.expressionIntensity !== undefined) {
      const expression = config.expression ?? petStore.settings.animationConfig.expression;
      const intensity = config.expressionIntensity ?? petStore.settings.animationConfig.expressionIntensity;
      vrmLoader.playExpression(expression, intensity);
      console.log('✓ 已更新表情:', { expression, intensity });
    }
    
    // 更新自定义动画
    if (config.currentAnimation !== undefined) {
      if (config.currentAnimation === null) {
        // 停止当前动画
        vrmLoader.stopAnimation();
        console.log('✓ 已停止自定义动画');
        
        // 恢复正常检测频率
        updateCheckInterval(false);
      } else {
        // 播放新动画
        const animation = petStore.settings.animationConfig.customAnimations.find(
          a => a.id === config.currentAnimation
        );
        if (animation) {
          const speed = config.animationSpeed ?? petStore.settings.animationConfig.animationSpeed;
          vrmLoader.loadCustomAnimation(animation.filePath, animation.loop, speed)
            .then(success => {
              if (success) {
                console.log('✓ 已加载并播放自定义动画:', animation.name);
                
                // 降低检测频率以减少卡顿
                updateCheckInterval(true);
              }
            })
            .catch(error => {
              console.error('❌ 加载自定义动画失败:', animation.name, error);
              // 显示错误提示
              alert(`加载动画失败：${animation.name}\n\n${error.message || error}`);
              // 失败时清除当前动画
              petStore.settings.animationConfig.currentAnimation = null;
              petStore.saveSettings();
              
              // 恢复正常检测频率
              updateCheckInterval(false);
            });
        }
      }
    }
    
    // 更新动画速度（仅当有正在播放的动画时）
    if (config.animationSpeed !== undefined && config.currentAnimation !== undefined && config.currentAnimation !== null) {
      vrmLoader.setAnimationSpeed(config.animationSpeed);
      console.log('✓ 已更新动画速度:', config.animationSpeed);
    }
  }
  
  // 更新吸附配置
  if (newSettings.snapConfig !== undefined) {
    // 如果吸附功能状态改变，需要初始化或清理
    if (newSettings.snapConfig.enabled !== undefined) {
      if (newSettings.snapConfig.enabled) {
        // 启用吸附：初始化任务栏信息
        taskbarInfo = await detectTaskbar();
        if (taskbarInfo) {
          console.log('✓ 任务栏信息已更新:', taskbarInfo);
        }
      } else {
        // 禁用吸附：停止检测
        stopSnapDetection();
        isSnapped.value = false;
        currentScene.value = 'idle';
        console.log('✓ 吸附功能已禁用');
      }
    }
    console.log('✓ 已更新吸附配置');
  }
  
  console.log('✅ 设置即时更新完成');
}

// 处理窗口大小变化
function handleResize() {
  if (vrmLoader) {
    vrmLoader.handleResize();
  }
}

// 显示右键菜单
function showContextMenu(e: MouseEvent) {
  if (clickThrough.value) return;
  
  // 设置标志，告诉 handleContextMenuOutside 忽略这次右键点击
  if ((window as any)._isOpeningContextMenu) {
    (window as any)._isOpeningContextMenu();
  }
  
  contextMenuX.value = e.clientX;
  contextMenuY.value = e.clientY;
  contextMenuVisible.value = true;
  
  console.log('🖱️ 右键菜单已打开');
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenuVisible.value = false;
}

// 打开设置
async function openSettings() {
  const { WebviewWindow } = await import('@tauri-apps/api/window');
  const mainWindow = WebviewWindow.getByLabel('main');
  if (mainWindow) {
    await mainWindow.setFocus();
  }
}

// 切换点击穿透
async function toggleClickThrough() {
  clickThrough.value = !clickThrough.value;
  await appWindow.setIgnoreCursorEvents(clickThrough.value);
  await petStore.updateSettings({ clickThrough: clickThrough.value });
}

// 关闭桌面伙伴
async function closePet() {
  await petStore.close();
}

// ========== 智能吸附功能 ==========

// 获取所有窗口信息
async function getAllWindows(): Promise<WindowInfo[]> {
  try {
    const windows = await invoke<WindowInfo[]>('get_all_windows');
    return windows;
  } catch (error) {
    console.error('获取窗口列表失败:', error);
    return [];
  }
}

// 获取任务栏信息（使用 Windows API）
async function detectTaskbar(): Promise<TaskbarInfo | null> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 任务栏检测调试信息 (Taskbar Detection Debug):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 使用 Rust 后端直接获取任务栏信息
    const taskbarInfo = await invoke<{
      position: string;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>('get_taskbar_info');
    
    if (!taskbarInfo) {
      console.warn('⚠️ 无法通过 Windows API 获取任务栏信息');
      console.warn('   这可能是因为任务栏是自动隐藏的，或者系统配置特殊');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;
    }
    
    // 获取屏幕尺寸（考虑 DPI 缩放）
    const dpiScale = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width * dpiScale;
    const screenHeight = window.screen.height * dpiScale;
    
    console.log('📐 屏幕信息 (Screen Info):');
    console.log(`    - DPI 缩放: ${dpiScale}x (${Math.round(dpiScale * 100)}%)`);
    console.log(`    - 逻辑分辨率: ${window.screen.width}x${window.screen.height}`);
    console.log(`    - 物理分辨率: ${screenWidth}x${screenHeight}`);
    
    console.log('');
    console.log('📊 任务栏检测结果 (通过 Windows API):');
    console.log(`    - 位置: ${taskbarInfo.position}`);
    console.log(`    - 坐标: (${taskbarInfo.x}, ${taskbarInfo.y})`);
    console.log(`    - 大小: ${taskbarInfo.width}x${taskbarInfo.height}`);
    
    // 转换位置类型
    const position = taskbarInfo.position as 'top' | 'bottom' | 'left' | 'right';
    
    // 注意：Windows API 返回的坐标是逻辑像素，需要考虑 DPI 缩放
    // 但任务栏窗口的坐标已经是屏幕坐标，不需要额外缩放
    const result: TaskbarInfo = {
      position,
      x: taskbarInfo.x,
      y: taskbarInfo.y,
      width: taskbarInfo.width,
      height: taskbarInfo.height,
    };
    
    console.log('');
    console.log('🎯 最终任务栏区域:');
    console.log(`    - 位置: ${result.position}`);
    console.log(`    - X: ${result.x} px`);
    console.log(`    - Y: ${result.y} px`);
    console.log(`    - 宽度: ${result.width} px`);
    console.log(`    - 高度: ${result.height} px`);
    
    if (result.position === 'bottom') {
      console.log(`    - 任务栏顶部位置: ${result.y} px`);
      console.log(`    - 任务栏底部位置: ${result.y + result.height} px`);
    } else if (result.position === 'top') {
      console.log(`    - 任务栏顶部位置: ${result.y} px`);
      console.log(`    - 任务栏底部位置: ${result.y + result.height} px`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 验证任务栏信息是否有效
    if (result.width === 0 || result.height === 0) {
      console.warn('⚠️ 任务栏信息无效（宽度或高度为0）');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('❌ 检测任务栏失败:', error);
    return null;
  }
}

// 检测吸附场景
async function detectSnapScene(): Promise<SnapSceneType> {
  console.log('\n🔍 ========== 开始检测吸附场景 ==========');
  
  if (!petStore.settings.snapConfig.enabled) {
    console.log('❌ 吸附功能未启用，返回 idle');
    return 'idle';
  }
  
  try {
    // 获取窗口位置
    const windowPos = await appWindow.outerPosition();
    const windowSize = await appWindow.outerSize();
    
    const snapDistance = petStore.settings.snapConfig.snapDistance;
    // 获取屏幕尺寸（考虑 DPI 缩放）
    const dpiScale = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width * dpiScale;
    const screenHeight = window.screen.height * dpiScale;
    
    console.log('📐 基础信息:');
    console.log(`    - DPI 缩放: ${dpiScale}x`);
    console.log(`    - 屏幕尺寸: ${screenWidth}x${screenHeight} (物理像素)`);
    console.log(`    - 窗口位置: (${windowPos.x}, ${windowPos.y})`);
    console.log(`    - 窗口大小: ${windowSize.width}x${windowSize.height}`);
    console.log(`    - 吸附距离阈值: ${snapDistance} px`);
    console.log(`    - 吸附到任务栏: ${petStore.settings.snapConfig.snapToTaskbar ? '✅' : '❌'}`);
    console.log(`    - 吸附到屏幕边缘: ${petStore.settings.snapConfig.snapToScreenEdges ? '✅' : '❌'}`);
    console.log(`    - 吸附到窗口: ${petStore.settings.snapConfig.snapToWindows ? '✅' : '❌'}`);
    console.log(`    - 任务栏信息: ${taskbarInfo ? '✅ 已检测' : '❌ 未检测'}`);
    
    // 窗口中心点
    const windowCenterX = windowPos.x + windowSize.width / 2;
    const windowCenterY = windowPos.y + windowSize.height / 2;
    
    // 检测任务栏吸附（检测任务栏的顶部边缘）
    if (petStore.settings.snapConfig.snapToTaskbar) {
      console.log('\n🧲 ========== 任务栏吸附检测 ==========');
      
      if (!taskbarInfo) {
        console.log('❌ 任务栏信息为空，跳过任务栏检测');
      } else {
        const tb = taskbarInfo;
        console.log('📊 任务栏信息:');
        console.log(`    - 位置: ${tb.position}`);
        console.log(`    - 坐标: (${tb.x}, ${tb.y})`);
        console.log(`    - 大小: ${tb.width}x${tb.height}`);
        console.log(`    - 顶部: ${tb.y} px`);
        console.log(`    - 底部: ${tb.y + tb.height} px`);
        
        // 桌面伙伴窗口位置
        const windowTop = windowPos.y;
        const windowBottom = windowPos.y + windowSize.height;
        
        let targetSnapPosition: number;
        let distanceFromTaskbar: number;
        let snapDescription: string;
        
        if (tb.position === 'top') {
          // 任务栏在顶部：检测窗口顶部是否靠近任务栏底部
          targetSnapPosition = tb.y + tb.height; // 任务栏底部位置
          distanceFromTaskbar = Math.abs(windowTop - targetSnapPosition);
          snapDescription = '窗口顶部紧贴任务栏底部';
          
          console.log('\n📏 距离计算（任务栏在顶部）:');
          console.log(`    - 任务栏顶部: ${tb.y} px`);
          console.log(`    - 任务栏底部: ${targetSnapPosition} px`);
          console.log(`    - 窗口顶部: ${windowTop} px`);
          console.log(`    - 窗口底部: ${windowBottom} px`);
          console.log(`    - 目标吸附位置: ${targetSnapPosition} px (${snapDescription})`);
        } else if (tb.position === 'bottom') {
          // 任务栏在底部：检测窗口底部是否靠近任务栏顶部
          targetSnapPosition = tb.y; // 任务栏顶部位置
          distanceFromTaskbar = Math.abs(windowBottom - targetSnapPosition);
          snapDescription = '窗口底部紧贴任务栏顶部';
          
          console.log('\n📏 距离计算（任务栏在底部）:');
          console.log(`    - 任务栏顶部: ${targetSnapPosition} px`);
          console.log(`    - 任务栏底部: ${tb.y + tb.height} px`);
          console.log(`    - 窗口顶部: ${windowTop} px`);
          console.log(`    - 窗口底部: ${windowBottom} px`);
          console.log(`    - 目标吸附位置: ${targetSnapPosition} px (${snapDescription})`);
        } else {
          // 任务栏在左侧或右侧，暂不支持
          console.log(`⚠️ 任务栏位置是 ${tb.position}，暂不支持该位置的吸附检测`);
          return 'idle';
        }
        
        console.log(`    - 当前距离: ${distanceFromTaskbar} px`);
        console.log(`    - 吸附阈值: ${snapDistance} px`);
        
        const isWithinSnapDistance = distanceFromTaskbar < snapDistance;
        console.log(`    - 是否在吸附范围内: ${isWithinSnapDistance ? '✅ 是' : '❌ 否'}`);
        
        if (isWithinSnapDistance) {
          console.log(`✅ 检测到任务栏顶部吸附！(${snapDescription})`);
          return 'taskbar-top';
        } else {
          console.log(`❌ 距离过远 (${distanceFromTaskbar}px > ${snapDistance}px)，未触发吸附`);
        }
      }
    } else {
      console.log('\n⏭️ 跳过任务栏检测（已禁用）');
    }
    
    // 检测屏幕边缘吸附（顶部、左侧、右侧）
    if (petStore.settings.snapConfig.snapToScreenEdges) {
      console.log('\n🖥️ ========== 屏幕边缘吸附检测 ==========');
      
      // 检测顶部
      const distanceToTop = windowPos.y;
      console.log(`    - 距离顶部: ${distanceToTop} px (阈值: ${snapDistance} px)`);
      if (distanceToTop < snapDistance) {
        console.log('✅ 检测到屏幕顶部吸附！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return 'screen-top';
      }
      
      // 检测左侧
      const distanceToLeft = windowPos.x;
      console.log(`    - 距离左侧: ${distanceToLeft} px (阈值: ${snapDistance} px)`);
      if (distanceToLeft < snapDistance) {
        console.log('✅ 检测到屏幕左侧吸附！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return 'screen-left';
      }
      
      // 检测右侧
      const distanceToRight = screenWidth - (windowPos.x + windowSize.width);
      console.log(`    - 距离右侧: ${distanceToRight} px (阈值: ${snapDistance} px)`);
      if (distanceToRight < snapDistance) {
        console.log('✅ 检测到屏幕右侧吸附！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return 'screen-right';
      }
      
      console.log('❌ 未检测到屏幕边缘吸附');
    } else {
      console.log('\n⏭️ 跳过屏幕边缘检测（已禁用）');
    }
    
    // 检测窗口吸附（检测桌面伙伴窗口中心区域是否在其他窗口上方）
    if (petStore.settings.snapConfig.snapToWindows) {
      console.log('\n🪟 ========== 窗口吸附检测 ==========');
      
      // 更新窗口列表缓存
      const now = Date.now();
      if (now - lastWindowsUpdate > WINDOWS_CACHE_TIME) {
        console.log('🔄 更新窗口列表缓存...');
        otherWindows = await getAllWindows();
        lastWindowsUpdate = now;
        console.log(`✅ 找到 ${otherWindows.length} 个窗口`);
      } else {
        console.log(`⏸️ 使用缓存的窗口列表 (${otherWindows.length} 个窗口)`);
      }
      
      // 计算桌面伙伴窗口中心区域（取中间 60% 的区域）
      const centerMargin = 0.2; // 20% 边距
      const centerX = windowPos.x + windowSize.width * 0.5;
      const centerY = windowPos.y + windowSize.height * 0.5;
      const centerWidth = windowSize.width * (1 - 2 * centerMargin);
      const centerHeight = windowSize.height * (1 - 2 * centerMargin);
      const centerLeft = windowPos.x + windowSize.width * centerMargin;
      const centerTop = windowPos.y + windowSize.height * centerMargin;
      const centerRight = centerLeft + centerWidth;
      const centerBottom = centerTop + centerHeight;
      
      console.log(`    - 中心检测区域: (${centerLeft}, ${centerTop}) - (${centerRight}, ${centerBottom})`);
      console.log(`    - 中心区域大小: ${centerWidth}x${centerHeight}`);
      
      // 检测中心区域是否在其他窗口上方
      for (const win of otherWindows) {
        const winRight = win.x + win.width;
        const winBottom = win.y + win.height;
        
        // 检查中心区域是否与窗口重叠
        const overlapX = Math.max(0, Math.min(centerRight, winRight) - Math.max(centerLeft, win.x));
        const overlapY = Math.max(0, Math.min(centerBottom, winBottom) - Math.max(centerTop, win.y));
        const overlapArea = overlapX * overlapY;
        const centerArea = centerWidth * centerHeight;
        const overlapRatio = overlapArea / centerArea;
        
        console.log(`    - 窗口 "${win.title}": 重叠比例 ${(overlapRatio * 100).toFixed(1)}% (需要 > 50%)`);
        
        // 如果重叠面积超过中心区域的 50%，认为吸附到窗口
        if (overlapArea > centerArea * 0.5) {
          snappedWindowInfo.value = win;
          console.log(`\n✅ 检测到窗口吸附: ${win.title}`);
          console.log(`✅ 最终场景: window-top`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return 'window-top';
        }
      }
      
      console.log('❌ 未检测到窗口吸附');
    } else {
      console.log('\n⏭️ 跳过窗口检测（已禁用）');
    }
    
    console.log('\n📊 未检测到任何吸附场景');
    console.log(`✅ 最终场景: idle`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return 'idle';
  } catch (error) {
    console.error('\n❌ 检测吸附场景失败:', error);
    console.log(`✅ 最终场景: idle (错误)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return 'idle';
  }
}

// 应用吸附
async function applySnap(scene: SnapSceneType) {
  if (scene === 'idle' || !petStore.settings.snapConfig.enabled) {
    return;
  }
  
  try {
    const windowSize = await appWindow.outerSize();
    // 获取屏幕尺寸（考虑 DPI 缩放）
    const dpiScale = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width * dpiScale;
    const screenHeight = window.screen.height * dpiScale;
    
    let targetX = 0;
    let targetY = 0;
    
    // 根据场景计算目标位置
    if (scene === 'taskbar-top' && taskbarInfo) {
      // 任务栏顶部吸附
      const tb = taskbarInfo;
      targetX = (screenWidth - windowSize.width) / 2;
      
      if (tb.position === 'top') {
        // 任务栏在顶部：窗口顶部紧贴任务栏底部
        targetY = tb.y + tb.height;
      } else if (tb.position === 'bottom') {
        // 任务栏在底部：窗口底部紧贴任务栏顶部
        targetY = tb.y - windowSize.height;
      } else {
        // 其他位置暂不支持
        console.warn(`⚠️ 任务栏位置 ${tb.position} 暂不支持吸附`);
        return;
      }
      
      // 确保不会超出屏幕边界
      targetX = Math.max(0, Math.min(targetX, screenWidth - windowSize.width));
      targetY = Math.max(0, Math.min(targetY, screenHeight - windowSize.height));
      
      console.log(`🧲 吸附到任务栏${tb.position === 'top' ? '底部' : '顶部'}: Y=${targetY}px`);
    } else if (scene.startsWith('screen-')) {
      // 屏幕边缘
      switch (scene) {
        case 'screen-top':
          targetX = (screenWidth - windowSize.width) / 2;
          targetY = 0;
          break;
        case 'screen-left':
          targetX = 0;
          targetY = (screenHeight - windowSize.height) / 2;
          break;
        case 'screen-right':
          targetX = screenWidth - windowSize.width;
          targetY = (screenHeight - windowSize.height) / 2;
          break;
      }
    } else if (scene === 'window-top' && snappedWindowInfo.value) {
      // 吸附到窗口上方中心位置
      const win = snappedWindowInfo.value;
      targetX = win.x + (win.width - windowSize.width) / 2;
      targetY = win.y - windowSize.height;
      
      // 确保不会超出屏幕边界
      targetX = Math.max(0, Math.min(targetX, screenWidth - windowSize.width));
      targetY = Math.max(0, Math.min(targetY, screenHeight - windowSize.height));
      
      console.log(`🪟 吸附到窗口: "${win.title}"`);
    }
    
    // 平滑移动到目标位置
    await appWindow.setPosition(new LogicalPosition(Math.round(targetX), Math.round(targetY)));
    console.log(`🧲 已吸附到: ${scene} (${Math.round(targetX)}, ${Math.round(targetY)})`);
    
  } catch (error) {
    console.error('应用吸附失败:', error);
  }
}

// 播放场景动画
async function playSceneAnimation(scene: SnapSceneType) {
  if (!petStore.settings.snapConfig.autoPlaySceneAnimation || !vrmLoader) {
    return;
  }
  
  // 查找对应场景的动画配置
  const sceneConfig = petStore.settings.snapConfig.sceneAnimations.find(
    s => s.sceneType === scene
  );
  
  if (!sceneConfig || !sceneConfig.enabled || !sceneConfig.animationId) {
    console.log(`ℹ️ 场景 ${scene} 未配置动画或已禁用`);
    return;
  }
  
  // 查找动画
  const animation = petStore.settings.animationConfig.customAnimations.find(
    a => a.id === sceneConfig.animationId
  );
  
  if (!animation) {
    console.warn(`⚠️ 未找到动画 ID: ${sceneConfig.animationId}`);
    return;
  }
  
  try {
    console.log(`🎬 播放场景动画: ${scene} -> ${animation.name}`);
    const success = await vrmLoader.loadCustomAnimation(
      animation.filePath, 
      animation.loop, 
      petStore.settings.animationConfig.animationSpeed
    );
    
    if (success) {
      console.log(`✅ 场景动画播放成功: ${animation.name}`);
      // 场景动画播放时，大幅降低碰撞检测频率以避免卡顿
      updateCheckInterval(true, true);
    }
  } catch (error) {
    console.error('播放场景动画失败:', error);
  }
}

// 检测和处理吸附（定时调用）
async function checkAndHandleSnap() {
  if (!petStore.settings.snapConfig.enabled) {
    return;
  }
  
  if (!isDragging.value) {
    return;
  }
  
  console.log('\n⏰ ========== 定时检测吸附场景 ==========');
  console.log(`    - 当前场景: ${currentScene.value}`);
  console.log(`    - 任务栏信息: ${taskbarInfo ? `✅ ${taskbarInfo.position} (${taskbarInfo.x}, ${taskbarInfo.y}, ${taskbarInfo.width}x${taskbarInfo.height})` : '❌ 未检测'}`);
  
  const newScene = await detectSnapScene();
  
  console.log(`\n📊 检测结果: ${newScene}`);
  
  // 场景变化时
  if (newScene !== currentScene.value) {
    console.log(`\n🔄 ========== 场景变化 ==========`);
    console.log(`    - 旧场景: ${currentScene.value}`);
    console.log(`    - 新场景: ${newScene}`);
    
    const wasPlayingSceneAnimation = isPlayingSceneAnimation;
    currentScene.value = newScene;
    
    if (newScene !== 'idle') {
      console.log(`✅ 触发吸附: ${newScene}`);
      isSnapped.value = true;
      await applySnap(newScene);
      await playSceneAnimation(newScene);
    } else {
      console.log(`❌ 离开吸附区域，返回空闲状态`);
      isSnapped.value = false;
      // 清除窗口吸附信息
      snappedWindowInfo.value = null;
      // 离开吸附区域，恢复正常检测频率
      if (wasPlayingSceneAnimation) {
        updateCheckInterval(false, false);
        console.log('✓ 离开吸附区域，已恢复正常检测频率');
      }
    }
  } else {
    console.log(`⏸️ 场景未变化，保持: ${currentScene.value}`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 启动吸附检测
async function startSnapDetection() {
  if (!petStore.settings.snapConfig.enabled) {
    console.log('⏭️ 吸附功能未启用，跳过启动');
    return;
  }
  
  console.log('\n🚀 ========== 启动吸附检测 ==========');
  
  // 确保任务栏信息是最新的
  if (petStore.settings.snapConfig.snapToTaskbar) {
    console.log('🔄 更新任务栏信息...');
    taskbarInfo = await detectTaskbar();
    if (taskbarInfo) {
      console.log(`✅ 任务栏信息已更新: ${taskbarInfo.position} (${taskbarInfo.x}, ${taskbarInfo.y}, ${taskbarInfo.width}x${taskbarInfo.height})`);
    } else {
      console.log('⚠️ 未能检测到任务栏信息');
    }
  }
  
  if (snapCheckInterval !== null) {
    clearInterval(snapCheckInterval);
    console.log('🔄 清除旧的检测定时器');
  }
  
  // 每200ms检测一次（拖动时）
  snapCheckInterval = window.setInterval(checkAndHandleSnap, 200);
  console.log('✅ 吸附检测已启动（每200ms检测一次）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 停止吸附检测
function stopSnapDetection() {
  if (snapCheckInterval !== null) {
    clearInterval(snapCheckInterval);
    snapCheckInterval = null;
    console.log('🧲 吸附检测已停止');
  }
}

// 获取任务栏吸附区域样式
function getTaskbarZoneStyle() {
  if (!taskbarInfo) return {};
  
  const tb = taskbarInfo;
  const snapDistance = petStore.settings.snapConfig.snapDistance;
  
  // 相对于窗口的坐标（因为 snap-overlay 是绝对定位在窗口内）
  // 我们需要计算任务栏相对于当前窗口的可视区域
  
  if (tb.position === 'bottom') {
    return {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: `${snapDistance}px`,
    };
  } else if (tb.position === 'top') {
    return {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      height: `${snapDistance}px`,
    };
  } else if (tb.position === 'left') {
    return {
      position: 'fixed',
      left: '0',
      top: '0',
      bottom: '0',
      width: `${snapDistance}px`,
    };
  } else if (tb.position === 'right') {
    return {
      position: 'fixed',
      right: '0',
      top: '0',
      bottom: '0',
      width: `${snapDistance}px`,
    };
  }
  
  return {};
}

// 获取场景名称（用于显示）
function getSceneName(scene: SnapSceneType): string {
  const sceneNames: Record<SnapSceneType, string> = {
    'idle': '空闲',
    'taskbar-top': '任务栏顶部',
    'screen-top': '屏幕顶部',
    'screen-left': '屏幕左侧',
    'screen-right': '屏幕右侧',
    'window-top': '窗口上方',
  };
  
  return sceneNames[scene] || scene;
}

</script>

<style>
/* 全局透明背景（针对桌面伙伴窗口） */
html, body, #app {
  background: transparent !important;
}

/* 确保 Three.js canvas 也是透明的 */
canvas {
  background: transparent !important;
}
</style>

<style scoped>
.pet-window {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: transparent;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none; /* 背景层不响应鼠标事件 */
}

.render-container {
  width: 100%;
  height: 100%;
  cursor: default; /* 默认指针，拖动时会自动变成 move */
}

/* 加载中覆盖层 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  color: white;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay p {
  font-size: 14px;
  margin: 0;
}

/* 错误覆盖层 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  color: white;
  z-index: 10;
  padding: 20px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-overlay p {
  font-size: 14px;
  margin: 0 0 20px 0;
  max-width: 280px;
  word-break: break-all;
}

.retry-btn {
  padding: 8px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

/* 无模型覆盖层 */
.no-model-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  color: white;
  z-index: 10;
}

.no-model-overlay .icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.no-model-overlay p {
  font-size: 14px;
  margin: 0;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 100;
  min-width: 160px;
}

.menu-item {
  padding: 8px 12px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item.danger {
  color: #ff6b6b;
}

.menu-item.danger:hover {
  background: rgba(255, 107, 107, 0.2);
}

.menu-separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

/* 调试面板 */
.debug-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  min-width: 200px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  z-index: 1000;
  pointer-events: none;
}

.debug-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #4ade80;
  font-size: 13px;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  align-items: center;
}

.debug-label {
  color: #94a3b8;
  margin-right: 12px;
}

.debug-value {
  color: #e2e8f0;
  font-weight: 500;
}

.debug-on {
  color: #4ade80;
  font-weight: bold;
}

.debug-off {
  color: #f87171;
  font-weight: bold;
}

.debug-hint {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #64748b;
  font-size: 10px;
  text-align: center;
}

/* ========== 智能吸附视觉反馈 ========== */

/* 吸附覆盖层容器 */
.snap-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

/* 吸附区域基础样式 */
.snap-zone {
  position: fixed;
  background: rgba(99, 102, 241, 0.15);
  border: 2px dashed rgba(99, 102, 241, 0.4);
  backdrop-filter: blur(8px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: scale(0.95);
  animation: snapZoneFadeIn 0.3s ease forwards;
  pointer-events: none;
}

@keyframes snapZoneFadeIn {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 激活状态的吸附区域 */
.snap-zone.active {
  background: rgba(99, 102, 241, 0.35);
  border-color: rgba(99, 102, 241, 0.8);
  border-style: solid;
  border-width: 3px;
  box-shadow: 
    0 0 20px rgba(99, 102, 241, 0.5),
    inset 0 0 30px rgba(99, 102, 241, 0.2);
  animation: snapZonePulse 1.5s ease-in-out infinite;
}

@keyframes snapZonePulse {
  0%, 100% {
    box-shadow: 
      0 0 20px rgba(99, 102, 241, 0.5),
      inset 0 0 30px rgba(99, 102, 241, 0.2);
  }
  50% {
    box-shadow: 
      0 0 40px rgba(99, 102, 241, 0.8),
      inset 0 0 50px rgba(99, 102, 241, 0.4);
  }
}

/* 吸附区域标签 */
.snap-zone-label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.5);
  transition: all 0.3s ease;
}

.snap-zone.active .snap-zone-label {
  background: rgba(99, 102, 241, 0.95);
  color: #ffffff;
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
}

/* 屏幕边缘吸附区域 */
.screen-zones {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.screen-zone {
  position: fixed;
}

.screen-zone.screen-top {
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
}

.screen-zone.screen-bottom {
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
}

.screen-zone.screen-left {
  left: 0;
  top: 0;
  bottom: 0;
  width: 60px;
}

.screen-zone.screen-right {
  right: 0;
  top: 0;
  bottom: 0;
  width: 60px;
}

/* 任务栏吸附区域（动态位置） */
.taskbar-zone {
  z-index: 10000;
}

/* 吸附状态指示器 */
.snap-indicator {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95));
  color: #ffffff;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  animation: snapIndicatorBounce 0.5s ease;
  pointer-events: none;
  z-index: 10001;
}

@keyframes snapIndicatorBounce {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.8);
  }
  50% {
    transform: translateX(-50%) translateY(5px) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* 磁性吸附效果 - 窗口拖动时的平滑过渡 */
.pet-window {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pet-window.snapping {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 吸附点指示器（小圆点） */
.snap-zone::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(99, 102, 241, 0.6);
  border-radius: 50%;
  animation: snapDotFloat 2s ease-in-out infinite;
}

.screen-top::before {
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
}

.screen-bottom::before {
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
}

.screen-left::before {
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.screen-right::before {
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

@keyframes snapDotFloat {
  0%, 100% {
    opacity: 0.6;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.5);
  }
}

.snap-zone.active::before {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.8);
  animation: snapDotActive 1s ease-in-out infinite;
}

@keyframes snapDotActive {
  0%, 100% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(2);
  }
}

/* 吸附粒子效果 */
.snap-zone.active::after {
  content: '';
  position: absolute;
  inset: -20px;
  background: 
    radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 50%);
  animation: snapParticles 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes snapParticles {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* ========== 窗口吸附检测区域 ========== */

/* 窗口检测区域容器（中心60%区域） */
.window-snap-detection-zone {
  position: absolute;
  left: 20%;
  top: 20%;
  width: 60%;
  height: 60%;
  pointer-events: none;
  z-index: 10002;
}

/* 检测区域边框 */
.detection-zone-border {
  position: absolute;
  inset: 0;
  border: 2px dashed rgba(168, 85, 247, 0.6);
  border-radius: 8px;
  background: rgba(168, 85, 247, 0.08);
}

/* 激活状态 */
.window-snap-detection-zone.active .detection-zone-border {
  border: 3px solid rgba(168, 85, 247, 0.9);
  background: rgba(168, 85, 247, 0.15);
}

/* 检测区域标签 */
.detection-zone-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  color: #6b21a8;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  border: 2px solid rgba(168, 85, 247, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.window-snap-detection-zone.active .detection-zone-label {
  background: rgba(168, 85, 247, 0.95);
  color: #ffffff;
  border-color: rgba(168, 85, 247, 0.9);
}

/* 检测到的窗口名称 */
.detected-window {
  font-size: 11px;
  color: #581c87;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-snap-detection-zone.active .detected-window {
  color: rgba(255, 255, 255, 0.95);
}

/* 四角装饰 */
.detection-zone-corners {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 3px solid rgba(168, 85, 247, 0.7);
}

.corner-tl {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 4px;
}

.corner-tr {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 4px;
}

.corner-bl {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 4px;
}

.corner-br {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 4px;
}

.window-snap-detection-zone.active .corner {
  border-color: rgba(168, 85, 247, 0.95);
  border-width: 3px;
}

</style>


