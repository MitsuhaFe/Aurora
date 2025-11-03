<template>
  <div class="system-widget">
    <!-- 标题栏 -->
    <div class="header">
      <div class="icon-wrapper">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <rect x="9" y="9" width="6" height="6"/>
          <line x1="9" y1="1" x2="9" y2="4"/>
          <line x1="15" y1="1" x2="15" y2="4"/>
          <line x1="9" y1="20" x2="9" y2="23"/>
          <line x1="15" y1="20" x2="15" y2="23"/>
          <line x1="20" y1="9" x2="23" y2="9"/>
          <line x1="20" y1="14" x2="23" y2="14"/>
          <line x1="1" y1="9" x2="4" y2="9"/>
          <line x1="1" y1="14" x2="4" y2="14"/>
        </svg>
      </div>
      <h3 class="title">系统监控</h3>
    </div>

    <!-- CPU 信息区域 -->
    <div class="cpu-section">
      <div class="cpu-info">
        <div class="cpu-header">
          <svg class="cpu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <rect x="9" y="9" width="6" height="6"/>
          </svg>
          <span class="cpu-label">处理器</span>
        </div>
        <div class="cpu-name">{{ formatCpuName(systemInfo.cpu_name) }}</div>
      </div>
      <div class="cpu-usage">
        <div class="usage-header">
          <span class="usage-label">使用率</span>
          <span class="usage-value">{{ systemInfo.cpu_usage.toFixed(1) }}%</span>
        </div>
        <div class="usage-bar">
          <div class="usage-fill" :class="getCpuUsageClass(systemInfo.cpu_usage)" :style="{ width: systemInfo.cpu_usage + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 内存信息区域 -->
    <div class="memory-section">
      <div class="memory-header">
        <div class="memory-title">
          <svg class="memory-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 2h16v20H4z"/>
            <path d="M8 6h8M8 10h8M8 14h8M8 18h8"/>
          </svg>
          <span class="memory-label">内存</span>
        </div>
        <span class="memory-value">{{ systemInfo.memory_usage.toFixed(1) }}%</span>
      </div>
      <div class="memory-bar">
        <div class="memory-fill" :class="getMemoryUsageClass(systemInfo.memory_usage)" :style="{ width: systemInfo.memory_usage + '%' }"></div>
      </div>
      <div class="memory-detail">
        {{ formatBytes(systemInfo.memory_used) }} / {{ formatBytes(systemInfo.memory_total) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

interface SystemInfo {
  cpu_usage: number;
  cpu_name: string;
  memory_used: number;
  memory_total: number;
  memory_usage: number;
}

const systemInfo = ref<SystemInfo>({
  cpu_usage: 0,
  cpu_name: '获取中...',
  memory_used: 0,
  memory_total: 0,
  memory_usage: 0,
});

// 格式化 CPU 名称（去掉多余信息）
function formatCpuName(name: string): string {
  // 移除常见的多余词汇
  return name
    .replace(/\(R\)/g, '')
    .replace(/\(TM\)/g, '')
    .replace(/CPU/g, '')
    .replace(/Processor/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 根据 CPU 使用率返回样式类
function getCpuUsageClass(usage: number): string {
  if (usage < 50) return 'low';
  if (usage < 80) return 'medium';
  return 'high';
}

// 根据内存使用率返回样式类
function getMemoryUsageClass(usage: number): string {
  if (usage < 60) return 'low';
  if (usage < 85) return 'medium';
  return 'high';
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

// 更新系统信息
async function updateSystemInfo() {
  try {
    const info = await invoke<SystemInfo>('get_system_info');
    systemInfo.value = info;
  } catch (error) {
    console.error('获取系统信息失败:', error);
  }
}

let timer: number | null = null;

onMounted(() => {
  updateSystemInfo();
  timer = window.setInterval(updateSystemInfo, 1000); // 每秒更新
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.system-widget {
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
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3));
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

/* CPU 区域 */
.cpu-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.cpu-section:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.cpu-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cpu-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cpu-icon {
  width: 13px;
  height: 13px;
  opacity: 0.7;
  color: #a78bfa;
}

.cpu-label {
  font-size: 10px;
  opacity: 0.65;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.cpu-name {
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  opacity: 0.85;
  font-weight: 500;
  padding-left: 19px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cpu-usage {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.usage-label {
  font-size: 10px;
  opacity: 0.6;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.usage-value {
  font-size: 14px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  background: linear-gradient(135deg, currentColor, rgba(255, 255, 255, 0.6));
  -webkit-background-clip: text;
  background-clip: text;
}

.usage-bar {
  height: 5px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2.5px;
  overflow: hidden;
  position: relative;
}

.usage-fill {
  height: 100%;
  border-radius: 2.5px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.usage-fill::after {
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

.usage-fill.low {
  background: linear-gradient(90deg, #10b981, #34d399);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.usage-fill.medium {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.usage-fill.high {
  background: linear-gradient(90deg, #ef4444, #f87171);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

/* 内存区域 */
.memory-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.memory-section:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.memory-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.memory-icon {
  width: 13px;
  height: 13px;
  opacity: 0.7;
  color: #60a5fa;
}

.memory-label {
  font-size: 10px;
  opacity: 0.65;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.memory-value {
  font-size: 14px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  background: linear-gradient(135deg, currentColor, rgba(255, 255, 255, 0.6));
  -webkit-background-clip: text;
  background-clip: text;
}

.memory-bar {
  height: 5px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2.5px;
  overflow: hidden;
  position: relative;
}

.memory-fill {
  height: 100%;
  border-radius: 2.5px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.memory-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: slide 1.5s infinite;
}

.memory-fill.low {
  background: linear-gradient(90deg, #10b981, #34d399);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.memory-fill.medium {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.memory-fill.high {
  background: linear-gradient(90deg, #ef4444, #f87171);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.memory-detail {
  font-size: 10px;
  opacity: 0.65;
  text-align: center;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  margin-top: 2px;
}
</style>

