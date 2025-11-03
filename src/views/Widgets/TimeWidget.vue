<template>
  <div class="time-widget">
    <!-- 主要时间显示 -->
    <div class="time-display">
      <div class="time">{{ time }}</div>
    </div>

    <!-- 日期信息 -->
    <div class="date-info">
      <div class="date-row">
        <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span class="date">{{ date }}</span>
      </div>
      <div class="weekday-badge">{{ weekday }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// 时间、日期、星期几
const time = ref('');
const date = ref('');
const weekday = ref('');

// 星期映射
const weekdayMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 更新时间
function updateTime() {
  const now = new Date();
  
  // 时间 HH:MM:SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  time.value = `${hours}:${minutes}:${seconds}`;
  
  // 日期 YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  date.value = `${year}-${month}-${day}`;
  
  // 星期几
  weekday.value = weekdayMap[now.getDay()];
}

// 定时器
let timer: number | null = null;

onMounted(() => {
  updateTime();
  timer = window.setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.time-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
  gap: 16px;
}

/* 时间显示 */
.time-display {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time {
  font-size: 42px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  letter-spacing: 3px;
  background: linear-gradient(135deg, currentColor, rgba(255, 255, 255, 0.7));
  -webkit-background-clip: text;
  background-clip: text;
  line-height: 1;
}

/* 日期信息 */
.date-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
}

.date-row:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.calendar-icon {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.date {
  font-size: 12px;
  opacity: 0.85;
  font-weight: 500;
  letter-spacing: 0.5px;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
}

.weekday-badge {
  font-size: 11px;
  opacity: 0.7;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
  border: 1px solid rgba(147, 51, 234, 0.2);
  letter-spacing: 0.3px;
}
</style>

