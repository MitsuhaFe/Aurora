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
        @click.left="handleIconClick(icon)"
        @contextmenu.prevent.stop="handleContextMenu($event, icon)"
        @mouseenter="handleIconHover($event, true)"
        @mouseleave="handleIconHover($event, false)"
      >
        <div class="icon-content">
          <!-- 优先显示真实图标，如果没有则显示 emoji -->
          <img v-if="icon.iconPath" :src="icon.iconPath" class="icon-image-file" :alt="icon.name" />
          <span v-else class="icon-image">{{ icon.icon }}</span>
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
import { appWindow, LogicalPosition } from '@tauri-apps/api/window';
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
    console.log('🖱️ 开始拖动 Dock...');
    
    // 记录拖动开始前的位置
    const startPosition = await appWindow.outerPosition();
    console.log('📍 拖动前位置（物理坐标）:', startPosition);
    
    // 调用 Tauri 的拖动 API（这是一个阻塞调用，会等到拖动结束）
    await appWindow.startDragging();
    
    console.log('✅ 拖动结束，等待位置稳定...');
    
    // 🔑 关键修复：等待更长时间让窗口位置完全稳定
    // Windows 的窗口拖动可能有过渡动画
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 多次获取位置，确保位置已经稳定
    let stablePosition = await appWindow.outerPosition();
    await new Promise(resolve => setTimeout(resolve, 50));
    let currentPosition = await appWindow.outerPosition();
    
    // 如果位置还在变化，继续等待
    let retries = 0;
    while (
      (stablePosition.x !== currentPosition.x || stablePosition.y !== currentPosition.y) && 
      retries < 5
    ) {
      console.log('⏳ 位置仍在变化，继续等待...');
      await new Promise(resolve => setTimeout(resolve, 50));
      stablePosition = currentPosition;
      currentPosition = await appWindow.outerPosition();
      retries++;
    }
    
    console.log('✅ 位置已稳定，开始保存...');
    
    // 获取最终稳定的位置
    const physicalPosition = currentPosition;
    const scaleFactor = await appWindow.scaleFactor();
    
    console.log('📍 拖动后位置（物理坐标）:', physicalPosition);
    console.log('🔍 DPI 缩放因子:', scaleFactor);
    
    // 转换为逻辑坐标（独立于 DPI）
    const logicalX = Math.round(physicalPosition.x / scaleFactor);
    const logicalY = Math.round(physicalPosition.y / scaleFactor);
    
    console.log('📍 拖动后位置（逻辑坐标）:', { x: logicalX, y: logicalY });
    
    // 对比拖动前后的位置变化
    const startLogicalX = Math.round(startPosition.x / scaleFactor);
    const startLogicalY = Math.round(startPosition.y / scaleFactor);
    const deltaX = logicalX - startLogicalX;
    const deltaY = logicalY - startLogicalY;
    
    console.log('📊 拖动距离:', {
      x: deltaX + 'px',
      y: deltaY + 'px',
      总距离: Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY)) + 'px'
    });
    
    // 只有当位置真正改变时才保存（避免无意义的保存）
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      // 保存逻辑坐标
      await dockStore.savePosition(logicalX, logicalY);
      console.log('💾 位置已保存（逻辑坐标）:', logicalX, logicalY);
      console.log('💡 说明: 逻辑坐标会自动适应 DPI 缩放 (当前 ' + Math.round(scaleFactor * 100) + '%)');
    } else {
      console.log('ℹ️ 位置变化很小（< 2px），跳过保存');
    }
  } catch (error) {
    console.error('❌ 拖动失败:', error);
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
  console.log('🖱️ 点击图标:', icon.name, icon);
  
  try {
    if (icon.id === 'settings') {
      // 打开设置窗口
      console.log('📱 打开设置窗口...');
      const { WebviewWindow } = await import('@tauri-apps/api/window');
      const mainWindow = WebviewWindow.getByLabel('main');
      if (mainWindow) {
        await mainWindow.show();
        await mainWindow.setFocus();
        console.log('✅ 设置窗口已打开');
      }
    } else if (icon.id === 'pc') {
      // 打开此电脑 - 使用 shell.open API
      console.log('💻 打开此电脑...');
      const { open } = await import('@tauri-apps/api/shell');
      await open('explorer.exe');
      console.log('✅ 已打开此电脑');
    } else if (icon.id === 'control-panel') {
      // 打开控制面板 - 使用 shell.open API
      console.log('⚙️ 打开控制面板...');
      const { open } = await import('@tauri-apps/api/shell');
      await open('control.exe');
      console.log('✅ 已打开控制面板');
    } else if (icon.path) {
      // 打开自定义应用 - 使用 shell.open API
      console.log('🚀 启动应用...');
      console.log('   路径:', icon.path);
      console.log('   名称:', icon.name);
      
      const { open } = await import('@tauri-apps/api/shell');
      
      try {
        // 使用 shell.open 打开应用（会使用系统默认方式打开）
        await open(icon.path);
        console.log('✅ 应用已启动');
      } catch (openError) {
        console.warn('⚠️ shell.open 失败，尝试使用 Command...');
        console.error('   错误:', openError);
        
        // fallback: 尝试使用 cmd /c start
        const { Command } = await import('@tauri-apps/api/shell');
        try {
          // 注意：使用 new Command() 而不是 Command.create()
          const command = new Command('cmd', [
            '/c', 
            'start', 
            '', 
            icon.path
          ]);
          const result = await command.execute();
          
          console.log('✅ 通过 cmd 启动成功', result);
        } catch (cmdError) {
          console.error('❌ cmd 启动也失败:', cmdError);
          throw cmdError;
        }
      }
    }
  } catch (error) {
    console.error('❌ 打开应用失败:', error);
    console.error('   图标信息:', icon);
    
    // 显示错误提示
    alert(`打开 "${icon.name}" 失败！\n\n错误详情:\n${error}\n\n请检查应用路径是否正确。`);
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
    console.log('📁 打开文件选择对话框...');
    
    // 打开文件选择对话框
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: '应用程序', extensions: ['exe'] },
        { name: '快捷方式', extensions: ['lnk'] },
        { name: '所有文件', extensions: ['*'] }
      ],
    });
    
    if (selected && typeof selected === 'string') {
      console.log('✅ 选择的文件:', selected);
      
      // 提取文件名作为图标名称
      const fileName = selected.split('\\').pop()?.replace(/\.(exe|lnk)$/i, '') || 'App';
      
      console.log('🔍 正在提取应用图标...');
      
      // 尝试获取应用的真实图标
      let iconPath = '';
      let iconData = '';
      
      try {
        // 调用 Tauri 后端获取图标
        const result = await invoke<{ success: boolean; icon?: string; error?: string }>(
          'extract_icon',
          { exePath: selected }
        );
        
        if (result.success && result.icon) {
          iconData = result.icon;
          iconPath = `data:image/png;base64,${iconData}`;
          console.log('✅ 成功获取应用图标');
        } else {
          console.warn('⚠️ 获取图标失败:', result.error);
          console.log('💡 将使用默认图标');
        }
      } catch (error) {
        console.warn('⚠️ 提取图标失败，使用默认图标:', error);
      }
      
      // 添加新图标
      dockStore.addIcon({
        id: `app-${Date.now()}`,
        name: fileName,
        icon: '📦', // emoji 作为后备
        iconPath: iconPath || undefined, // 如果有真实图标就使用
        path: selected,
        type: 'app',
      });
      
      console.log('✅ 图标已添加到 Dock:', fileName);
      if (iconPath) {
        console.log('✨ 使用真实应用图标');
      } else {
        console.log('📦 使用默认图标');
      }
    }
  } catch (error) {
    console.error('❌ 添加图标失败:', error);
  }
}

// ==================== 右键菜单（移除图标） ====================

/**
 * 处理右键菜单（移除图标）
 * 注意：event.preventDefault() 和 event.stopPropagation() 
 * 已在模板中通过 .prevent.stop 修饰符处理
 */
function handleContextMenu(event: MouseEvent, icon: any) {
  // 直接移除，无需确认
  console.log('🗑️ 右键移除图标:', icon.name);
  dockStore.removeIcon(icon.id);
  console.log('✅ 图标已移除');
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

