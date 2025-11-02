<template>
  <!-- 自动隐藏触发区域 - 不可见，用于检测鼠标 -->
  <div
    v-if="dockStore.isAutoHidden && dockStore.settings.autoHide"
    class="dock-trigger-area"
    @mouseenter="handleMouseEnter"
  ></div>

  <!-- Dock 窗口容器 - 直接应用所有样式属性，避免嵌套 -->
  <div
    ref="dockContainer"
    class="dock-container"
    :class="{ 
      'is-pinned': dockStore.settings.pinPosition,
      'is-auto-hidden': dockStore.isAutoHidden && dockStore.settings.autoHide
    }"
    :style="dockContainerStyle"
    :title="dockStore.settings.pinPosition ? 'Dock 位置已固定' : '拖动以移动 Dock'"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
  >
    <!-- 图标容器 -->
    <div class="dock-icons">
      <div
        v-for="icon in dockStore.icons"
        :key="icon.id"
        class="dock-icon"
        :style="iconStyle"
        @click="handleIconClick(icon)"
        @mouseenter="handleIconHover($event, true)"
        @mouseleave="handleIconHover($event, false)"
      >
        <div class="icon-content">
          <span class="icon-image">{{ icon.icon }}</span>
        </div>
        <div class="icon-tooltip">{{ icon.name }}</div>
      </div>
      
      <!-- 添加图标按钮 -->
      <div
        class="dock-icon add-icon"
        :style="iconStyle"
        @click="handleAddIcon"
        @mouseenter="handleIconHover($event, true)"
        @mouseleave="handleIconHover($event, false)"
      >
        <div class="icon-content">
          <span class="icon-image">➕</span>
        </div>
        <div class="icon-tooltip">添加图标</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useDockStore } from '@/stores/dockStore';
import { appWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';

// ==================== Store ====================
const dockStore = useDockStore();

// ==================== Refs ====================
const dockContainer = ref<HTMLElement | null>(null);

// ==================== 计算样式 - 即时响应设置变化 ====================

/**
 * 将十六进制颜色转换为 RGBA 格式
 * @param hex 十六进制颜色 (如 #1e1e1e)
 * @param alpha 透明度 (0-1)
 * @returns RGBA 颜色字符串
 */
function hexToRgba(hex: string, alpha: number): string {
  // 移除 # 号
  hex = hex.replace('#', '');
  
  // 处理缩写格式 (如 #fff)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // 解析 RGB 值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Dock 容器样式 - 响应式计算
 * 直接应用到窗口容器，避免额外嵌套
 * 
 * 关键：使用 rgba 颜色而不是 opacity 属性，避免影响子元素（图标）
 */
const dockContainerStyle = computed(() => {
  // 将背景色转换为 rgba 格式，应用透明度
  const backgroundColor = hexToRgba(
    dockStore.settings.backgroundColor,
    dockStore.settings.opacity
  );
  
  const style: Record<string, string> = {
    width: `${dockStore.settings.width}px`,
    height: `${dockStore.settings.height}px`,
    backgroundColor: backgroundColor, // 使用 rgba，不影响子元素
    borderRadius: `${dockStore.settings.borderRadius}px`,
    
    // CSS 变量 - 用于自动隐藏 hover 状态恢复
    '--dock-bg-color': backgroundColor,
  };

  // 阴影效果
  if (dockStore.settings.hasShadow) {
    style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    style['--dock-shadow'] = '0 8px 32px rgba(0, 0, 0, 0.3)';
  } else {
    style.boxShadow = 'none';
    style['--dock-shadow'] = 'none';
  }

  // 毛玻璃效果
  if (dockStore.settings.hasGlassEffect) {
    style.backdropFilter = 'blur(20px)';
    style.webkitBackdropFilter = 'blur(20px)';
    style['--dock-backdrop'] = 'blur(20px)';
  } else {
    style.backdropFilter = 'none';
    style.webkitBackdropFilter = 'none';
    style['--dock-backdrop'] = 'none';
  }

  return style;
});

/**
 * 图标样式 - 响应式计算
 */
const iconStyle = computed(() => ({
  width: `${dockStore.settings.iconSize}px`,
  height: `${dockStore.settings.iconSize}px`,
  fontSize: `${dockStore.settings.iconSize * 0.6}px`,
  opacity: String(dockStore.settings.iconOpacity),
}));

// ==================== 拖动功能 ====================

/**
 * 处理鼠标按下 - 开始拖动
 * Tauri 的 startDragging() 会阻塞直到用户松开鼠标
 */
async function handleMouseDown(event: MouseEvent) {
  // 如果固定位置，禁用拖动
  if (dockStore.settings.pinPosition) {
    console.log('⚠️ Dock 位置已固定，无法拖动');
    return;
  }
  
  // 只响应左键
  if (event.button !== 0) {
    return;
  }
  
  // 检查是否点击在图标上
  const target = event.target as HTMLElement;
  if (target.closest('.dock-icon')) {
    // 点击在图标上，不触发拖动
    return;
  }
  
  event.preventDefault();
  
  try {
    console.log('🖱️ [handleMouseDown] 开始拖动 Dock...');
    console.log('📍 [handleMouseDown] 拖动前的位置:', {
      x: dockStore.settings.x,
      y: dockStore.settings.y
    });
    
    // 调用 Tauri 的拖动 API（这是一个阻塞调用）
    await appWindow.startDragging();
    
    // 拖动结束后，保存新位置
    console.log('✅ [handleMouseDown] 拖动结束，获取新位置...');
    const position = await appWindow.outerPosition();
    console.log('📍 [handleMouseDown] 窗口新位置:', {
      x: position.x,
      y: position.y
    });
    
    // 保存位置
    console.log('💾 [handleMouseDown] 调用 savePosition...');
    await dockStore.savePosition(position.x, position.y);
    console.log('✅ [handleMouseDown] savePosition 调用完成');
    
    // 最终验证
    console.log('📍 [handleMouseDown] 保存后 store 中的位置:', {
      x: dockStore.settings.x,
      y: dockStore.settings.y
    });
  } catch (error) {
    console.error('❌ [handleMouseDown] 拖动失败:', error);
  }
}

// ==================== 自动隐藏 ====================

/**
 * 处理鼠标进入
 */
function handleMouseEnter() {
  dockStore.handleMouseEnter();
}

/**
 * 处理鼠标离开
 */
function handleMouseLeave() {
  dockStore.handleMouseLeave();
}

// ==================== 图标交互 ====================

/**
 * 处理图标点击
 */
async function handleIconClick(icon: any) {
  console.log('点击图标:', icon.name);
  
  try {
    if (icon.id === 'settings') {
      // 打开设置窗口
      const { WebviewWindow } = await import('@tauri-apps/api/window');
      const mainWindow = WebviewWindow.getByLabel('main');
      if (mainWindow) {
        await mainWindow.show();
        await mainWindow.setFocus();
      }
    } else if (icon.id === 'pc') {
      // 打开此电脑
      const { Command } = await import('@tauri-apps/api/shell');
      await Command.create('explorer').execute();
    } else if (icon.id === 'control-panel') {
      // 打开控制面板
      const { Command } = await import('@tauri-apps/api/shell');
      await Command.create('control').execute();
    } else if (icon.path) {
      // 打开自定义应用
      const { Command } = await import('@tauri-apps/api/shell');
      await Command.create(icon.path).execute();
    }
  } catch (error) {
    console.error('打开应用失败:', error);
  }
}

/**
 * 处理图标悬浮
 */
function handleIconHover(event: MouseEvent, isEnter: boolean) {
  const target = event.currentTarget as HTMLElement;
  const iconContent = target.querySelector('.icon-content') as HTMLElement;
  
  if (!iconContent) return;
  
  const animation = dockStore.settings.hoverAnimation;
  
  if (isEnter) {
    // 应用悬浮动画
    if (animation === 'scale' || animation === 'both') {
      iconContent.style.transform = 'scale(1.2)';
    }
    if (animation === 'glow' || animation === 'both') {
      iconContent.style.filter = 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.6))';
    }
  } else {
    // 移除悬浮动画
    iconContent.style.transform = 'scale(1)';
    iconContent.style.filter = 'none';
  }
}

/**
 * 添加图标
 */
async function handleAddIcon() {
  try {
    // 打开文件选择对话框
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: '应用程序', extensions: ['exe'] },
        { name: '所有文件', extensions: ['*'] }
      ],
    });
    
    if (selected && typeof selected === 'string') {
      // 提取文件名作为图标名称
      const fileName = selected.split('\\').pop()?.replace('.exe', '') || 'App';
      
      // 添加新图标
      dockStore.addIcon({
        id: `app-${Date.now()}`,
        name: fileName,
        icon: '📦', // 默认图标
        path: selected,
        type: 'app',
      });
    }
  } catch (error) {
    console.error('添加图标失败:', error);
  }
}

// ==================== 右键菜单（移除图标） ====================

/**
 * 显示右键菜单
 */
function handleContextMenu(event: MouseEvent, icon: any) {
  event.preventDefault();
  
  // 简单实现：直接移除
  if (confirm(`确定要移除 "${icon.name}" 吗？`)) {
    dockStore.removeIcon(icon.id);
  }
}

// ==================== Storage 同步 ====================

/**
 * 监听 localStorage 变化（从其他窗口同步）
 */
function handleStorageChange(e: StorageEvent) {
  if (e.key === 'aurora-dock-settings' && e.newValue) {
    try {
      const newSettings = JSON.parse(e.newValue);
      // 更新本地 store（触发响应式更新）
      Object.assign(dockStore.settings, newSettings);
      console.log('🔄 从主窗口同步了设置');
    } catch (error) {
      console.error('解析设置失败:', error);
    }
  } else if (e.key === 'aurora-dock-icons' && e.newValue) {
    try {
      const newIcons = JSON.parse(e.newValue);
      dockStore.icons.length = 0;
      dockStore.icons.push(...newIcons);
      console.log('🔄 从主窗口同步了图标');
    } catch (error) {
      console.error('解析图标失败:', error);
    }
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  console.log('Dock 组件已挂载');
  
  // 添加右键菜单支持
  if (dockContainer.value) {
    const icons = dockContainer.value.querySelectorAll('.dock-icon:not(.add-icon)');
    icons.forEach((iconEl, index) => {
      iconEl.addEventListener('contextmenu', (e) => {
        handleContextMenu(e as MouseEvent, dockStore.icons[index]);
      });
    });
  }
  
  // 监听 localStorage 变化（从其他窗口）
  window.addEventListener('storage', handleStorageChange);
});

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('storage', handleStorageChange);
  
  // 清理防抖计时器
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
});

// ==================== 监听设置变化 ====================

// 防抖计时器
let resizeTimer: number | null = null;

/**
 * 监听窗口大小变化，即时应用
 */
watch(
  () => [dockStore.settings.width, dockStore.settings.height],
  async ([newWidth, newHeight]) => {
    try {
      // 清除之前的计时器
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      
      // 使用短暂的防抖，避免拖动滑块时频繁调用
      resizeTimer = window.setTimeout(async () => {
        try {
          const { LogicalSize } = await import('@tauri-apps/api/window');
          await appWindow.setSize(new LogicalSize(newWidth as number, newHeight as number));
          console.log('✅ Dock 窗口大小已更新:', newWidth, 'x', newHeight);
        } catch (error) {
          console.error('❌ 设置窗口大小失败:', error);
        }
      }, 50); // 50ms 防抖
    } catch (error) {
      console.error('设置窗口大小失败:', error);
    }
  },
  { immediate: false }
);

/**
 * 监听始终置顶设置变化
 */
watch(
  () => dockStore.settings.alwaysOnTop,
  async (newValue) => {
    try {
      await appWindow.setAlwaysOnTop(newValue);
      console.log('✅ 始终置顶已更新:', newValue);
    } catch (error) {
      console.error('❌ 设置置顶失败:', error);
    }
  }
);

/**
 * 监听自动隐藏开关变化
 */
watch(
  () => dockStore.settings.autoHide,
  (newValue) => {
    if (!newValue) {
      // 关闭自动隐藏时，重置状态
      dockStore.resetAutoHide();
      console.log('✅ 自动隐藏已关闭');
    } else {
      console.log('✅ 自动隐藏已开启');
      // 开启自动隐藏时，立即启动隐藏逻辑
      // 延迟一小段时间后开始隐藏（给用户反应时间）
      setTimeout(() => {
        if (dockStore.settings.autoHide && !dockStore.isHovered) {
          dockStore.handleMouseLeave();
        }
      }, 100);
    }
  }
);
</script>

<!-- 全局样式：清除窗口背景，实现真正的透明 -->
<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: transparent !important;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
  background: transparent !important;
}
</style>

<!-- Dock 独立样式 -->
<style scoped src="@/styles/dock.css"></style>

