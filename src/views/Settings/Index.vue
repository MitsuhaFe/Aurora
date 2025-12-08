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
          <!-- 启用 Dock -->
          <div class="setting-item">
            <div class="setting-label">
              <h3>显示 Dock 栏</h3>
              <p>在桌面显示应用程序 Dock 栏</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="show-dock" 
                v-model="dockStore.settings.enabled"
                @change="handleDockToggle"
              />
              <label for="show-dock" class="toggle"></label>
            </div>
          </div>
          
          <!-- 三个新增开关 -->
          <div class="setting-item">
            <div class="setting-label">
              <h3>始终置顶</h3>
              <p>Dock 栏始终保持在所有窗口的最顶层</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="always-on-top" 
                v-model="dockStore.settings.alwaysOnTop"
              />
              <label for="always-on-top" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>固定位置</h3>
              <p>禁用拖动，将 Dock 栏位置锁定在当前坐标</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="pin-position" 
                v-model="dockStore.settings.pinPosition"
              />
              <label for="pin-position" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>自动隐藏</h3>
              <p>鼠标离开 2 秒后自动隐藏，鼠标靠近时显示</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="auto-hide" 
                v-model="dockStore.settings.autoHide"
              />
              <label for="auto-hide" class="toggle"></label>
            </div>
          </div>
          
          <!-- 容器属性 -->
          <div class="setting-section-title">容器属性</div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>长度</h3>
              <p>Dock 栏的宽度 (120-1200px)</p>
            </div>
            <div class="setting-control">
              <input 
                type="range" 
                min="120" 
                max="1200" 
                step="10"
                v-model.number="dockStore.settings.width"
                class="slider"
              />
              <span class="value-display">{{ dockStore.settings.width }}px</span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>高度</h3>
              <p>Dock 栏的高度 (40-200px)</p>
            </div>
            <div class="setting-control">
              <input 
                type="range" 
                min="40" 
                max="200" 
                step="5"
                v-model.number="dockStore.settings.height"
                class="slider"
              />
              <span class="value-display">{{ dockStore.settings.height }}px</span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>透明度</h3>
              <p>Dock 栏的不透明度 (0-100%)</p>
            </div>
            <div class="setting-control">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                v-model.number="dockStore.settings.opacity"
                class="slider"
              />
              <span class="value-display">{{ Math.round(dockStore.settings.opacity * 100) }}%</span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>圆角值</h3>
              <p>Dock 栏的边框圆角 (0-80px)</p>
            </div>
            <div class="setting-control">
              <input 
                type="range" 
                min="0" 
                max="80" 
                step="2"
                v-model.number="dockStore.settings.borderRadius"
                class="slider"
              />
              <span class="value-display">{{ dockStore.settings.borderRadius }}px</span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>背景色</h3>
              <p>Dock 栏的背景颜色</p>
            </div>
            <div class="setting-control">
              <input 
                type="color" 
                v-model="dockStore.settings.backgroundColor"
                class="color-input"
              />
              <span class="value-display">{{ dockStore.settings.backgroundColor }}</span>
            </div>
          </div>
          
          <!-- 样式效果 -->
          <div class="setting-section-title">样式效果</div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>阴影效果</h3>
              <p>为 Dock 栏添加阴影</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="has-shadow" 
                v-model="dockStore.settings.hasShadow"
              />
              <label for="has-shadow" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>毛玻璃效果</h3>
              <p>为 Dock 栏添加毛玻璃背景模糊</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="has-glass-effect" 
                v-model="dockStore.settings.hasGlassEffect"
              />
              <label for="has-glass-effect" class="toggle"></label>
            </div>
          </div>
          
          <!-- 图标属性 -->
          <div class="setting-section-title">图标属性</div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>图标大小</h3>
              <p>Dock 栏中图标的大小 (32-160px)</p>
            </div>
            <div class="setting-control">
              <input 
                type="range" 
                min="32" 
                max="160" 
                step="4"
                v-model.number="dockStore.settings.iconSize"
                class="slider"
              />
              <span class="value-display">{{ dockStore.settings.iconSize }}px</span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>图标透明度</h3>
              <p>Dock 栏中图标的不透明度 (0-100%)</p>
            </div>
            <div class="setting-control">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                v-model.number="dockStore.settings.iconOpacity"
                class="slider"
              />
              <span class="value-display">{{ Math.round(dockStore.settings.iconOpacity * 100) }}%</span>
            </div>
          </div>
          
          <!-- 动画与效果 -->
          <div class="setting-section-title">动画与效果</div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮放大</h3>
              <p>鼠标悬浮时图标放大效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-hover-scale" 
                v-model="dockStore.settings.animations.iconHoverScale"
              />
              <label for="icon-hover-scale" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮发光</h3>
              <p>鼠标悬浮时图标发光效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-hover-glow" 
                v-model="dockStore.settings.animations.iconHoverGlow"
              />
              <label for="icon-hover-glow" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>点击涟漪</h3>
              <p>点击图标时产生涟漪扩散效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-click-ripple" 
                v-model="dockStore.settings.animations.iconClickRipple"
              />
              <label for="icon-click-ripple" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>图标弹跳</h3>
              <p>添加图标时的弹跳进场动画</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-bounce" 
                v-model="dockStore.settings.animations.iconBounce"
              />
              <label for="icon-bounce" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮旋转</h3>
              <p>鼠标悬浮时图标轻微旋转效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-rotate" 
                v-model="dockStore.settings.animations.iconRotate"
              />
              <label for="icon-rotate" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>3D 效果</h3>
              <p>启用图标 3D 透视变换效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-3d-effect" 
                v-model="dockStore.settings.animations.icon3DEffect"
              />
              <label for="icon-3d-effect" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>平滑过渡</h3>
              <p>所有属性变化使用平滑过渡动画</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="smooth-transition" 
                v-model="dockStore.settings.animations.smoothTransition"
              />
              <label for="smooth-transition" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>Dock 滑入/滑出</h3>
              <p>Dock 栏显示/隐藏时的滑动动画</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="dock-slide" 
                v-model="dockStore.settings.animations.dockSlide"
              />
              <label for="dock-slide" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮浮动</h3>
              <p>鼠标悬浮时图标上下浮动</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-hover-float" 
                v-model="dockStore.settings.animations.iconHoverFloat"
              />
              <label for="icon-hover-float" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮摇晃</h3>
              <p>鼠标悬浮时图标轻微摇晃</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-hover-shake" 
                v-model="dockStore.settings.animations.iconHoverShake"
              />
              <label for="icon-hover-shake" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮脉冲</h3>
              <p>鼠标悬浮时图标脉冲缩放</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-hover-pulse" 
                v-model="dockStore.settings.animations.iconHoverPulse"
              />
              <label for="icon-hover-pulse" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>点击弹性</h3>
              <p>点击图标时产生弹性缩放效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-click-bounce" 
                v-model="dockStore.settings.animations.iconClickBounce"
              />
              <label for="icon-click-bounce" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>光泽闪过</h3>
              <p>图标表面定期闪过光泽效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-shine" 
                v-model="dockStore.settings.animations.iconShine"
              />
              <label for="icon-shine" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮倾斜</h3>
              <p>鼠标悬浮时图标轻微倾斜</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-hover-tilt" 
                v-model="dockStore.settings.animations.iconHoverTilt"
              />
              <label for="icon-hover-tilt" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>彩虹边框</h3>
              <p>图标边框循环显示彩虹色</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-rainbow-border" 
                v-model="dockStore.settings.animations.iconRainbowBorder"
              />
              <label for="icon-rainbow-border" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>波浪效果</h3>
              <p>图标产生波浪起伏效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-wave" 
                v-model="dockStore.settings.animations.iconWave"
              />
              <label for="icon-wave" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>悬浮翻转</h3>
              <p>鼠标悬浮时图标翻转180度</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-flip" 
                v-model="dockStore.settings.animations.iconFlip"
              />
              <label for="icon-flip" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>心跳效果</h3>
              <p>图标产生心跳般的缩放效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-heartbeat" 
                v-model="dockStore.settings.animations.iconHeartbeat"
              />
              <label for="icon-heartbeat" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>摆动效果</h3>
              <p>鼠标悬浮时图标像钟摆一样摆动</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-swing" 
                v-model="dockStore.settings.animations.iconSwing"
              />
              <label for="icon-swing" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>橡皮筋效果</h3>
              <p>鼠标悬浮时图标产生橡皮筋拉伸效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-rubber-band" 
                v-model="dockStore.settings.animations.iconRubberBand"
              />
              <label for="icon-rubber-band" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>果冻效果</h3>
              <p>鼠标悬浮时图标产生果冻摇晃效果</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-jello" 
                v-model="dockStore.settings.animations.iconJello"
              />
              <label for="icon-jello" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>摇摆效果</h3>
              <p>鼠标悬浮时图标左右摇摆</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-wobble" 
                v-model="dockStore.settings.animations.iconWobble"
              />
              <label for="icon-wobble" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>闪光效果</h3>
              <p>图标定期闪烁发光</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-flash" 
                v-model="dockStore.settings.animations.iconFlash"
              />
              <label for="icon-flash" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>360度旋转</h3>
              <p>鼠标悬浮时图标旋转一圈</p>
            </div>
            <div class="setting-control">
              <input 
                type="checkbox" 
                id="icon-rotate-360" 
                v-model="dockStore.settings.animations.iconRotate360"
              />
              <label for="icon-rotate-360" class="toggle"></label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">
              <h3>动画速度</h3>
              <p>全局动画播放速度</p>
            </div>
            <div class="setting-control">
              <select v-model="dockStore.settings.animationSpeed" class="select-input">
                <option value="slow">慢速 (0.5s)</option>
                <option value="normal">正常 (0.3s)</option>
                <option value="fast">快速 (0.15s)</option>
              </select>
            </div>
          </div>
          
          <!-- 图标管理 -->
          <div class="setting-section-title">图标管理</div>
          
          <div class="icon-management">
            <p class="management-description">管理 Dock 栏上的应用程序图标</p>
            
            <button class="btn-add-icon" @click="handleAddIcon">
              <span class="icon">➕</span>
              <span>添加应用图标</span>
            </button>
            
            <div class="icon-list">
              <div 
                v-for="icon in dockStore.icons" 
                :key="icon.id"
                class="icon-item"
              >
                <div class="icon-preview">
                  <!-- 优先显示真实图标 -->
                  <img v-if="icon.iconPath" :src="icon.iconPath" class="icon-image" :alt="icon.name" />
                  <span v-else class="icon-emoji">{{ icon.icon }}</span>
                </div>
                <div class="icon-info">
                  <span class="icon-name">{{ icon.name }}</span>
                  <span class="icon-type">{{ icon.type === 'system' ? '系统图标' : '自定义应用' }}</span>
                </div>
                <button 
                  class="btn-remove"
                  @click="handleRemoveIcon(icon.id)"
                  :title="icon.type === 'system' ? '移除系统图标' : '移除自定义图标'"
                >
                  🗑️ 移除
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 小组件设置 -->
        <div v-else-if="activeTab === 'widgets'" class="settings-panel">
          <!-- 添加小组件 -->
          <div class="widget-add-section">
            <h3>添加小组件</h3>
            <div class="widget-types">
              <button class="widget-type-btn" @click="addWidgetByType('time')">
                <span class="widget-type-icon">🕐</span>
                <span class="widget-type-name">时间</span>
              </button>
              <button class="widget-type-btn" @click="addWidgetByType('network')">
                <span class="widget-type-icon">🌐</span>
                <span class="widget-type-name">网络监控</span>
              </button>
              <button class="widget-type-btn" @click="addWidgetByType('system')">
                <span class="widget-type-icon">💻</span>
                <span class="widget-type-name">系统监控</span>
              </button>
              <button class="widget-type-btn" @click="addWidgetByType('disk')">
                <span class="widget-type-icon">💾</span>
                <span class="widget-type-name">磁盘监控</span>
              </button>
            </div>
          </div>
          
          <!-- 小组件列表 -->
          <div class="widget-list-section">
            <h3>已添加的小组件</h3>
            <div v-if="widgetStore.widgets.length > 0" class="widget-list">
              <div 
                v-for="widget in widgetStore.widgets" 
                :key="widget.id" 
                class="widget-item"
              >
                <div class="widget-info">
                  <span class="widget-icon">{{ getWidgetIcon(widget.type) }}</span>
                  <div class="widget-details">
                    <div class="widget-name">{{ getWidgetName(widget.type) }}</div>
                    <div class="widget-id">ID: {{ widget.id }}</div>
                  </div>
                </div>
                
                <div class="widget-controls">
                  <label class="toggle-small">
                    <input 
                      type="checkbox" 
                      v-model="widget.enabled"
                      @change="toggleWidgetEnabled(widget.id, widget.enabled)"
                    />
                    <span></span>
                  </label>
                  <button 
                    class="btn-icon" 
                    @click="selectedWidget = widget"
                    title="设置"
                  >
                    ⚙️
                  </button>
                  <button 
                    class="btn-icon btn-danger" 
                    @click="removeWidgetById(widget.id)"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="no-widgets">
              <p>还没有添加任何小组件</p>
              <p class="hint">点击上方按钮添加小组件</p>
            </div>
          </div>
          
          <!-- 小组件详细设置弹窗 -->
          <div v-if="selectedWidget" class="widget-settings-modal" @click.self="selectedWidget = null">
            <div class="modal-content">
              <div class="modal-header">
                <h3>{{ getWidgetName(selectedWidget.type) }} 设置</h3>
                <button class="close-btn" @click="selectedWidget = null">✕</button>
              </div>
              
              <div class="modal-body">
                <!-- 背景颜色 -->
                <div class="setting-item">
                  <label>背景颜色</label>
                  <input 
                    type="color" 
                    v-model="selectedWidget.backgroundColor"
                    @input="handleWidgetStyleChange"
                  />
                </div>
                
                <!-- 字体颜色 -->
                <div class="setting-item">
                  <label>字体颜色</label>
                  <input 
                    type="color" 
                    v-model="selectedWidget.textColor"
                    @input="handleWidgetStyleChange"
                  />
                </div>
                
                <!-- 透明度 -->
                <div class="setting-item">
                  <label>透明度: {{ (selectedWidget.opacity * 100).toFixed(0) }}%</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    v-model.number="selectedWidget.opacity"
                    @input="handleWidgetStyleChange"
                  />
                </div>
                
                <!-- 圆角 -->
                <div class="setting-item">
                  <label>圆角: {{ selectedWidget.borderRadius }}px</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="40" 
                    step="2"
                    v-model.number="selectedWidget.borderRadius"
                    @input="handleWidgetStyleChange"
                  />
                </div>
                
                <!-- 始终置顶 -->
                <div class="setting-item">
                  <label>
                    <input 
                      type="checkbox" 
                      v-model="selectedWidget.alwaysOnTop"
                      @change="handleWidgetPropertyChange"
                    />
                    始终置顶
                  </label>
                </div>
                
                <!-- 固定位置 -->
                <div class="setting-item">
                  <label>
                    <input 
                      type="checkbox" 
                      v-model="selectedWidget.pinPosition"
                      @change="handleWidgetPropertyChange"
                    />
                    固定位置（禁止拖动）
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 桌面伙伴设置 -->
        <div v-else-if="activeTab === 'pet'" class="settings-panel">
          <PetSettings />
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { open } from '@tauri-apps/api/dialog';
import PetSettings from './PetSettings.vue';
import { useWallpaperStore } from '@/stores/wallpaperStore';
import { useDockStore } from '@/stores/dockStore';
import { useWidgetStore } from '@/stores/widgetStore';
import type { WidgetType, WidgetSettings } from '@/stores/widgetStore';

const router = useRouter();
const wallpaperStore = useWallpaperStore();
const dockStore = useDockStore();
const widgetStore = useWidgetStore();

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
  { id: 'pet', label: '桌面伙伴', icon: '🐱', description: '设置桌面伙伴' },
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

// Dock 相关方法
async function handleDockToggle() {
  try {
    await dockStore.toggleDock(dockStore.settings.enabled);
  } catch (error) {
    console.error('切换 Dock 失败:', error);
  }
}

/**
 * 添加图标
 */
async function handleAddIcon() {
  try {
    console.log('📁 打开文件选择对话框...');
    
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: '应用程序', extensions: ['exe'] },
        { name: '快捷方式', extensions: ['lnk'] },
        { name: '所有文件', extensions: ['*'] }
      ],
    });
    
    if (selected && typeof selected === 'string') {
      console.log('✅ 选择的文件:', selected);
      
      // 提取文件名
      const fileName = selected.split('\\').pop()?.replace(/\.(exe|lnk)$/i, '') || 'App';
      
      console.log('🔍 正在提取应用图标...');
      
      // 尝试获取应用的真实图标
      let iconPath = '';
      
      try {
        const { invoke } = await import('@tauri-apps/api/tauri');
        const result = await invoke<{ success: boolean; icon?: string; error?: string }>(
          'extract_icon',
          { exePath: selected }
        );
        
        if (result.success && result.icon) {
          iconPath = `data:image/png;base64,${result.icon}`;
          console.log('✅ 成功获取应用图标');
        } else {
          console.warn('⚠️ 获取图标失败:', result.error);
          console.log('💡 将使用默认图标');
        }
      } catch (error) {
        console.warn('⚠️ 提取图标失败，使用默认图标:', error);
      }
      
      // 添加新图标
      dockStore.addIcon({
        id: `app-${Date.now()}`,
        name: fileName,
        icon: '📦',
        iconPath: iconPath || undefined,
        path: selected,
        type: 'app',
      });
      
      console.log('✅ 图标已添加到 Dock:', fileName);
      if (iconPath) {
        console.log('✨ 使用真实应用图标');
      } else {
        console.log('📦 使用默认图标');
      }
    }
  } catch (error) {
    console.error('❌ 添加图标失败:', error);
    alert('添加图标失败: ' + error);
  }
}

/**
 * 移除图标
 */
function handleRemoveIcon(iconId: string) {
  // 直接移除，无需确认
  console.log('🗑️ 移除图标:', iconId);
  dockStore.removeIcon(iconId);
  console.log('✅ 图标已移除');
}

// ==================== 小组件相关方法 ====================

// 选中的小组件（用于编辑）
const selectedWidget = ref<WidgetSettings | null>(null);

// 获取小组件图标
function getWidgetIcon(type: WidgetType): string {
  const icons: Record<WidgetType, string> = {
    time: '🕐',
    network: '🌐',
    system: '💻',
    disk: '💾',
  };
  return icons[type];
}

// 获取小组件名称
function getWidgetName(type: WidgetType): string {
  const names: Record<WidgetType, string> = {
    time: '时间',
    network: '网络监控',
    system: '系统监控',
    disk: '磁盘监控',
  };
  return names[type];
}

// 添加小组件
async function addWidgetByType(type: WidgetType) {
  try {
    await widgetStore.addWidget(type);
    console.log(`✅ 添加小组件成功: ${type}`);
  } catch (error) {
    console.error(`❌ 添加小组件失败: ${type}`, error);
  }
}

// 切换小组件启用状态
async function toggleWidgetEnabled(widgetId: string, enabled: boolean) {
  try {
    await widgetStore.toggleWidget(widgetId, enabled);
    console.log(`✅ 切换小组件状态: ${widgetId} -> ${enabled ? '启用' : '禁用'}`);
  } catch (error) {
    console.error('❌ 切换小组件状态失败:', error);
  }
}

// 删除小组件
async function removeWidgetById(widgetId: string) {
  if (confirm('确定要删除这个小组件吗？')) {
    try {
      await widgetStore.removeWidget(widgetId);
      console.log(`✅ 删除小组件成功: ${widgetId}`);
    } catch (error) {
      console.error('❌ 删除小组件失败:', error);
    }
  }
}

// 防抖定时器
let styleChangeTimer: number | null = null;

// 处理小组件样式变化（防抖）
function handleWidgetStyleChange() {
  if (!selectedWidget.value) return;
  
  // 清除之前的定时器
  if (styleChangeTimer) {
    clearTimeout(styleChangeTimer);
  }
  
  // 设置新的定时器，300ms 后触发更新
  styleChangeTimer = window.setTimeout(() => {
    notifyWidgetUpdate();
  }, 300);
}

// 处理小组件属性变化（立即生效）
async function handleWidgetPropertyChange() {
  if (!selectedWidget.value) return;
  
  // 立即更新窗口属性
  try {
    await widgetStore.updateWidget(selectedWidget.value.id, {
      alwaysOnTop: selectedWidget.value.alwaysOnTop,
      pinPosition: selectedWidget.value.pinPosition,
    });
  } catch (error) {
    console.error('❌ 更新窗口属性失败:', error);
  }
  
  // 通知其他窗口
  notifyWidgetUpdate();
}

// 通知小组件窗口更新
function notifyWidgetUpdate() {
  // 使用正确的存储键触发跨窗口 storage 事件
  const STORAGE_KEY = 'aurora-widgets-settings';
  const currentData = localStorage.getItem(STORAGE_KEY) || JSON.stringify(widgetStore.widgets);
  localStorage.removeItem(STORAGE_KEY);
  
  // 使用 setTimeout 确保 remove 事件先触发
  setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, currentData);
    console.log('📢 已通知小组件窗口更新设置');
  }, 10);
}

// ==================== 跨窗口同步 ====================

/**
 * 监听 localStorage 变化（从 Dock 窗口同步）
 */
function handleStorageChange(e: StorageEvent) {
  // 同步设置变化
  if (e.key === 'aurora-dock-settings' && e.newValue) {
    try {
      const newSettings = JSON.parse(e.newValue);
      dockStore.syncSettingsFromStorage(newSettings);
      console.log('🔄 从 Dock 窗口同步了设置');
    } catch (error) {
      console.error('❌ 解析设置失败:', error);
    }
  } 
  // 同步图标变化
  else if (e.key === 'aurora-dock-icons' && e.newValue) {
    try {
      const newIcons = JSON.parse(e.newValue);
      dockStore.syncIconsFromStorage(newIcons);
      console.log('🔄 从 Dock 窗口同步了图标列表');
    } catch (error) {
      console.error('❌ 解析图标失败:', error);
    }
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  // 监听 localStorage 变化（从其他窗口）
  window.addEventListener('storage', handleStorageChange);
  console.log('✅ 设置页面已挂载，开始监听跨窗口数据同步');
  
  // 检查 Dock 状态同步问题
  // 如果 enabled 是 true 但没有初始化，说明应用启动时初始化失败了
  if (dockStore.settings.enabled && !dockStore.isInitialized) {
    console.warn('⚠️ 检测到状态不同步：Dock 已启用但未初始化');
    console.log('🔄 尝试重新初始化 Dock...');
    try {
      await dockStore.initialize();
      console.log('✅ Dock 重新初始化成功');
    } catch (error) {
      console.error('❌ Dock 重新初始化失败:', error);
      // 如果初始化失败，将开关状态设置为 false，保持一致
      dockStore.settings.enabled = false;
      console.log('🔄 已将 Dock 开关设置为关闭状态');
    }
  }
});

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('storage', handleStorageChange);
  console.log('👋 设置页面已卸载，停止监听');
});
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

/* Dock 设置特定样式 */
.setting-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  margin: 24px 0 16px 0;
  padding-top: 16px;
  border-top: 1px solid #e5e5e7;
}

.setting-section-title:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

/* 滑块样式 */
.slider {
  width: 200px;
  height: 6px;
  border-radius: 3px;
  background: #e5e5e7;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  margin-right: 12px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

/* 颜色选择器样式 */
.color-input {
  width: 60px;
  height: 36px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  cursor: pointer;
  margin-right: 12px;
  padding: 0;
  outline: none;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 4px;
}

.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

.color-input::-moz-color-swatch {
  border: none;
  border-radius: 6px;
}

/* 数值显示 */
.value-display {
  font-size: 14px;
  font-weight: 500;
  color: #667eea;
  min-width: 60px;
  text-align: right;
}

/* 图标管理 */
.icon-management {
  margin-top: 16px;
}

.management-description {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
}

.btn-add-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 16px;
}

.btn-add-icon:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-add-icon .icon {
  font-size: 18px;
}

/* 图标列表 */
.icon-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.icon-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f7;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.icon-item:hover {
  background: #ebebed;
  border-color: #667eea;
}

.icon-preview {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 4px;
}

.icon-image {
  width: 48px;
  height: 48px;
  object-fit: contain;
  
  /* 优化图像渲染质量 */
  image-rendering: auto;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.icon-emoji {
  font-size: 32px;
  line-height: 1;
}

.icon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.icon-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
}

.icon-type {
  font-size: 12px;
  color: #6b7280;
}

.btn-remove {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #ef4444;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-remove:hover {
  background: #dc2626;
  transform: scale(1.05);
}

.system-label {
  font-size: 12px;
  color: #667eea;
  font-weight: 500;
  padding: 4px 8px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 4px;
}

.btn-remove:active {
  transform: translateY(0);
}

/* ==================== 小组件相关样式 ==================== */

.widget-add-section {
  margin-bottom: 32px;
}

.widget-add-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.widget-types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.widget-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.widget-type-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.widget-type-icon {
  font-size: 32px;
}

.widget-type-name {
  font-size: 13px;
  font-weight: 500;
}

.widget-list-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.widget-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.widget-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f5f5f7;
  border-radius: 12px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.widget-item:hover {
  background: #ebebed;
  border-color: #667eea;
}

.widget-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.widget-icon {
  font-size: 28px;
}

.widget-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.widget-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.widget-id {
  font-size: 11px;
  color: #999;
  font-family: 'Consolas', 'Monaco', monospace;
}

.widget-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-small {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 24px;
}

.toggle-small input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-small span {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-small span:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-small input:checked + span {
  background-color: #667eea;
}

.toggle-small input:checked + span:before {
  transform: translateX(16px);
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.btn-icon.btn-danger:hover {
  background: rgba(220, 38, 38, 0.1);
}

.no-widgets {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.no-widgets p {
  margin: 8px 0;
}

.no-widgets .hint {
  font-size: 13px;
  opacity: 0.7;
}

/* 小组件设置弹窗 */
.widget-settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #ebebed;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modal-body .setting-item {
  margin-bottom: 20px;
  border: none;
  padding: 0;
}

.modal-body .setting-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.modal-body .setting-item input[type="color"] {
  width: 100%;
  height: 50px;
  border: 1px solid #ebebed;
  border-radius: 8px;
  cursor: pointer;
}

.modal-body .setting-item input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ebebed;
  outline: none;
  -webkit-appearance: none;
}

.modal-body .setting-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.modal-body .setting-item input[type="checkbox"] {
  margin-right: 8px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #ebebed;
  display: flex;
  justify-content: flex-end;
}
</style>

