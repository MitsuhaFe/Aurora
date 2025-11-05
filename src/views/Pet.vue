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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { appWindow } from '@tauri-apps/api/window';
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

// 背景样式计算
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

    // 首先使用边界盒进行快速粗略检测（性能开销小）
    if (!modelBoundingBox) {
      modelBoundingBox = new THREE.Box3().setFromObject(vrm.scene);
    }
    
    // 创建射线用于边界盒检测
    raycaster.setFromCamera(mouse, camera);
    const ray = raycaster.ray;
    
    // 快速边界盒检测
    const boxIntersection = ray.intersectBox(modelBoundingBox, new THREE.Vector3());
    
    let isOverModel = false;
    let intersects: any[] = [];
    
    // 只有在边界盒内时才进行精确的网格检测（减少性能消耗）
    if (boxIntersection) {
      // 精确检测，但只检测第一个交点（firstHitOnly 已设置）
      intersects = raycaster.intersectObject(vrm.scene, true);
      isOverModel = intersects.length > 0;
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
});

// 初始化
onMounted(async () => {
  console.log('🐱 桌面伙伴窗口已挂载');

  // 加载设置
  petStore.loadSettings();
  vrmPath.value = petStore.settings.vrmPath;
  clickThrough.value = petStore.settings.clickThrough;
  smartClickThrough.value = petStore.settings.smartClickThrough;

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
  await appWindow.listen('pet-settings-changed', (event) => {
    console.log('📢 收到设置变化通知:', event.payload);
    
    // 先重新加载 localStorage 中的最新设置到本地 petStore
    petStore.loadSettings();
    console.log('✓ 已从 localStorage 重新加载设置');
    
    // 然后应用变化
    handleSettingsChanged(event.payload as any);
  });

  // 监听 localStorage 变化（跨窗口同步的备用机制）
  window.addEventListener('storage', (event) => {
    if (event.key === 'aurora-pet-settings' && event.newValue) {
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

  // 如果启用了智能穿透，启动定时检测（每 100ms 检测一次，降低性能消耗）
  // 注意：使用 Tauri API 获取鼠标位置是异步的，不能太频繁
  if (smartClickThrough.value && !clickThrough.value) {
    // 立即执行一次检测，确保初始状态正确
    await checkSmartClickThrough();
    // 然后启动定时检测（100ms，减少动画卡顿）
    smartClickThroughInterval = window.setInterval(checkSmartClickThrough, 100);
    console.log('🎯 智能穿透检测已启动（初始化）');
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

  // 窗口拖动
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  containerRef.value?.addEventListener('mousedown', (e) => {
    // 拖动条件：
    // 1. 没有启用完全穿透
    // 2. 是左键点击
    // 3. 如果启用了智能穿透，则必须在模型上；如果未启用智能穿透，则总是可以拖动
    const canDrag = !clickThrough.value && e.button === 0 && (!smartClickThrough.value || isMouseOverModel);
    
    if (canDrag) {
      isDragging = true;
      startX = e.screenX;
      startY = e.screenY;
      appWindow.startDragging();
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
});

onUnmounted(() => {
  console.log('👋 桌面伙伴窗口卸载');
  window.removeEventListener('resize', handleResize);
  
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
            }
          })
          .catch(error => {
            console.error('❌ 加载自定义动画失败:', error);
            // 初始化时如果动画加载失败，静默处理（不弹窗）
          });
      }
    }

    // 重置边界盒（模型变化后需要重新计算）
    modelBoundingBox = null;
    console.log('✓ 已重置边界盒缓存');
    
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
    console.log('✓ 已更新缩放:', newSettings.scale);
  }

  // 更新位置偏移
  if (newSettings.modelOffsetX !== undefined || newSettings.modelOffsetY !== undefined) {
    const offsetX = newSettings.modelOffsetX ?? petStore.settings.modelOffsetX;
    const offsetY = newSettings.modelOffsetY ?? petStore.settings.modelOffsetY;
    vrmLoader.setPosition(offsetX, offsetY);
    console.log('✓ 已更新位置偏移:', { x: offsetX, y: offsetY });
  }

  // 更新旋转
  if (newSettings.rotationX !== undefined || newSettings.rotationY !== undefined || newSettings.rotationZ !== undefined) {
    const rotX = newSettings.rotationX ?? petStore.settings.rotationX;
    const rotY = newSettings.rotationY ?? petStore.settings.rotationY;
    const rotZ = newSettings.rotationZ ?? petStore.settings.rotationZ;
    vrmLoader.setRotation(rotX, rotY, rotZ);
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
        // 立即执行一次检测，确保初始状态正确
        await checkSmartClickThrough();
        // 然后启动定时检测（100ms，减少动画卡顿）
        smartClickThroughInterval = window.setInterval(checkSmartClickThrough, 100);
        console.log('🎯 智能穿透检测已启动');
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
              }
            })
            .catch(error => {
              console.error('❌ 加载自定义动画失败:', animation.name, error);
              // 显示错误提示
              alert(`加载动画失败：${animation.name}\n\n${error.message || error}`);
              // 失败时清除当前动画
              petStore.settings.animationConfig.currentAnimation = null;
              petStore.saveSettings();
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
</style>

