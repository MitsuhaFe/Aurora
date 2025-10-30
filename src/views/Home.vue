<template>
  <div class="home-view">
    <div class="welcome-container">
      <h1 class="title">
        <span class="gradient-text">Aurora</span>
      </h1>
      <p class="subtitle">轻量级桌面美化软件</p>
      
      <div class="feature-grid">
        <div class="feature-card">
          <div class="icon">🎨</div>
          <h3>动态壁纸</h3>
          <p>支持静态、视频、网页壁纸</p>
        </div>
        
        <div class="feature-card">
          <div class="icon">🚀</div>
          <h3>Dock 栏</h3>
          <p>类似 macOS 的应用启动器</p>
        </div>
        
        <div class="feature-card">
          <div class="icon">📊</div>
          <h3>桌面小组件</h3>
          <p>时钟、天气、系统监控</p>
        </div>
        
        <div class="feature-card">
          <div class="icon">🐱</div>
          <h3>虚拟桌宠</h3>
          <p>可爱的桌面宠物陪伴</p>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="btn btn-primary" @click="goToSettings">
          开始配置
        </button>
        <button class="btn btn-secondary" @click="showAbout">
          关于 Aurora
        </button>
      </div>
      
      <div class="version-info">
        <span>Version 0.1.0-alpha</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goToSettings = () => {
  router.push('/settings');
};

const showAbout = () => {
  alert('Aurora v0.1.0-alpha\n\n一款轻量级、高性能的桌面美化软件\n\n基于 Tauri + Vue 3 + C++ 构建');
};
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.home-view::before {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  background: 
    radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px),
    radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  background-position: 0 0, 25px 25px;
  animation: moveBackground 20s linear infinite;
}

@keyframes moveBackground {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

.welcome-container {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
  max-width: 900px;
  padding: 40px;
}

.title {
  font-size: 72px;
  font-weight: 700;
  margin: 0 0 16px 0;
  animation: fadeInDown 0.8s ease-out;
}

.gradient-text {
  background: linear-gradient(90deg, #fff 0%, #f0f0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 24px;
  margin: 0 0 48px 0;
  opacity: 0.95;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
  animation: fadeInUp 0.8s ease-out 0.4s both;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 32px 24px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feature-card:hover {
  transform: translateY(-8px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2);
}

.feature-card .icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.feature-card p {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  animation: fadeInUp 0.8s ease-out 0.6s both;
}

.btn {
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.version-info {
  margin-top: 32px;
  font-size: 14px;
  opacity: 0.7;
  animation: fadeIn 0.8s ease-out 0.8s both;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

