<template>
  <div id="app" class="app-container">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { onMounted } from 'vue';
import { useDockStore } from '@/stores/dockStore';
import { useWidgetStore } from '@/stores/widgetStore';
import { appWindow } from '@tauri-apps/api/window';

const dockStore = useDockStore();
const widgetStore = useWidgetStore();

onMounted(async () => {
  console.log('Aurora 应用已启动');
  
  // 仅在主窗口初始化 Dock 和小组件
  const windowLabel = appWindow.label;
  console.log('当前窗口标签:', windowLabel);
  
  if (windowLabel === 'main') {
    try {
      console.log('主窗口检测成功，开始初始化 Dock 和小组件');
      
      // 初始化 Dock
      await dockStore.initialize();
      console.log('✅ Dock 初始化成功');
      
      // 初始化小组件
      await widgetStore.initialize();
      console.log('✅ 小组件初始化成功');
    } catch (error) {
      console.error('❌ 初始化失败:', error);
    }
  } else {
    console.log('⏭️ 非主窗口，跳过初始化');
  }
});
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>

