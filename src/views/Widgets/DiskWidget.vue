<template>
  <div class="disk-widget">
    <!-- 标题栏 -->
    <div class="header">
      <div class="icon-wrapper">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>
          <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>
        </svg>
      </div>
      <h3 class="title">磁盘监控</h3>
    </div>

    <!-- 磁盘列表 -->
    <div class="disk-list" v-if="disks.length > 0">
      <div class="disk-item" v-for="disk in disks" :key="disk.name">
        <div class="disk-header">
          <div class="disk-name-wrapper">
            <svg class="disk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            <span class="disk-name">{{ disk.mount_point }}</span>
          </div>
          <span class="disk-percent">{{ disk.usage_percent.toFixed(1) }}%</span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :class="getDiskUsageClass(disk.usage_percent)"
            :style="{ width: disk.usage_percent + '%' }"
          ></div>
        </div>
        <div class="disk-detail">
          {{ formatBytes(disk.used_space) }} / {{ formatBytes(disk.total_space) }}
        </div>
      </div>
    </div>
    
    <!-- 无数据 -->
    <div class="no-data" v-else>
      <svg class="no-data-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>
        <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>
      </svg>
      <p>暂无磁盘数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

interface DiskInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  used_space: number;
  usage_percent: number;
}

const disks = ref<DiskInfo[]>([]);

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

// 根据使用率获取样式类
function getDiskUsageClass(percent: number): string {
  if (percent < 50) return 'low';
  if (percent < 80) return 'medium';
  return 'high';
}

// 更新磁盘信息
async function updateDiskInfo() {
  try {
    const info = await invoke<DiskInfo[]>('get_disk_info');
    disks.value = info;
  } catch (error) {
    console.error('获取磁盘信息失败:', error);
  }
}

let timer: number | null = null;

onMounted(() => {
  updateDiskInfo();
  timer = window.setInterval(updateDiskInfo, 5000); // 每5秒更新
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.disk-widget {
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
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(251, 146, 60, 0.3));
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

/* 磁盘列表 */
.disk-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 2px;
}

.disk-list::-webkit-scrollbar {
  width: 4px;
}

.disk-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 2px;
}

.disk-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  transition: background 0.3s ease;
}

.disk-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.disk-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  position: relative;
}

.disk-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.disk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.disk-name-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.disk-icon {
  width: 13px;
  height: 13px;
  opacity: 0.7;
  color: #fb923c;
  flex-shrink: 0;
}

.disk-name {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disk-percent {
  font-size: 12px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.progress-bar {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2.5px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 2.5px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-fill::after {
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

.progress-fill.low {
  background: linear-gradient(90deg, #10b981, #34d399);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.progress-fill.medium {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.progress-fill.high {
  background: linear-gradient(90deg, #ef4444, #f87171);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.disk-detail {
  font-size: 9px;
  opacity: 0.6;
  text-align: center;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  letter-spacing: 0.2px;
}

/* 无数据 */
.no-data {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  opacity: 0.35;
  gap: 10px;
}

.no-data-icon {
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.4);
}

.no-data p {
  margin: 0;
  font-size: 12px;
  opacity: 0.8;
}
</style>

