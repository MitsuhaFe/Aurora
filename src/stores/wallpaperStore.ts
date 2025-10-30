import { defineStore } from 'pinia';
import { ref } from 'vue';
import { sendCommand, onEvent } from '@/composables/useTauriBridge';

export type WallpaperType = 'static' | 'video' | 'web';

export interface WallpaperConfig {
  type: WallpaperType;
  path?: string;
  url?: string;
  volume?: number;
  loop?: boolean;
  enableAudio?: boolean;
}

export const useWallpaperStore = defineStore('wallpaper', () => {
  // 当前壁纸配置
  const currentWallpaper = ref<WallpaperConfig>({
    type: 'static',
  });
  
  // 壁纸历史记录
  const history = ref<WallpaperConfig[]>([]);
  
  // 是否正在加载
  const isLoading = ref(false);
  
  // 方法
  async function setStaticWallpaper(path: string) {
    isLoading.value = true;
    try {
      // 调用 C++ 后端设置壁纸
      await sendCommand('set_static_wallpaper', { path });
      
      currentWallpaper.value = {
        type: 'static',
        path,
      };
      
      addToHistory(currentWallpaper.value);
      console.log('静态壁纸设置成功:', path);
    } catch (error) {
      console.error('设置静态壁纸失败:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function setVideoWallpaper(path: string, options?: { volume?: number; loop?: boolean }) {
    isLoading.value = true;
    try {
      // 调用 C++ 后端设置视频壁纸
      await sendCommand('set_dynamic_wallpaper', { path, ...options });
      
      currentWallpaper.value = {
        type: 'video',
        path,
        volume: options?.volume ?? 50,
        loop: options?.loop ?? true,
      };
      
      addToHistory(currentWallpaper.value);
      console.log('动态壁纸设置成功:', path);
    } catch (error) {
      console.error('设置视频壁纸失败:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function setWebWallpaper(url: string, enableAudio = false) {
    isLoading.value = true;
    try {
      // TODO: 调用 C++ 后端设置网页壁纸
      // await sendCommand('set_web_wallpaper', { url, enableAudio });
      
      currentWallpaper.value = {
        type: 'web',
        url,
        enableAudio,
      };
      
      addToHistory(currentWallpaper.value);
    } catch (error) {
      console.error('设置网页壁纸失败:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }
  
  function addToHistory(config: WallpaperConfig) {
    // 最多保留 10 条历史记录
    history.value.unshift(config);
    if (history.value.length > 10) {
      history.value.pop();
    }
    
    // TODO: 保存到本地存储
  }
  
  function clearHistory() {
    history.value = [];
    // TODO: 清除本地存储
  }
  
  return {
    // 状态
    currentWallpaper,
    history,
    isLoading,
    
    // 方法
    setStaticWallpaper,
    setVideoWallpaper,
    setWebWallpaper,
    clearHistory,
  };
});

