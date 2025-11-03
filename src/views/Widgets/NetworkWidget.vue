<template>
  <div class="network-widget">
    <!-- 标题栏 -->
    <div class="header">
      <div class="icon-wrapper">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h3 class="title">网络监控</h3>
    </div>

    <!-- 主要速度显示 -->
    <div class="speed-section">
      <div class="speed-card upload">
        <div class="speed-header">
          <svg class="speed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          <span class="speed-label">上传</span>
        </div>
        <div class="speed-value">{{ formatSpeedShort(networkInfo.upload_speed) }}</div>
        <div class="speed-bar">
          <div class="speed-fill upload-fill" :style="{ width: getSpeedPercentage(networkInfo.upload_speed) + '%' }"></div>
        </div>
      </div>

      <div class="speed-card download">
        <div class="speed-header">
          <svg class="speed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
          <span class="speed-label">下载</span>
        </div>
        <div class="speed-value">{{ formatSpeedShort(networkInfo.download_speed) }}</div>
        <div class="speed-bar">
          <div class="speed-fill download-fill" :style="{ width: getSpeedPercentage(networkInfo.download_speed) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 详细信息 -->
    <div class="info-section">
      <div class="info-item">
        <div class="info-icon">📊</div>
        <div class="info-content">
          <div class="info-label">总流量</div>
          <div class="info-value">
            <span class="upload-text">↑ {{ formatBytes(networkInfo.total_uploaded) }}</span>
            <span class="separator">·</span>
            <span class="download-text">↓ {{ formatBytes(networkInfo.total_downloaded) }}</span>
          </div>
        </div>
      </div>

      <div class="info-item">
        <div class="info-icon">🌍</div>
        <div class="info-content">
          <div class="info-label">IP 地址</div>
          <div class="info-value ip-address">{{ networkInfo.ip_address }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

interface NetworkInfo {
  upload_speed: number;
  download_speed: number;
  total_uploaded: number;
  total_downloaded: number;
  ip_address: string;
}

const networkInfo = ref<NetworkInfo>({
  upload_speed: 0,
  download_speed: 0,
  total_uploaded: 0,
  total_downloaded: 0,
  ip_address: '获取中...',
});

// 格式化速度（字节/秒）
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
  } else {
    return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
  }
}

// 格式化字节
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } else {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
}

// 简短速度格式化（用于大字体显示）
function formatSpeedShort(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
  }
}

// 计算速度百分比（用于进度条）
function getSpeedPercentage(bytesPerSecond: number): number {
  // 假设 10 MB/s 为 100%
  const maxSpeed = 10 * 1024 * 1024;
  const percentage = (bytesPerSecond / maxSpeed) * 100;
  return Math.min(percentage, 100);
}

// 更新网络信息
async function updateNetworkInfo() {
  try {
    const info = await invoke<NetworkInfo>('get_network_info');
    networkInfo.value = info;
  } catch (error) {
    console.error('获取网络信息失败:', error);
  }
}

let timer: number | null = null;

onMounted(() => {
  updateNetworkInfo();
  timer = window.setInterval(updateNetworkInfo, 1000); // 每秒更新
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.network-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 14px;
  box-sizing: border-box;
  gap: 10px;
}

/* 标题栏 */
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.icon-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3));
  border-radius: 6px;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(0.98);
  }
}

.icon {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.title {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.9;
  letter-spacing: 0.3px;
  margin: 0;
}

/* 速度卡片区域 */
.speed-section {
  display: flex;
  gap: 8px;
  flex: 1;
}

.speed-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.speed-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.5;
}

.speed-card.upload::before {
  background: linear-gradient(90deg, transparent, #10b981, transparent);
}

.speed-card.download::before {
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
}

.speed-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.speed-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.speed-icon {
  width: 13px;
  height: 13px;
  opacity: 0.8;
}

.speed-card.upload .speed-icon {
  color: #10b981;
}

.speed-card.download .speed-icon {
  color: #3b82f6;
}

.speed-label {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.speed-value {
  font-size: 18px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  line-height: 1.2;
  margin-bottom: 8px;
  background: linear-gradient(135deg, currentColor, rgba(255, 255, 255, 0.6));
  -webkit-background-clip: text;
  background-clip: text;
}

/* 速度进度条 */
.speed-bar {
  height: 5px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2.5px;
  overflow: hidden;
  position: relative;
}

.speed-fill {
  height: 100%;
  border-radius: 2.5px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.upload-fill {
  background: linear-gradient(90deg, #10b981, #34d399);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.download-fill {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.speed-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: slide 1.5s infinite;
}

@keyframes slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 信息区域 */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s ease;
}

.info-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.info-icon {
  font-size: 16px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-label {
  font-size: 10px;
  opacity: 0.55;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  opacity: 0.85;
  font-weight: 500;
}

.upload-text {
  color: #10b981;
}

.download-text {
  color: #3b82f6;
}

.separator {
  opacity: 0.4;
  margin: 0 6px;
}

.ip-address {
  letter-spacing: 0.5px;
}
</style>

