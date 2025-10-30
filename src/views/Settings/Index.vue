<template>
  <div class="settings-view">
    <div class="settings-sidebar">
      <div class="sidebar-header">
        <h2>Aurora 设置</h2>
      </div>
      
      <nav class="sidebar-nav">
        <button
          v-for="item in menuItems"
          :key="item.id"
          :class="['nav-item', { active: activeTab === item.id }]"
          @click="activeTab = item.id"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
      
      <div class="sidebar-footer">
        <div class="app-info">
          <span class="version-text">v0.1.0-alpha</span>
        </div>
      </div>
    </div>
    
    <div class="settings-content">
      <div class="content-header">
        <h1>{{ currentMenuItem?.label }}</h1>
        <p class="content-description">{{ currentMenuItem?.description }}</p>
      </div>
      
      <div class="content-body">
        <!-- 通用设置 -->
        <div v-if="activeTab === 'general'" class="settings-panel">
          <div class="setting-item">
            <div class="setting-label">
              <h3>开机自启动</h3>
              <p>系统启动时自动运行 Aurora</p>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="auto-start" />
              <label for="auto-start" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>最小化到系统托盘</h3>
              <p>关闭窗口时最小化到托盘而不是退出</p>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="minimize-to-tray" checked />
              <label for="minimize-to-tray" class="toggle"></label>
            </div>
          </div>
        </div>
        
        <!-- 壁纸设置 -->
        <div v-else-if="activeTab === 'wallpaper'" class="settings-panel">
          <div class="setting-item">
            <div class="setting-label">
              <h3>壁纸类型</h3>
              <p>选择壁纸的类型</p>
            </div>
            <div class="setting-control">
              <select v-model="wallpaperType" class="select-input" @change="selectedFilePath = ''; statusMessage = ''">
                <option value="static">静态图片</option>
                <option value="video">视频壁纸</option>
                <option value="web">网页壁纸（暂不可用）</option>
              </select>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>壁纸文件</h3>
              <p v-if="!selectedFilePath">点击按钮选择{{ wallpaperType === 'static' ? '图片' : '视频' }}文件</p>
              <p v-else class="selected-file">{{ selectedFilePath }}</p>
            </div>
            <div class="setting-control">
              <button 
                class="btn btn-primary" 
                @click="selectWallpaperFile"
                :disabled="wallpaperType === 'web'"
              >
                {{ selectedFilePath ? '重新选择' : '选择文件' }}
              </button>
            </div>
          </div>

          <div v-if="wallpaperType === 'video'" class="setting-item">
            <div class="setting-label">
              <h3>提示</h3>
              <p style="color: #f59e0b;">⚠️ 视频壁纸需要 ffplay.exe，请确保已安装 FFmpeg</p>
            </div>
          </div>
          
          <div v-if="selectedFilePath" class="setting-item" style="border: none; padding-top: 24px;">
            <div class="wallpaper-actions">
              <button 
                class="btn btn-apply" 
                @click="applyWallpaper"
                :disabled="isApplying"
              >
                {{ isApplying ? '正在设置...' : '应用壁纸' }}
              </button>
              <span v-if="statusMessage" :class="['status-message', statusMessage.startsWith('✅') ? 'success' : statusMessage.startsWith('❌') ? 'error' : '']">
                {{ statusMessage }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Dock 设置 -->
        <div v-else-if="activeTab === 'dock'" class="settings-panel">
          <div class="setting-item">
            <div class="setting-label">
              <h3>显示 Dock 栏</h3>
              <p>在桌面底部显示应用程序 Dock 栏</p>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="show-dock" checked />
              <label for="show-dock" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>Dock 位置</h3>
              <p>设置 Dock 栏在屏幕上的位置</p>
            </div>
            <div class="setting-control">
              <select class="select-input">
                <option value="bottom">底部</option>
                <option value="left">左侧</option>
                <option value="right">右侧</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 小组件设置 -->
        <div v-else-if="activeTab === 'widgets'" class="settings-panel">
          <p class="coming-soon">小组件功能即将推出...</p>
        </div>
        
        <!-- 桌宠设置 -->
        <div v-else-if="activeTab === 'pet'" class="settings-panel">
          <p class="coming-soon">桌宠功能即将推出...</p>
        </div>
        
        <!-- 关于 -->
        <div v-else-if="activeTab === 'about'" class="settings-panel">
          <div class="about-content">
            <h2>Aurora</h2>
            <p class="version">版本 0.1.0-alpha</p>
            <p class="description">
              Aurora 是一款轻量级、高性能的桌面美化软件<br/>
              基于 Tauri + Vue 3 + C++ 构建
            </p>
            <div class="tech-stack">
              <span class="tech-badge">Tauri 1.5</span>
              <span class="tech-badge">Vue 3.3</span>
              <span class="tech-badge">TypeScript</span>
              <span class="tech-badge">C++17</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { open } from '@tauri-apps/api/dialog';
import { useWallpaperStore } from '@/stores/wallpaperStore';

const router = useRouter();
const wallpaperStore = useWallpaperStore();

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const menuItems: MenuItem[] = [
  { id: 'general', label: '通用设置', icon: '⚙️', description: '基本设置和偏好' },
  { id: 'wallpaper', label: '壁纸', icon: '🖼️', description: '管理您的桌面壁纸' },
  { id: 'dock', label: 'Dock 栏', icon: '📱', description: '配置应用启动器' },
  { id: 'widgets', label: '小组件', icon: '📊', description: '添加和管理桌面小组件' },
  { id: 'pet', label: '桌宠', icon: '🐱', description: '设置桌面宠物' },
  { id: 'about', label: '关于', icon: 'ℹ️', description: '关于 Aurora' },
];

const activeTab = ref('general');

const currentMenuItem = computed(() => {
  return menuItems.find((item) => item.id === activeTab.value);
});

// 壁纸设置
const wallpaperType = ref<'static' | 'video' | 'web'>('static');
const selectedFilePath = ref<string>('');
const isApplying = ref(false);
const statusMessage = ref<string>('');

// 选择文件
async function selectWallpaperFile() {
  try {
    let filters: any[] = [];
    
    if (wallpaperType.value === 'static') {
      filters = [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    } else if (wallpaperType.value === 'video') {
      filters = [
        { name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'webm', 'mov'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    }

    const selected = await open({
      multiple: false,
      directory: false,
      filters: filters,
    });

    if (selected && typeof selected === 'string') {
      selectedFilePath.value = selected;
      statusMessage.value = `已选择: ${selected}`;
      console.log('Selected file:', selected);
    }
  } catch (error) {
    console.error('选择文件失败:', error);
    statusMessage.value = '选择文件失败: ' + error;
  }
}

// 应用壁纸
async function applyWallpaper() {
  if (!selectedFilePath.value) {
    statusMessage.value = '请先选择文件';
    return;
  }

  isApplying.value = true;
  statusMessage.value = '正在设置壁纸...';

  try {
    if (wallpaperType.value === 'static') {
      await wallpaperStore.setStaticWallpaper(selectedFilePath.value);
      statusMessage.value = '✅ 静态壁纸设置成功！';
    } else if (wallpaperType.value === 'video') {
      await wallpaperStore.setVideoWallpaper(selectedFilePath.value, {
        loop: true,
        volume: 0
      });
      statusMessage.value = '✅ 动态壁纸设置成功！';
    } else {
      statusMessage.value = '网页壁纸功能尚未实现';
    }
    
    console.log('Wallpaper applied successfully');
  } catch (error) {
    console.error('应用壁纸失败:', error);
    statusMessage.value = '❌ 设置失败: ' + error;
  } finally {
    isApplying.value = false;
  }
}

// 已移除返回主页功能，直接使用设置页面作为主界面
</script>

<style scoped>
.settings-view {
  display: flex;
  width: 100%;
  height: 100vh;
  background: #f5f5f7;
}

.settings-sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid #e5e5e7;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #e5e5e7;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 8px;
  overflow-y: auto;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 4px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 14px;
  color: #1d1d1f;
  text-align: left;
}

.nav-item:hover {
  background: #f5f5f7;
}

.nav-item.active {
  background: #667eea;
  color: white;
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  flex: 1;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e5e5e7;
}

.app-info {
  text-align: center;
  padding: 8px;
}

.version-text {
  font-size: 12px;
  color: #86868b;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
}

.content-header {
  margin-bottom: 32px;
}

.content-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: #1d1d1f;
}

.content-description {
  margin: 0;
  font-size: 16px;
  color: #6e6e73;
}

.content-body {
  max-width: 800px;
}

.settings-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #e5e5e7;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
}

.setting-label p {
  margin: 0;
  font-size: 14px;
  color: #6e6e73;
}

.setting-control input[type="checkbox"] {
  display: none;
}

.setting-control .toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
  background: #e5e5e7;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.setting-control .toggle::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.setting-control input[type="checkbox"]:checked + .toggle {
  background: #667eea;
}

.setting-control input[type="checkbox"]:checked + .toggle::after {
  transform: translateX(20px);
}

.select-input {
  padding: 8px 12px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  background: white;
  cursor: pointer;
  min-width: 150px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.coming-soon {
  text-align: center;
  padding: 60px 20px;
  color: #6e6e73;
  font-size: 16px;
}

.about-content {
  text-align: center;
  padding: 40px 20px;
}

.about-content h2 {
  font-size: 36px;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.version {
  color: #6e6e73;
  margin: 0 0 24px 0;
}

.description {
  color: #1d1d1f;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.tech-stack {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.tech-badge {
  padding: 6px 12px;
  background: #f5f5f7;
  border-radius: 6px;
  font-size: 13px;
  color: #667eea;
  font-weight: 500;
}

/* 壁纸设置特定样式 */
.selected-file {
  color: #667eea !important;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px !important;
  word-break: break-all;
}

.wallpaper-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.btn-apply {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 32px;
  font-size: 15px;
}

.btn-apply:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-message {
  font-size: 14px;
  color: #6e6e73;
  animation: fadeIn 0.3s ease;
}

.status-message.success {
  color: #10b981;
  font-weight: 500;
}

.status-message.error {
  color: #ef4444;
  font-weight: 500;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

