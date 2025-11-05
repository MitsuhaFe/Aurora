<template>
  <div class="pet-window" @contextmenu.prevent="showContextMenu">
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
      <div class="menu-item danger" @click="closePet">❌ 关闭桌宠</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { appWindow } from '@tauri-apps/api/window';
import { readBinaryFile } from '@tauri-apps/api/fs';
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

// 智能穿透相关
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isMouseOverModel = false;

// 初始化
onMounted(async () => {
  console.log('🐱 桌宠窗口已挂载');

  // 加载设置
  petStore.loadSettings();
  vrmPath.value = petStore.settings.vrmPath;
  clickThrough.value = petStore.settings.clickThrough;
  smartClickThrough.value = petStore.settings.smartClickThrough;

  // 设置窗口属性（如果启用完全穿透）
  if (clickThrough.value) {
    await appWindow.setIgnoreCursorEvents(true);
  } else if (!smartClickThrough.value) {
    // 如果两者都禁用，则不穿透
    await appWindow.setIgnoreCursorEvents(false);
  }
  // 如果启用智能穿透，初始状态为穿透（背景）

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

  // 监听鼠标移动（用于智能穿透）
  document.addEventListener('mousemove', (event: MouseEvent) => {
    if (!smartClickThrough.value || !vrmLoader || !containerRef.value) {
      return;
    }

    // 获取相机和场景
    const camera = vrmLoader.getCamera();
    const scene = vrmLoader.getScene();
    const vrm = vrmLoader.getVrm();
    
    if (!camera || !scene || !vrm) {
      return;
    }

    // 计算鼠标在标准化设备坐标中的位置 (-1 到 +1)
    const rect = containerRef.value.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 使用 raycaster 检测鼠标是否在模型上
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(vrm.scene, true);

    const wasOverModel = isMouseOverModel;
    isMouseOverModel = intersects.length > 0;

    // 只有当状态改变时才更新窗口穿透设置
    if (wasOverModel !== isMouseOverModel) {
      // 如果鼠标在模型上，禁用穿透（可以交互）
      // 如果鼠标在背景上，启用穿透
      appWindow.setIgnoreCursorEvents(!isMouseOverModel);
      console.log(isMouseOverModel ? '🖱️ 鼠标在模型上，可交互' : '👻 鼠标在背景上，穿透');
    }
  });

  // 窗口拖动
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  containerRef.value?.addEventListener('mousedown', (e) => {
    if (!clickThrough.value && e.button === 0 && isMouseOverModel) {
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
  console.log('👋 桌宠窗口卸载');
  window.removeEventListener('resize', handleResize);
  
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
function handleSettingsChanged(newSettings: any) {
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
    
    // 如果启用智能穿透，禁用完全穿透
    if (newSettings.smartClickThrough && clickThrough.value) {
      clickThrough.value = false;
      petStore.settings.clickThrough = false;
    }
  }
  
  // 更新完全穿透
  if (newSettings.clickThrough !== undefined) {
    clickThrough.value = newSettings.clickThrough;
    console.log('✓ 已更新完全穿透:', newSettings.clickThrough);
    
    // 如果启用完全穿透，禁用智能穿透
    if (newSettings.clickThrough) {
      smartClickThrough.value = false;
      petStore.settings.smartClickThrough = false;
      appWindow.setIgnoreCursorEvents(true);
    } else if (!smartClickThrough.value) {
      // 如果两者都禁用，则不穿透
      appWindow.setIgnoreCursorEvents(false);
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
  
  contextMenuX.value = e.clientX;
  contextMenuY.value = e.clientY;
  contextMenuVisible.value = true;
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

// 关闭桌宠
async function closePet() {
  await petStore.close();
}
</script>

<style>
/* 全局透明背景（针对桌宠窗口） */
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

.render-container {
  width: 100%;
  height: 100%;
  cursor: move;
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
</style>

