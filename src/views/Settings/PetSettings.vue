<template>
  <div class="pet-settings-panel">
    <!-- 启用桌面伙伴 -->
    <div class="setting-item">
      <div class="setting-label">
        <h3>显示桌面伙伴</h3>
        <p>在桌面显示 3D 虚拟伙伴（VRM 模型）</p>
      </div>
      <div class="setting-control">
        <input 
          type="checkbox" 
          id="show-pet" 
          v-model="petStore.settings.enabled"
          @change="handlePetToggle"
        />
        <label for="show-pet" class="toggle"></label>
      </div>
    </div>
    
    <!-- VRM 模型选择 -->
    <div class="setting-item">
      <div class="setting-label">
        <h3>VRM 模型</h3>
        <p v-if="!petStore.settings.vrmPath">点击按钮选择 VRM 模型文件</p>
        <p v-else class="selected-file">{{ petStore.settings.vrmPath }}</p>
      </div>
      <div class="setting-control">
        <button 
          class="btn btn-primary" 
          @click="selectVrmModel"
        >
          {{ petStore.settings.vrmPath ? '重新选择' : '选择模型' }}
        </button>
      </div>
    </div>
    
    <!-- 窗口属性 -->
    <div class="setting-section-title">窗口属性</div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>始终置顶</h3>
        <p>桌面伙伴窗口始终保持在最顶层</p>
      </div>
      <div class="setting-control">
        <input 
          type="checkbox" 
          id="pet-always-on-top"
          v-model="petStore.settings.alwaysOnTop"
          @change="handleToggleChange"
        />
        <label for="pet-always-on-top" class="toggle"></label>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>智能穿透</h3>
        <p>背景透明区域可穿透，模型区域可交互（推荐）</p>
      </div>
      <div class="setting-control">
        <input 
          type="checkbox" 
          id="pet-smart-click-through"
          v-model="petStore.settings.smartClickThrough"
          @change="handleSmartClickThroughChange"
        />
        <label for="pet-smart-click-through" class="toggle"></label>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>完全穿透</h3>
        <p>整个窗口完全穿透，无法交互（与智能穿透互斥）</p>
      </div>
      <div class="setting-control">
        <input 
          type="checkbox" 
          id="pet-click-through"
          v-model="petStore.settings.clickThrough"
          @change="handleClickThroughChange"
        />
        <label for="pet-click-through" class="toggle"></label>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>显示在任务栏</h3>
        <p>在任务栏显示桌面伙伴窗口图标</p>
      </div>
      <div class="setting-control">
        <input 
          type="checkbox" 
          id="pet-show-taskbar"
          v-model="petStore.settings.showInTaskbar"
          @change="handleToggleChange"
        />
        <label for="pet-show-taskbar" class="toggle"></label>
      </div>
    </div>
    
    <!-- 窗口大小 -->
    <div class="setting-section-title">窗口大小</div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>大小模式</h3>
        <p>选择自动计算或自定义窗口大小</p>
      </div>
      <div class="setting-control">
        <select 
          v-model="petStore.settings.windowSize.mode"
          @change="handleWindowSizeModeChange"
          class="mode-select"
        >
          <option value="auto">自动（根据模型缩放）</option>
          <option value="custom">自定义大小</option>
        </select>
      </div>
    </div>
    
    <div v-if="petStore.settings.windowSize.mode === 'custom'" class="setting-item">
      <div class="setting-label">
        <h3>窗口宽度</h3>
        <p>自定义窗口宽度（像素，300-2000）</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="300" 
          max="2000" 
          step="10"
          v-model.number="petStore.settings.windowSize.width"
          @input="handleWindowSizeChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.windowSize.width }}px</span>
      </div>
    </div>
    
    <div v-if="petStore.settings.windowSize.mode === 'custom'" class="setting-item">
      <div class="setting-label">
        <h3>窗口高度</h3>
        <p>自定义窗口高度（像素，400-2500）</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="400" 
          max="2500" 
          step="10"
          v-model.number="petStore.settings.windowSize.height"
          @input="handleWindowSizeChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.windowSize.height }}px</span>
      </div>
    </div>
    
    <div v-if="petStore.settings.windowSize.mode === 'auto'" class="setting-hint">
      <div class="hint-icon">💡</div>
      <div class="hint-text">
        自动模式会根据模型缩放自动计算窗口大小。
        当前缩放 {{ Number(petStore.settings.scale).toFixed(1) }}x 时，
        窗口大小约为 {{ getAutoWindowSize().width }}x{{ getAutoWindowSize().height }} 像素。
      </div>
    </div>
    
    <!-- 模型属性 -->
    <div class="setting-section-title">模型属性</div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>模型缩放</h3>
        <p>调整模型显示大小 (0.5-2.0)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0.5" 
          max="2.0" 
          step="0.1"
          v-model.number="petStore.settings.scale"
          @input="handlePetSettingChange"
          class="slider"
        />
        <span class="value-display">{{ Number(petStore.settings.scale).toFixed(1) }}x</span>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>水平位置偏移</h3>
        <p>调整模型左右位置 (-2.0 到 2.0)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="-2.0" 
          max="2.0" 
          step="0.1"
          v-model.number="petStore.settings.modelOffsetX"
          @input="handlePetSettingChange"
          class="slider"
        />
        <span class="value-display">{{ Number(petStore.settings.modelOffsetX).toFixed(1) }}</span>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>垂直位置偏移</h3>
        <p>调整模型上下位置 (-2.0 到 2.0)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="-2.0" 
          max="2.0" 
          step="0.1"
          v-model.number="petStore.settings.modelOffsetY"
          @input="handlePetSettingChange"
          class="slider"
        />
        <span class="value-display">{{ Number(petStore.settings.modelOffsetY).toFixed(1) }}</span>
      </div>
    </div>
    
    <!-- 模型旋转 -->
    <div class="setting-section-title">模型旋转</div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>X轴旋转（俯仰）</h3>
        <p>前后翻转模型 (0° - 360°)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0" 
          max="360" 
          step="5"
          v-model.number="petStore.settings.rotationX"
          @input="handlePetSettingChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.rotationX }}°</span>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>Y轴旋转（偏航）</h3>
        <p>左右转动模型 (0° - 360°)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0" 
          max="360" 
          step="5"
          v-model.number="petStore.settings.rotationY"
          @input="handlePetSettingChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.rotationY }}°</span>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>Z轴旋转（翻滚）</h3>
        <p>左右倾斜模型 (0° - 360°)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0" 
          max="360" 
          step="5"
          v-model.number="petStore.settings.rotationZ"
          @input="handlePetSettingChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.rotationZ }}°</span>
      </div>
    </div>
    
    <!-- 光照设置 -->
    <div class="setting-section-title">光照设置</div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>亮度</h3>
        <p>场景光照亮度 (0.1-2.0)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0.1" 
          max="2.0" 
          step="0.1"
          v-model.number="petStore.settings.lighting.brightness"
          @input="handlePetSettingChange"
          class="slider"
        />
        <span class="value-display">{{ Number(petStore.settings.lighting.brightness).toFixed(1) }}</span>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>环境光颜色</h3>
        <p>场景的环境光照颜色</p>
      </div>
      <div class="setting-control">
        <input 
          type="color" 
          v-model="petStore.settings.lighting.ambientColor"
          @input="handlePetSettingChange"
          class="color-input"
        />
        <span class="value-display">{{ petStore.settings.lighting.ambientColor }}</span>
      </div>
    </div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>平行光颜色</h3>
        <p>场景的平行光照颜色</p>
      </div>
      <div class="setting-control">
        <input 
          type="color" 
          v-model="petStore.settings.lighting.directionalColor"
          @input="handlePetSettingChange"
          class="color-input"
        />
        <span class="value-display">{{ petStore.settings.lighting.directionalColor }}</span>
      </div>
    </div>
    
    <!-- 背景设置 -->
    <div class="setting-section-title">背景设置</div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>背景类型</h3>
        <p>选择窗口背景的显示方式</p>
      </div>
      <div class="setting-control">
        <select 
          v-model="petStore.settings.background.type" 
          @change="handlePetSettingChange"
          class="select-input"
        >
          <option value="transparent">透明背景</option>
          <option value="color">纯色背景</option>
          <option value="image">图片背景</option>
        </select>
      </div>
    </div>
    
    <!-- 透明背景设置 -->
    <div v-if="petStore.settings.background.type === 'transparent'" class="setting-item">
      <div class="setting-label">
        <h3>背景透明度</h3>
        <p>调整背景的透明程度 (0 = 完全透明)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          v-model="petStore.settings.background.opacity"
          @input="handlePetSettingChange"
        />
        <span class="value-display">{{ (petStore.settings.background.opacity * 100).toFixed(0) }}%</span>
      </div>
    </div>
    
    <!-- 纯色背景设置 -->
    <template v-if="petStore.settings.background.type === 'color'">
      <div class="setting-item">
        <div class="setting-label">
          <h3>背景颜色</h3>
          <p>选择纯色背景的颜色</p>
        </div>
        <div class="setting-control">
          <input 
            type="color" 
            v-model="petStore.settings.background.color"
            @input="handlePetSettingChange"
            class="color-input"
          />
          <span class="value-display">{{ petStore.settings.background.color }}</span>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-label">
          <h3>背景不透明度</h3>
          <p>调整纯色背景的不透明度</p>
        </div>
        <div class="setting-control">
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            v-model="petStore.settings.background.opacity"
            @input="handlePetSettingChange"
          />
          <span class="value-display">{{ (petStore.settings.background.opacity * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </template>
    
    <!-- 图片背景设置 -->
    <template v-if="petStore.settings.background.type === 'image'">
      <div class="setting-item">
        <div class="setting-label">
          <h3>背景图片</h3>
          <p v-if="!petStore.settings.background.imagePath">点击按钮选择背景图片</p>
          <p v-else class="selected-file">{{ petStore.settings.background.imagePath }}</p>
        </div>
        <div class="setting-control">
          <button 
            class="btn btn-primary" 
            @click="selectBackgroundImage"
          >
            {{ petStore.settings.background.imagePath ? '重新选择' : '选择图片' }}
          </button>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-label">
          <h3>图片不透明度</h3>
          <p>调整背景图片的不透明度</p>
        </div>
        <div class="setting-control">
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            v-model="petStore.settings.background.imageOpacity"
            @input="handlePetSettingChange"
          />
          <span class="value-display">{{ (petStore.settings.background.imageOpacity * 100).toFixed(0) }}%</span>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-label">
          <h3>图片模糊度</h3>
          <p>调整背景图片的模糊程度</p>
        </div>
        <div class="setting-control">
          <input 
            type="range" 
            min="0" 
            max="20" 
            step="1"
            v-model="petStore.settings.background.imageBlur"
            @input="handlePetSettingChange"
          />
          <span class="value-display">{{ petStore.settings.background.imageBlur }}px</span>
        </div>
      </div>
    </template>
    
    <!-- 动画设置 -->
    <div class="setting-section-title">动画设置</div>
    
    <!-- 表情选择 -->
    <div class="setting-item">
      <div class="setting-label">
        <h3>表情</h3>
        <p>选择模型的面部表情</p>
      </div>
      <div class="setting-control">
        <select 
          v-model="petStore.settings.animationConfig.expression" 
          @change="handleAnimationChange"
          class="select-input"
        >
          <option value="neutral">😐 自然</option>
          <option value="happy">😊 开心</option>
          <option value="angry">😠 生气</option>
          <option value="sad">😢 悲伤</option>
          <option value="surprised">😲 惊讶</option>
          <option value="relaxed">😌 放松</option>
        </select>
      </div>
    </div>
    
    <!-- 表情强度 -->
    <div class="setting-item">
      <div class="setting-label">
        <h3>表情强度</h3>
        <p>调整表情的明显程度 (0-100%)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          v-model.number="petStore.settings.animationConfig.expressionIntensity"
          @input="handleAnimationChange"
          class="slider"
        />
        <span class="value-display">{{ (petStore.settings.animationConfig.expressionIntensity * 100).toFixed(0) }}%</span>
      </div>
    </div>
    
    <!-- 呼吸动画 -->
    <div class="setting-item">
      <div class="setting-label">
        <h3>呼吸动画</h3>
        <p>启用自然的呼吸起伏效果</p>
      </div>
      <div class="setting-control">
        <input 
          type="checkbox" 
          id="pet-breathing-animation"
          v-model="petStore.settings.animationConfig.enableBreathing"
          @change="handleAnimationChange"
        />
        <label for="pet-breathing-animation" class="toggle"></label>
      </div>
    </div>
    
    <!-- 呼吸速度 -->
    <div v-if="petStore.settings.animationConfig.enableBreathing" class="setting-item">
      <div class="setting-label">
        <h3>呼吸速度</h3>
        <p>调整呼吸动画的快慢 (0.5x-2.0x)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0.5" 
          max="2.0" 
          step="0.1"
          v-model.number="petStore.settings.animationConfig.breathingSpeed"
          @input="handleAnimationChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.animationConfig.breathingSpeed.toFixed(1) }}x</span>
      </div>
    </div>
    
    <!-- 眨眼动画 -->
    <div class="setting-item">
      <div class="setting-label">
        <h3>眨眼动画</h3>
        <p>启用自动眨眼效果</p>
      </div>
      <div class="setting-control">
        <input 
          type="checkbox" 
          id="pet-blinking-animation"
          v-model="petStore.settings.animationConfig.enableBlinking"
          @change="handleAnimationChange"
        />
        <label for="pet-blinking-animation" class="toggle"></label>
      </div>
    </div>
    
    <!-- 眨眼间隔 -->
    <div v-if="petStore.settings.animationConfig.enableBlinking" class="setting-item">
      <div class="setting-label">
        <h3>眨眼间隔</h3>
        <p>每次眨眼之间的时间间隔 (1-10秒)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="0.5"
          v-model.number="petStore.settings.animationConfig.blinkInterval"
          @input="handleAnimationChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.animationConfig.blinkInterval.toFixed(1) }}秒</span>
      </div>
    </div>
    
    <!-- 自定义动画 -->
    <div class="setting-section-title">自定义动画</div>
    
    <div class="setting-item">
      <div class="setting-label">
        <h3>导入动画文件</h3>
        <p>支持 VRMA、GLTF、GLB 格式的动画文件</p>
      </div>
      <div class="setting-control">
        <button 
          class="btn btn-primary" 
          @click="selectAnimationFile"
        >
          选择动画
        </button>
      </div>
    </div>
    
    <!-- 动画格式说明 -->
    <div class="animation-format-hint">
      <div class="hint-icon">💡</div>
      <div class="hint-content">
        <div class="hint-title">支持的动画格式</div>
        <div class="hint-text">
          <strong>直接支持：</strong><br>
          • <strong>VRMA</strong> - VRM Animation 官方格式（最佳兼容性）⭐<br>
          • <strong>GLTF/GLB</strong> - 通用 GLTF 动画（需骨骼匹配）<br>
          <br>
          <strong>需要转换：</strong><br>
          • <strong>VMD</strong> - MMD 动画格式（需用 Blender 转换为 VRMA）<br>
          • <strong>FBX/BVH</strong> - 其他格式（需转换为 GLTF）<br>
          <br>
          <strong>如何获取动画：</strong><br>
          1️⃣ VRoid Hub - VRMA 动画（官方，推荐）<br>
          2️⃣ Mixamo - GLTF 动画（免费角色动画库）<br>
          3️⃣ Blender - 自制动画并导出 VRMA<br>
          <br>
          <strong>VMD 转换方法：</strong><br>
          Blender + Cats 插件 → 导入 VMD → 导出 VRMA<br>
          详见：《VMD动画使用指南.md》<br>
        </div>
      </div>
    </div>
    
    <!-- 动画列表 -->
    <div v-if="petStore.settings.animationConfig.customAnimations.length > 0" class="animation-list">
      <div 
        v-for="animation in petStore.settings.animationConfig.customAnimations" 
        :key="animation.id"
        class="animation-item"
        :class="{ active: petStore.settings.animationConfig.currentAnimation === animation.id }"
      >
        <div class="animation-info">
          <div class="animation-name">{{ animation.name }}</div>
          <div class="animation-path">{{ getFileName(animation.filePath) }}</div>
        </div>
        <div class="animation-actions">
          <button 
            class="btn-icon" 
            @click="playAnimation(animation.id)"
            :title="petStore.settings.animationConfig.currentAnimation === animation.id ? '停止' : '播放'"
          >
            {{ petStore.settings.animationConfig.currentAnimation === animation.id ? '⏸' : '▶' }}
          </button>
          <button 
            class="btn-icon" 
            @click="removeAnimation(animation.id)"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
    
    <!-- 动画播放控制 -->
    <div v-if="petStore.settings.animationConfig.currentAnimation" class="setting-item">
      <div class="setting-label">
        <h3>动画播放速度</h3>
        <p>调整当前动画的播放速度 (0.5x-2.0x)</p>
      </div>
      <div class="setting-control">
        <input 
          type="range" 
          min="0.5" 
          max="2.0" 
          step="0.1"
          v-model.number="petStore.settings.animationConfig.animationSpeed"
          @input="handleAnimationSpeedChange"
          class="slider"
        />
        <span class="value-display">{{ petStore.settings.animationConfig.animationSpeed.toFixed(1) }}x</span>
      </div>
    </div>
    
    <!-- 使用说明 -->
    <div class="setting-section-title">使用说明</div>
    <div class="pet-tips">
      <div class="tip-item">
        <span class="tip-icon">📁</span>
        <span class="tip-text">VRM 模型可以从 <a href="https://hub.vroid.com/" target="_blank">VRoid Hub</a> 下载</span>
      </div>
      <div class="tip-item">
        <span class="tip-icon">🖱️</span>
        <span class="tip-text">左键拖动桌面伙伴可以移动位置</span>
      </div>
      <div class="tip-item">
        <span class="tip-icon">🖱️</span>
        <span class="tip-text">右键桌面伙伴可以打开菜单</span>
      </div>
      <div class="tip-item">
        <span class="tip-icon">💡</span>
        <span class="tip-text">开启点击穿透后可以点击桌面伙伴下方的内容</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { usePetStore } from '@/stores/petStore';
import { open } from '@tauri-apps/api/dialog';

const petStore = usePetStore();

// 监听跨窗口数据同步
let storageListener: ((event: StorageEvent) => void) | null = null;

onMounted(() => {
  console.log('设置页面已挂载，开始监听跨窗口数据同步');
  
  // 监听 localStorage 变化（当桌面伙伴窗口修改设置时同步到主窗口）
  storageListener = (event: StorageEvent) => {
    if (event.key === 'aurora-pet-settings' && event.newValue) {
      console.log('🔄 检测到其他窗口修改了设置，重新加载');
      petStore.loadSettings();
    }
  };
  
  window.addEventListener('storage', storageListener);
});

onUnmounted(() => {
  console.log('设置页面已卸载，移除监听器');
  if (storageListener) {
    window.removeEventListener('storage', storageListener);
  }
});

// 切换桌面伙伴
async function handlePetToggle() {
  try {
    if (!petStore.settings.vrmPath && petStore.settings.enabled) {
      alert('请先选择 VRM 模型文件');
      petStore.settings.enabled = false;
      return;
    }
    
    await petStore.toggle(petStore.settings.enabled);
  } catch (error) {
    console.error('切换桌面伙伴失败:', error);
    alert('切换桌面伙伴失败: ' + error);
    petStore.settings.enabled = false;
  }
}

// 选择VRM模型
async function selectVrmModel() {
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: 'VRM 模型', extensions: ['vrm'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (selected && typeof selected === 'string') {
      console.log('选择的VRM模型:', selected);
      await petStore.setVrmModel(selected);
      
      // 如果桌面伙伴已启用，重新加载模型
      if (petStore.settings.enabled) {
        console.log('📢 通知桌面伙伴窗口更新模型');
      }
    }
  } catch (error) {
    console.error('选择VRM模型失败:', error);
    alert('选择模型失败: ' + error);
  }
}

// 选择背景图片
async function selectBackgroundImage() {
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (selected && typeof selected === 'string') {
      console.log('选择的背景图片:', selected);
      petStore.settings.background.imagePath = selected;
      await petStore.updateSettings(petStore.settings);
    }
  } catch (error) {
    console.error('选择背景图片失败:', error);
    alert('选择图片失败: ' + error);
  }
}

// 防抖定时器
let debounceTimer: number | null = null;

// 处理设置变化（带防抖，用于滑块等频繁触发的控件）
async function handlePetSettingChange() {
  try {
    // 清除之前的定时器
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    
    // 设置新的定时器，100ms 后执行更新
    debounceTimer = window.setTimeout(async () => {
      try {
        await petStore.updateSettings(petStore.settings);
        console.log('⚡ 桌面伙伴设置已更新');
      } catch (error) {
        console.error('更新桌面伙伴设置失败:', error);
      }
      debounceTimer = null;
    }, 100);
  } catch (error) {
    console.error('处理设置变化失败:', error);
  }
}

// 处理智能穿透开关变化
async function handleSmartClickThroughChange() {
  try {
    // 如果启用了智能穿透，自动禁用完全穿透
    if (petStore.settings.smartClickThrough) {
      petStore.settings.clickThrough = false;
      console.log('✓ 已启用智能穿透，自动关闭完全穿透');
    }
    
    await petStore.updateSettings(petStore.settings);
    console.log('⚡ 智能穿透设置已更新');
  } catch (error) {
    console.error('更新智能穿透设置失败:', error);
  }
}

// 处理完全穿透开关变化
async function handleClickThroughChange() {
  try {
    // 如果启用了完全穿透，自动禁用智能穿透
    if (petStore.settings.clickThrough) {
      petStore.settings.smartClickThrough = false;
      console.log('✓ 已启用完全穿透，自动关闭智能穿透');
    }
    
    await petStore.updateSettings(petStore.settings);
    console.log('⚡ 完全穿透设置已更新');
  } catch (error) {
    console.error('更新完全穿透设置失败:', error);
  }
}

// 处理窗口大小模式变化
async function handleWindowSizeModeChange() {
  try {
    await petStore.updateSettings({ windowSize: petStore.settings.windowSize });
    console.log('⚡ 窗口大小模式已更新:', petStore.settings.windowSize.mode);
  } catch (error) {
    console.error('更新窗口大小模式失败:', error);
  }
}

// 处理窗口大小变化（带防抖）
async function handleWindowSizeChange() {
  try {
    // 清除之前的定时器
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    
    // 设置新的定时器，100ms 后执行更新
    debounceTimer = window.setTimeout(async () => {
      try {
        await petStore.updateSettings({ windowSize: petStore.settings.windowSize });
        console.log('⚡ 窗口大小已更新:', petStore.settings.windowSize);
      } catch (error) {
        console.error('更新窗口大小失败:', error);
      }
      debounceTimer = null;
    }, 100);
  } catch (error) {
    console.error('处理窗口大小变化失败:', error);
  }
}

// 计算自动窗口大小（用于UI显示）
function getAutoWindowSize(): { width: number; height: number } {
  const scale = petStore.settings.scale;
  
  // 基础尺寸
  const baseWidth = 500;
  const baseHeight = 650;
  
  // 根据缩放调整窗口大小
  let width: number;
  let height: number;
  
  if (scale <= 1.0) {
    width = Math.max(350, baseWidth * (0.7 + scale * 0.3));
    height = Math.max(450, baseHeight * (0.7 + scale * 0.3));
  } else {
    width = baseWidth * (0.8 + scale * 0.5);
    height = baseHeight * (0.8 + scale * 0.5);
  }
  
  // 限制最大尺寸
  const maxWidth = window.screen.width * 0.8;
  const maxHeight = window.screen.height * 0.8;
  width = Math.min(width, maxWidth);
  height = Math.min(height, maxHeight);
  
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

// 处理开关变化（立即执行，用于其他开关按钮）
async function handleToggleChange() {
  try {
    await petStore.updateSettings(petStore.settings);
    console.log('⚡ 桌面伙伴开关设置已立即更新');
  } catch (error) {
    console.error('更新桌面伙伴开关设置失败:', error);
  }
}

// ========== 动画相关函数 ==========

// 处理动画设置变化
async function handleAnimationChange() {
  try {
    // 清除之前的定时器
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    
    // 设置新的定时器，100ms 后执行更新
    debounceTimer = window.setTimeout(async () => {
      try {
        await petStore.updateSettings({
          animationConfig: petStore.settings.animationConfig
        });
        console.log('⚡ 动画设置已更新');
      } catch (error) {
        console.error('更新动画设置失败:', error);
      }
      debounceTimer = null;
    }, 100);
  } catch (error) {
    console.error('处理动画设置变化失败:', error);
  }
}

// 处理动画速度变化（立即生效）
async function handleAnimationSpeedChange() {
  try {
    await petStore.updateSettings({
      animationConfig: {
        ...petStore.settings.animationConfig,
        animationSpeed: petStore.settings.animationConfig.animationSpeed
      }
    });
    console.log('⚡ 动画速度已更新');
  } catch (error) {
    console.error('更新动画速度失败:', error);
  }
}

// 选择动画文件
async function selectAnimationFile() {
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: 'VRM Animation', extensions: ['vrma'] },
        { name: 'GLTF Animation', extensions: ['gltf', 'glb'] },
        { name: '所有支持的格式', extensions: ['vrma', 'gltf', 'glb'] },
        { name: 'MMD Animation (需转换)', extensions: ['vmd'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (selected && typeof selected === 'string') {
      console.log('选择的动画文件:', selected);
      
      // 获取文件名和扩展名
      const fileName = selected.split(/[/\\]/).pop() || '未命名动画';
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      
      // VMD 格式特殊处理
      if (fileExt === 'vmd') {
        alert(`VMD 格式需要转换后才能使用\n\n` +
          `VMD 是 MikuMikuDance 的动画格式，骨骼结构与 VRM 不同。\n\n` +
          `📝 推荐转换方法：\n\n` +
          `1️⃣ 使用 Blender + Cats 插件\n` +
          `   • 安装 Blender: https://www.blender.org/\n` +
          `   • 安装 Cats 插件\n` +
          `   • 导入 VRM 模型和 VMD 动画\n` +
          `   • 导出为 VRMA 或 GLB 格式\n\n` +
          `2️⃣ 或直接使用 VRMA 格式动画\n` +
          `   • VRoid Hub: https://hub.vroid.com/\n` +
          `   • 无需转换，100% 兼容\n\n` +
          `详细教程请查看：《VMD动画使用指南.md》`);
        return;
      }
      
      // 检查文件格式
      if (fileExt !== 'vrma' && fileExt !== 'gltf' && fileExt !== 'glb') {
        alert(`不支持的文件格式: .${fileExt}\n\n支持的格式：\n• VRMA - VRM Animation 官方格式（推荐）\n• GLTF/GLB - 通用 GLTF 动画格式\n\n如果你有其他格式的动画（FBX、BVH），请使用 Blender 等工具转换为 VRMA 或 GLTF 格式。`);
        return;
      }
      
      // 生成唯一ID
      const animationId = Date.now().toString();
      
      // 确定动画类型
      let animationType: 'vrma' | 'vmd' | 'gltf' | 'glb' = 'gltf';
      if (fileExt === 'vrma') {
        animationType = 'vrma';
        console.log('🎯 检测到 VRMA 格式（VRM Animation 官方格式）');
      } else if (fileExt === 'glb') {
        animationType = 'glb';
      }
      
      // 添加到自定义动画列表
      petStore.settings.animationConfig.customAnimations.push({
        id: animationId,
        name: fileName.replace(/\.[^/.]+$/, ''), // 移除扩展名
        filePath: selected,
        type: animationType,
        loop: true,
        createdAt: Date.now(),
      });
      
      await petStore.updateSettings({
        animationConfig: petStore.settings.animationConfig
      });
      
      console.log('✅ 动画已添加到列表');
    }
  } catch (error) {
    console.error('选择动画文件失败:', error);
    alert('选择动画文件失败: ' + error);
  }
}

// 播放/停止动画
async function playAnimation(animationId: string) {
  try {
    if (petStore.settings.animationConfig.currentAnimation === animationId) {
      // 停止当前动画
      petStore.settings.animationConfig.currentAnimation = null;
      console.log('⏹️ 停止动画');
    } else {
      // 播放新动画
      petStore.settings.animationConfig.currentAnimation = animationId;
      console.log('▶️ 播放动画:', animationId);
    }
    
    await petStore.updateSettings({
      animationConfig: petStore.settings.animationConfig
    });
  } catch (error) {
    console.error('播放/停止动画失败:', error);
    alert('操作失败: ' + error);
  }
}

// 删除动画
async function removeAnimation(animationId: string) {
  try {
    if (!confirm('确定要删除这个动画吗？')) {
      return;
    }
    
    // 从列表中移除
    petStore.settings.animationConfig.customAnimations = 
      petStore.settings.animationConfig.customAnimations.filter(
        anim => anim.id !== animationId
      );
    
    // 如果正在播放这个动画，停止播放
    if (petStore.settings.animationConfig.currentAnimation === animationId) {
      petStore.settings.animationConfig.currentAnimation = null;
    }
    
    await petStore.updateSettings({
      animationConfig: petStore.settings.animationConfig
    });
    
    console.log('🗑️ 动画已删除');
  } catch (error) {
    console.error('删除动画失败:', error);
    alert('删除失败: ' + error);
  }
}

// 获取文件名（从完整路径提取）
function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}
</script>

<style scoped>
.pet-settings-panel {
  /* 继承父级样式 */
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

.selected-file {
  color: #667eea !important;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px !important;
  word-break: break-all;
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

.mode-select {
  width: 220px;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.mode-select:hover {
  border-color: #667eea;
}

.mode-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

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

.select-input {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  min-width: 150px;
}

.select-input:hover {
  border-color: #667eea;
}

.select-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.value-display {
  font-size: 14px;
  font-weight: 500;
  color: #667eea;
  min-width: 60px;
  text-align: right;
}

.pet-tips {
  background: #f5f5f7;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.tip-text {
  font-size: 14px;
  color: #1d1d1f;
  line-height: 1.6;
}

.tip-text a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.tip-text a:hover {
  text-decoration: underline;
}

/* 动画列表样式 */
.animation-list {
  margin-top: 16px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  overflow: hidden;
}

.animation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e7;
  transition: background-color 0.2s ease;
}

.animation-item:last-child {
  border-bottom: none;
}

.animation-item:hover {
  background-color: #f5f5f7;
}

.animation-item.active {
  background-color: rgba(102, 126, 234, 0.1);
  border-left: 3px solid #667eea;
}

.animation-info {
  flex: 1;
  min-width: 0;
}

.animation-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.animation-path {
  font-size: 12px;
  color: #6e6e73;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.animation-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.btn-icon:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-icon:active {
  transform: scale(0.95);
}

/* 动画格式说明 */
.animation-format-hint {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.hint-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.hint-content {
  flex: 1;
}

.hint-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.hint-text {
  font-size: 13px;
  color: #4a4a4a;
  line-height: 1.6;
}

.hint-text strong {
  color: #667eea;
  font-weight: 600;
}
</style>

