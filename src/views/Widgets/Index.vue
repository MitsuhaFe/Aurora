<template>
  <div 
    class="widget-container" 
    @mousedown="handleMouseDown"
  >
    <div class="widget-content" :style="containerStyle">
      <component :is="widgetComponent" v-if="widget" />
      <div v-else class="error-message">小组件加载失败</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { appWindow } from '@tauri-apps/api/window';
import { useWidgetStore } from '@/stores/widgetStore';
import TimeWidget from './TimeWidget.vue';
import NetworkWidget from './NetworkWidget.vue';
import SystemWidget from './SystemWidget.vue';
import DiskWidget from './DiskWidget.vue';

const widgetStore = useWidgetStore();

// 从 URL 参数获取小组件 ID
const urlParams = new URLSearchParams(window.location.search);
const widgetId = urlParams.get('id');

// 获取小组件设置（使用 computed 实现响应式更新）
const widget = computed(() => widgetId ? widgetStore.getWidget(widgetId) : null);

// 根据小组件类型动态加载组件
const widgetComponent = computed(() => {
  if (!widget.value) return null;
  
  switch (widget.value.type) {
    case 'time':
      return TimeWidget;
    case 'network':
      return NetworkWidget;
    case 'system':
      return SystemWidget;
    case 'disk':
      return DiskWidget;
    default:
      return null;
  }
});

// 容器样式（应用用户个性化设置）
const containerStyle = computed(() => {
  if (!widget.value) return {};
  
  // 将 hex 颜色转换为 rgba，应用透明度
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  // 显式访问所有需要响应的属性，确保依赖追踪
  const { backgroundColor, textColor, opacity, borderRadius } = widget.value;
  
  return {
    backgroundColor: hexToRgba(backgroundColor, opacity),
    color: textColor,
    borderRadius: `${borderRadius}px`,
  };
});

// ==================== 窗口大小和位置监听 ====================

let resizeObserver: ResizeObserver | null = null;
let resizeDebounceTimer: number | null = null;

/**
 * 防抖保存窗口大小
 * 参考 Dock 的经验，避免频繁保存
 */
async function debounceSaveSize() {
  if (!widgetId) return;
  
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer);
  }
  
  resizeDebounceTimer = window.setTimeout(async () => {
    try {
      // 获取物理尺寸
      const physicalSize = await appWindow.outerSize();
      // 获取 DPI 缩放因子
      const scaleFactor = await appWindow.scaleFactor();
      
      // 转换为逻辑尺寸（独立于 DPI）
      const logicalWidth = Math.round(physicalSize.width / scaleFactor);
      const logicalHeight = Math.round(physicalSize.height / scaleFactor);
      
      console.log(`📐 窗口大小变化: ${widgetId}`);
      console.log(`  - 物理尺寸: ${physicalSize.width}x${physicalSize.height}`);
      console.log(`  - DPI 缩放: ${scaleFactor}`);
      console.log(`  - 逻辑尺寸: ${logicalWidth}x${logicalHeight}`);
      
      widgetStore.saveWidgetSize(widgetId, logicalWidth, logicalHeight);
    } catch (error) {
      console.error('保存窗口大小失败:', error);
    }
  }, 300); // 300ms 防抖
}

/**
 * 动态更新光标样式
 * 在窗口边缘显示 resize 光标
 */
function updateCursor(e: MouseEvent) {
  if (widget.value?.pinPosition) {
    document.body.style.cursor = 'default';
    return;
  }
  
  const { clientX, clientY } = e;
  const { innerWidth, innerHeight } = window;
  const edgeSize = 8;
  
  const nearLeft = clientX <= edgeSize;
  const nearRight = clientX >= innerWidth - edgeSize;
  const nearTop = clientY <= edgeSize;
  const nearBottom = clientY >= innerHeight - edgeSize;
  
  // 设置相应的光标样式
  if (nearTop && nearLeft) {
    document.body.style.cursor = 'nwse-resize';
  } else if (nearTop && nearRight) {
    document.body.style.cursor = 'nesw-resize';
  } else if (nearBottom && nearLeft) {
    document.body.style.cursor = 'nesw-resize';
  } else if (nearBottom && nearRight) {
    document.body.style.cursor = 'nwse-resize';
  } else if (nearLeft || nearRight) {
    document.body.style.cursor = 'ew-resize';
  } else if (nearTop || nearBottom) {
    document.body.style.cursor = 'ns-resize';
  } else {
    document.body.style.cursor = 'move';
  }
}

// 监听 localStorage 变化（跨窗口同步）
function handleStorageChange(e: StorageEvent) {
  if (e.key === 'aurora-widget-settings' && widgetId) {
    console.log('🔄 检测到设置变化，重新加载小组件设置');
    
    // 重新加载设置
    widgetStore.loadSettings();
    
    // 验证更新
    const updatedWidget = widgetStore.getWidget(widgetId);
    if (updatedWidget) {
      console.log('✅ 小组件设置已更新:', {
        backgroundColor: updatedWidget.backgroundColor,
        textColor: updatedWidget.textColor,
        opacity: updatedWidget.opacity,
        borderRadius: updatedWidget.borderRadius,
      });
    }
  }
}

onMounted(async () => {
  console.log('小组件窗口已挂载:', widgetId);
  
  // 监听窗口大小变化
  if (widgetId) {
    try {
      // 使用 ResizeObserver 监听窗口大小变化（带防抖）
      resizeObserver = new ResizeObserver(() => {
        debounceSaveSize();
      });
      
      resizeObserver.observe(document.body);
      
      // 添加鼠标移动监听器，动态更新光标
      document.addEventListener('mousemove', updateCursor);
      
      // 监听 localStorage 变化（跨窗口同步）
      window.addEventListener('storage', handleStorageChange);
      
      console.log(`✅ 窗口监听器已设置: ${widgetId}`);
    } catch (error) {
      console.error('设置窗口监听器失败:', error);
    }
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer);
  }
  // 移除鼠标移动监听器
  document.removeEventListener('mousemove', updateCursor);
  // 移除 storage 监听器
  window.removeEventListener('storage', handleStorageChange);
});

// ==================== 拖动窗口处理 ====================

/**
 * 检测鼠标是否在窗口边缘（resize 区域）
 * @param e 鼠标事件
 * @param edgeSize 边缘区域大小（像素）
 * @returns 是否在边缘
 */
function isNearWindowEdge(e: MouseEvent, edgeSize: number = 8): boolean {
  const { clientX, clientY } = e;
  const { innerWidth, innerHeight } = window;
  
  // 检查是否在窗口边缘附近
  const nearLeft = clientX <= edgeSize;
  const nearRight = clientX >= innerWidth - edgeSize;
  const nearTop = clientY <= edgeSize;
  const nearBottom = clientY >= innerHeight - edgeSize;
  
  return nearLeft || nearRight || nearTop || nearBottom;
}

/**
 * 处理鼠标按下事件（用于拖动窗口）
 * 参考 Dock 的实现，处理 DPI 缩放和位置稳定性
 */
async function handleMouseDown(e: MouseEvent) {
  if (!widget.value || !widgetId) return;
  
  // 如果位置已固定，禁止拖动
  if (widget.value.pinPosition) {
    return;
  }
  
  // 🔑 关键修复：如果鼠标在窗口边缘，不触发拖动，让系统处理 resize
  if (isNearWindowEdge(e)) {
    console.log('🖱️ 鼠标在窗口边缘，允许调整大小');
    return;
  }
  
  // 允许在整个小组件区域拖动
  // 排除按钮、输入框等交互元素
  const target = e.target as HTMLElement;
  const isInteractiveElement = 
    target.tagName === 'BUTTON' || 
    target.tagName === 'INPUT' || 
    target.tagName === 'A' ||
    target.closest('button') ||
    target.closest('input') ||
    target.closest('a');
  
  if (!isInteractiveElement) {
    try {
      console.log(`🖱️ 开始拖动小组件: ${widgetId}`);
      
      // 记录拖动前的位置（用于计算拖动距离）
      const startPhysicalPosition = await appWindow.outerPosition();
      const startScaleFactor = await appWindow.scaleFactor();
      const startLogicalX = Math.round(startPhysicalPosition.x / startScaleFactor);
      const startLogicalY = Math.round(startPhysicalPosition.y / startScaleFactor);
      console.log(`📍 拖动前位置（物理坐标）:`, startPhysicalPosition);
      
      // 开始拖动（阻塞调用）
      await appWindow.startDragging();
      
      console.log(`✅ 拖动结束，等待位置完全稳定...`);
      
      // ========== 位置稳定性检测（加强版）==========
      // 参考 Dock 的实现，等待位置完全稳定后再保存
      // 关键：确保位置不再变化才保存，避免保存中间状态
      
      // 1. 初始等待，让窗口过渡动画完成（加长时间）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 2. 多次检查位置稳定性（更严格的检测）
      let stablePosition = await appWindow.outerPosition();
      let currentPosition = stablePosition; // 初始化当前位置
      let consecutiveStableCount = 0; // 连续稳定次数
      const requiredStableCount = 3;  // 要求连续 3 次位置不变
      
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        currentPosition = await appWindow.outerPosition();
        
        // 检查位置是否与上次相同
        if (stablePosition.x === currentPosition.x && stablePosition.y === currentPosition.y) {
          consecutiveStableCount++;
          console.log(`⏳ 位置稳定检测 ${consecutiveStableCount}/${requiredStableCount}`);
          
          // 如果连续多次位置不变，认为已稳定
          if (consecutiveStableCount >= requiredStableCount) {
            console.log(`✅ 位置已完全稳定（连续 ${requiredStableCount} 次检测相同）`);
            break;
          }
        } else {
          // 位置发生变化，重置计数器
          consecutiveStableCount = 0;
          console.log(`⏳ 位置仍在变化: (${stablePosition.x}, ${stablePosition.y}) → (${currentPosition.x}, ${currentPosition.y})`);
        }
        
        stablePosition = currentPosition;
      }
      
      // 如果循环结束还未稳定，使用最后一次的位置
      if (consecutiveStableCount < requiredStableCount) {
        console.log(`⚠️ 达到最大等待时间，使用最后检测到的位置`);
      }
      
      console.log(`✅ 开始保存位置...`);
      
      // ========== DPI 缩放处理 ==========
      // 参考 Dock 的实现，转换物理坐标为逻辑坐标
      
      const finalPhysicalPosition = currentPosition;
      const scaleFactor = await appWindow.scaleFactor();
      
      // 转换为逻辑坐标（独立于 DPI）
      const logicalX = Math.round(finalPhysicalPosition.x / scaleFactor);
      const logicalY = Math.round(finalPhysicalPosition.y / scaleFactor);
      
      console.log(`📍 拖动后位置（物理坐标）:`, finalPhysicalPosition);
      console.log(`🔍 DPI 缩放因子: ${scaleFactor}`);
      console.log(`📍 拖动后位置（逻辑坐标）: { x: ${logicalX}, y: ${logicalY} }`);
      
      // 计算拖动距离（逻辑坐标）
      const deltaX = logicalX - startLogicalX;
      const deltaY = logicalY - startLogicalY;
      const totalDistance = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));
      
      console.log(`📊 拖动距离:`, {
        x: deltaX + 'px',
        y: deltaY + 'px',
        总距离: totalDistance + 'px'
      });
      
      // 只有真正移动时才保存（> 2px）
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        widgetStore.saveWidgetPosition(widgetId, logicalX, logicalY);
        console.log(`💾 位置已保存（逻辑坐标）: ${logicalX}, ${logicalY}`);
        console.log(`💡 说明: 逻辑坐标会自动适应 DPI 缩放 (当前 ${Math.round(scaleFactor * 100)}%)`);
      } else {
        console.log(`ℹ️ 位置变化很小（< 2px），跳过保存`);
      }
      
    } catch (error) {
      console.error('拖动失败:', error);
    }
  }
}
</script>

<style>
/* 全局样式 - 确保窗口背景透明 */
html, body {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: hidden;
}

#app {
  background: transparent !important;
}
</style>

<style scoped>
.widget-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  padding: 0;
  margin: 0;
  position: relative;
  /* 不设置默认光标，让 JS 动态控制 */
}

.widget-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: opacity 0.2s ease;
  /* 背景色和圆角将通过内联样式应用 */
}

/* 重置子元素的光标，避免干扰 */
.widget-content > * {
  cursor: inherit;
}

.error-message {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  font-size: 14px;
  opacity: 0.7;
}
</style>

