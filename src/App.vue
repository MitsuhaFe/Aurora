<template>
  <div id="app" class="app-container">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { onMounted } from 'vue';
import { useDockStore } from '@/stores/dockStore';
import { appWindow } from '@tauri-apps/api/window';

const dockStore = useDockStore();

onMounted(async () => {
  console.log('Aurora 应用已启动');
  
  // 仅在主窗口初始化 Dock
  const windowLabel = await appWindow.label();
  if (windowLabel === 'main') {
    try {
      await dockStore.initialize();
      console.log('Dock 初始化成功');
    } catch (error) {
      console.error('Dock 初始化失败:', error);
    }
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

