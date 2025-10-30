import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  // 应用状态
  const isReady = ref(false);
  const version = ref('0.1.0-alpha');
  
  // 主题设置
  const theme = ref<'light' | 'dark'>('light');
  
  // 系统托盘可见性
  const showInTray = ref(true);
  
  // 开机自启动
  const autoStart = ref(false);
  
  // 最小化到托盘
  const minimizeToTray = ref(true);
  
  // 方法
  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme;
    // TODO: 保存到本地存储
  }
  
  function toggleAutoStart() {
    autoStart.value = !autoStart.value;
    // TODO: 调用 Tauri API 设置开机自启动
  }
  
  function toggleMinimizeToTray() {
    minimizeToTray.value = !minimizeToTray.value;
    // TODO: 保存到本地存储
  }
  
  function initialize() {
    // 从本地存储加载设置
    // TODO: 实现
    isReady.value = true;
  }
  
  return {
    // 状态
    isReady,
    version,
    theme,
    showInTray,
    autoStart,
    minimizeToTray,
    
    // 方法
    setTheme,
    toggleAutoStart,
    toggleMinimizeToTray,
    initialize,
  };
});

