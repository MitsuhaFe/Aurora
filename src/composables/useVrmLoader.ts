import { ref, shallowRef } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, VRMAnimation, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';

export function useVrmLoader(container: HTMLElement | null) {
  // 使用 shallowRef 避免 Three.js 对象被深度代理
  const scene = shallowRef<THREE.Scene | null>(null);
  const camera = shallowRef<THREE.PerspectiveCamera | null>(null);
  const renderer = shallowRef<THREE.WebGLRenderer | null>(null);
  const vrm = shallowRef<VRM | null>(null);
  
  // 简单状态可以使用普通 ref
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const clock = new THREE.Clock();
  let animationId: number | null = null;
  
  // 动画相关
  let mixer: THREE.AnimationMixer | null = null;
  let currentAction: THREE.AnimationAction | null = null;
  let breathingEnabled = false;
  let breathingSpeed = 1.0;
  let blinkingEnabled = false;
  let blinkInterval = 3.0;
  let lastBlinkTime = 0;
  let currentExpression = 'neutral';
  let expressionIntensity = 0.8;

  // 初始化Three.js场景
  function initScene() {
    if (!container) return;

    console.log('🎬 初始化Three.js场景...');

    // 创建场景
    scene.value = new THREE.Scene();
    scene.value.background = null; // 透明背景

    // 创建相机
    camera.value = new THREE.PerspectiveCamera(
      35, // 增加视野角度，使模型显示更完整
      container.clientWidth / container.clientHeight,
      0.1,
      20
    );
    camera.value.position.set(0, 1.2, 3.0); // 相机后退一点，确保模型完整显示
    camera.value.lookAt(0, 1.0, 0);

    // 创建渲染器
    renderer.value = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.value.setSize(container.clientWidth, container.clientHeight);
    renderer.value.setPixelRatio(window.devicePixelRatio);
    renderer.value.outputColorSpace = THREE.SRGBColorSpace;
    
    // 设置完全透明的背景（重要：alpha设为0）
    renderer.value.setClearColor(0x000000, 0);
    
    container.appendChild(renderer.value.domElement);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.value.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1);
    scene.value.add(directionalLight);

    // 开始渲染循环
    animate();

    console.log('✅ Three.js场景初始化完成');
  }

  // 加载VRM模型
  async function loadVrm(url: string) {
    if (!scene.value || !renderer.value) {
      console.error('❌ 场景未初始化');
      error.value = '3D场景未正确初始化';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      console.log('📦 开始加载VRM模型...');
      console.log('🔗 文件URL:', url);

      // 如果已有模型，先移除
      if (vrm.value) {
        console.log('🧹 清理旧模型...');
        scene.value.remove(vrm.value.scene);
        VRMUtils.deepDispose(vrm.value.scene);
        vrm.value = null;
      }

      // 创建加载器
      console.log('⚙️ 初始化GLTFLoader...');
      const loader = new GLTFLoader();
      
      // 注册VRM插件
      loader.register((parser) => {
        console.log('🔌 注册VRMLoaderPlugin...');
        return new VRMLoaderPlugin(parser);
      });

      // 添加加载进度监听
      console.log('⏳ 开始下载模型...');
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            console.log('✅ 模型下载完成');
            resolve(gltf);
          },
          (progress) => {
            if (progress.lengthComputable) {
              const percentComplete = (progress.loaded / progress.total) * 100;
              console.log(`📥 加载进度: ${percentComplete.toFixed(2)}%`);
            }
          },
          (err) => {
            console.error('❌ 加载失败:', err);
            reject(err);
          }
        );
      });

      console.log('🔍 解析VRM数据...');
      const loadedVrm = gltf.userData.vrm as VRM;

      if (!loadedVrm) {
        throw new Error('文件不包含有效的VRM数据。请确保选择的是VRM格式文件（.vrm）');
      }

      console.log('✅ VRM数据解析成功');
      console.log('📊 模型信息:', {
        version: loadedVrm.meta?.metaVersion || '未知版本',
        name: loadedVrm.meta?.name || '未命名',
        author: loadedVrm.meta?.author || '未知作者',
      });

      vrm.value = loadedVrm;

      // 设置模型位置和旋转
      vrm.value.scene.position.set(0, 0, 0);
      // 围绕Y轴旋转180度，让模型面向相机
      vrm.value.scene.rotation.set(0, Math.PI, 0);
      
      // 添加到场景
      scene.value.add(vrm.value.scene);
      console.log('✅ 模型已添加到场景');

      // 优化模型渲染
      let meshCount = 0;
      vrm.value.scene.traverse((obj) => {
        if ((obj as any).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          meshCount++;
        }
      });

      console.log(`✅ VRM模型加载完成 (${meshCount} 个网格)`);
      console.log('📊 Humanoid骨骼:', loadedVrm.humanoid ? '✓' : '✗');
      console.log('📊 表情管理器:', loadedVrm.expressionManager ? '✓' : '✗');

      isLoading.value = false;
    } catch (err: any) {
      console.error('❌ 加载VRM模型失败:', err);
      
      // 提供更详细的错误信息
      let errorMessage = '加载失败';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.toString().includes('404')) {
        errorMessage = '文件不存在或无法访问';
      } else if (err.toString().includes('CORS')) {
        errorMessage = '文件访问权限错误';
      } else if (err.toString().includes('NetworkError')) {
        errorMessage = '网络错误，请检查文件路径';
      }
      
      error.value = errorMessage;
      isLoading.value = false;
      throw new Error(errorMessage);
    }
  }

  // 更新动画
  function updateAnimation() {
    if (!vrm.value) return;

    const deltaTime = clock.getDelta();
    
    // 更新VRM
    vrm.value.update(deltaTime);
    
    // 更新动画混合器
    if (mixer) {
      mixer.update(deltaTime);
    }

    const time = clock.getElapsedTime();
    
    // 呼吸动画
    if (breathingEnabled && vrm.value.humanoid) {
      const chest = vrm.value.humanoid.getNormalizedBoneNode('chest');
      if (chest) {
        const breathScale = 1 + Math.sin(time * breathingSpeed * 2) * 0.015;
        chest.scale.y = breathScale;
      }
    }
    
    // 眨眼动画
    if (blinkingEnabled && vrm.value.expressionManager) {
      if (time - lastBlinkTime > blinkInterval) {
        // 眨眼持续0.15秒
        const blinkProgress = (time - lastBlinkTime - blinkInterval) / 0.15;
        if (blinkProgress < 1) {
          const blinkValue = Math.sin(blinkProgress * Math.PI);
          vrm.value.expressionManager.setValue('blink', blinkValue);
        } else {
          vrm.value.expressionManager.setValue('blink', 0);
          lastBlinkTime = time;
        }
      }
    }
  }

  // 动画循环
  function animate() {
    animationId = requestAnimationFrame(animate);

    updateAnimation();

    if (renderer.value && scene.value && camera.value) {
      renderer.value.render(scene.value, camera.value);
    }
  }

  // 设置模型缩放
  function setScale(scale: number) {
    if (vrm.value) {
      vrm.value.scene.scale.setScalar(scale);
    }
  }

  // 设置模型位置偏移
  function setPosition(offsetX: number, offsetY: number) {
    if (vrm.value) {
      vrm.value.scene.position.set(offsetX, offsetY, 0);
      console.log('✓ 已设置模型位置偏移:', { x: offsetX, y: offsetY });
    }
  }

  // 设置模型旋转（输入角度，自动转换为弧度）
  function setRotation(rotationX: number, rotationY: number, rotationZ: number) {
    if (vrm.value) {
      // 将角度转换为弧度（Three.js 使用弧度）
      const radX = (rotationX * Math.PI) / 180;
      const radY = (rotationY * Math.PI) / 180;
      const radZ = (rotationZ * Math.PI) / 180;
      
      // Y轴旋转需要在180度基础上叠加（让模型面向相机）
      vrm.value.scene.rotation.set(radX, Math.PI + radY, radZ);
      console.log('✓ 已设置模型旋转:', { 
        x: rotationX + '°', 
        y: rotationY + '°（基础180° + 用户设置）', 
        z: rotationZ + '°' 
      });
    }
  }

  // 设置光照
  function setLighting(brightness: number, ambientColor: string, directionalColor: string) {
    if (!scene.value) return;

    const lights = scene.value.children.filter(
      (child) => child instanceof THREE.Light
    ) as THREE.Light[];

    lights.forEach((light) => {
      if (light instanceof THREE.AmbientLight) {
        light.color.set(ambientColor);
        light.intensity = 0.8 * brightness;
      } else if (light instanceof THREE.DirectionalLight) {
        light.color.set(directionalColor);
        light.intensity = 0.6 * brightness;
      }
    });
  }

  // ========== 动画相关函数 ==========
  
  // 设置呼吸动画
  function setBreathing(enabled: boolean, speed: number = 1.0) {
    breathingEnabled = enabled;
    breathingSpeed = speed;
    console.log('✓ 呼吸动画:', enabled ? `已启用 (速度: ${speed}x)` : '已禁用');
  }
  
  // 设置眨眼动画
  function setBlinking(enabled: boolean, interval: number = 3.0) {
    blinkingEnabled = enabled;
    blinkInterval = interval;
    lastBlinkTime = clock.getElapsedTime();
    console.log('✓ 眨眼动画:', enabled ? `已启用 (间隔: ${interval}秒)` : '已禁用');
  }
  
  // 播放表情
  function playExpression(expression: string, intensity: number = 0.8) {
    if (!vrm.value?.expressionManager) {
      console.warn('⚠️ 模型不支持表情系统');
      return;
    }
    
    const expressionManager = vrm.value.expressionManager;
    
    // 重置所有表情
    const expressions = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'relaxed', 'aa', 'ih', 'ou', 'ee', 'oh'];
    expressions.forEach(expr => {
      expressionManager.setValue(expr, 0);
    });
    
    // 设置新表情
    if (expressions.includes(expression)) {
      expressionManager.setValue(expression, intensity);
      currentExpression = expression;
      expressionIntensity = intensity;
      console.log(`✓ 已切换表情: ${expression} (强度: ${(intensity * 100).toFixed(0)}%)`);
    } else {
      console.warn(`⚠️ 不支持的表情: ${expression}`);
    }
  }
  
  // 加载自定义动画（GLTF/GLB格式的VRM Animation）
  async function loadCustomAnimation(filePath: string, loop: boolean = true, speed: number = 1.0) {
    if (!vrm.value) {
      console.error('❌ 模型未加载');
      return false;
    }
    
    try {
      console.log('📦 开始加载自定义动画:', filePath);
      
      // 检查文件扩展名
      const ext = filePath.toLowerCase().split('.').pop();
      
      // 支持 VRMA、GLTF、GLB、VMD
      if (ext !== 'vrma' && ext !== 'gltf' && ext !== 'glb' && ext !== 'vmd') {
        const errorMsg = `不支持的动画格式: .${ext}\n\n支持的格式：\n• VRMA - VRM Animation 官方格式（推荐）\n• VMD - MikuMikuDance 动画格式\n• GLTF/GLB - 通用 GLTF 动画格式\n\n如何获取：\n1. 从 VRoid Hub 下载 VRMA 动画文件\n2. 从 BowlRoll 等 MMD 站点下载 VMD 文件\n3. 使用 Blender + VRM 插件导出 VRMA\n4. 使用 Mixamo 后转换为 GLTF/GLB\n\n推荐工具：\n- Blender (免费): https://www.blender.org/\n- VRM Add-on for Blender: https://github.com/saturday06/VRM-Addon-for-Blender`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      // 格式特殊提示
      if (ext === 'vrma') {
        console.log('🎯 检测到 VRMA 格式（VRM Animation 官方格式）');
      } else if (ext === 'vmd') {
        console.log('🎵 检测到 VMD 格式（MikuMikuDance 动画）');
      }
      
      let clip: THREE.AnimationClip;
      
      // VMD 格式需要特殊处理
      if (ext === 'vmd') {
        console.log('📦 开始加载 VMD 动画...');
        clip = await loadVMDAnimation(filePath);
      } 
      // VRMA/GLTF/GLB 格式使用 GLTF 加载器
      else {
        // 使用readBinaryFile读取文件
        const { readBinaryFile } = await import('@tauri-apps/api/fs');
        const fileData = await readBinaryFile(filePath);
        // 将 Uint8Array 转换为 ArrayBuffer
        const arrayBuffer = fileData.buffer.slice(0);
        const blob = new Blob([arrayBuffer]);
        const url = URL.createObjectURL(blob);
        
        // 创建加载器
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
        
        // 加载动画
        const gltf = await loader.loadAsync(url);
        URL.revokeObjectURL(url);
        
        // 优先使用VRM动画数据
        if (gltf.userData?.vrmAnimations && gltf.userData.vrmAnimations.length > 0) {
          console.log('✅ 检测到VRM Animation格式');
          const vrmAnimation = gltf.userData.vrmAnimations[0] as VRMAnimation;
          clip = createVRMAnimationClip(vrmAnimation, vrm.value);
        }
        // 回退：尝试使用普通GLTF动画
        else if (gltf.animations && gltf.animations.length > 0) {
          console.warn('⚠️ 检测到普通GLTF动画，尝试应用到VRM模型...');
          clip = gltf.animations[0];
          
          // 检查动画是否与模型兼容
          if (!clip.tracks || clip.tracks.length === 0) {
            throw new Error('动画文件中没有有效的动画轨道。');
          }
          
          console.log('💡 正在使用普通GLTF动画（可能需要骨骼名称匹配）');
        }
        // 没有找到任何动画
        else {
          console.warn('⚠️ 文件中未找到任何动画数据');
          throw new Error('文件中未找到动画数据，请确认文件是否正确。\n\n支持的动画类型：\n1. VRM Animation（推荐）\n2. 标准GLTF动画');
        }
      }
      
      // 停止当前动画
      if (currentAction) {
        currentAction.stop();
      }
      
      // 创建或重用混合器
      if (!mixer) {
        mixer = new THREE.AnimationMixer(vrm.value.scene);
      }
      
      // 播放新动画
      currentAction = mixer.clipAction(clip);
      currentAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
      currentAction.timeScale = speed;
      currentAction.play();
      
      console.log('✅ 自定义动画加载成功:', {
        名称: clip.name || '未命名',
        duration: clip.duration.toFixed(2) + '秒',
        轨道数: clip.tracks.length,
        loop: loop,
        speed: speed + 'x',
      });
      
      return true;
    } catch (error: any) {
      console.error('❌ 加载自定义动画失败:', error);
      // 返回详细的错误信息
      if (error.message) {
        throw error; // 保留原始错误信息
      }
      return false;
    }
  }
  
  // 停止当前动画
  function stopAnimation() {
    if (currentAction) {
      currentAction.stop();
      currentAction = null;
      console.log('⏹️ 已停止当前动画');
    }
  }
  
  // 设置动画速度
  function setAnimationSpeed(speed: number) {
    if (currentAction) {
      currentAction.timeScale = speed;
      console.log('✓ 动画速度已设置为:', speed + 'x');
    }
  }
  
  // 获取可用的表情列表
  function getAvailableExpressions(): string[] {
    if (!vrm.value?.expressionManager) {
      return [];
    }
    
    const expressions: string[] = [];
    const expressionManager = vrm.value.expressionManager;
    
    // VRM标准表情
    const standardExpressions = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'relaxed'];
    
    standardExpressions.forEach(expr => {
      // 检查表情是否存在（尝试设置值，如果不报错说明存在）
      try {
        expressionManager.getValue(expr);
        expressions.push(expr);
      } catch (e) {
        // 表情不存在
      }
    });
    
    return expressions;
  }
  
  // ========== VMD 动画加载 ==========
  
  // MMD 骨骼名称到 VRM 骨骼名称的映射
  const MMD_TO_VRM_BONE_MAP: Record<string, string> = {
    // 身体核心
    '全ての親': 'hips',
    'センター': 'hips',
    '上半身': 'spine',
    '上半身2': 'chest',
    '下半身': 'hips',
    '腰': 'hips',
    
    // 头部
    '首': 'neck',
    '頭': 'head',
    
    // 左臂
    '左肩': 'leftShoulder',
    '左腕': 'leftUpperArm',
    '左ひじ': 'leftLowerArm',
    '左手首': 'leftHand',
    
    // 右臂
    '右肩': 'rightShoulder',
    '右腕': 'rightUpperArm',
    '右ひじ': 'rightLowerArm',
    '右手首': 'rightHand',
    
    // 左腿
    '左足': 'leftUpperLeg',
    '左ひざ': 'leftLowerLeg',
    '左足首': 'leftFoot',
    
    // 右腿
    '右足': 'rightUpperLeg',
    '右ひざ': 'rightLowerLeg',
    '右足首': 'rightFoot',
    
    // 手指（左手）
    '左親指０': 'leftThumbProximal',
    '左親指１': 'leftThumbIntermediate',
    '左親指２': 'leftThumbDistal',
    '左人指１': 'leftIndexProximal',
    '左人指２': 'leftIndexIntermediate',
    '左人指３': 'leftIndexDistal',
    '左中指１': 'leftMiddleProximal',
    '左中指２': 'leftMiddleIntermediate',
    '左中指３': 'leftMiddleDistal',
    '左薬指１': 'leftRingProximal',
    '左薬指２': 'leftRingIntermediate',
    '左薬指３': 'leftRingDistal',
    '左小指１': 'leftLittleProximal',
    '左小指２': 'leftLittleIntermediate',
    '左小指３': 'leftLittleDistal',
    
    // 手指（右手）
    '右親指０': 'rightThumbProximal',
    '右親指１': 'rightThumbIntermediate',
    '右親指２': 'rightThumbDistal',
    '右人指１': 'rightIndexProximal',
    '右人指２': 'rightIndexIntermediate',
    '右人指３': 'rightIndexDistal',
    '右中指１': 'rightMiddleProximal',
    '右中指２': 'rightMiddleIntermediate',
    '右中指３': 'rightMiddleDistal',
    '右薬指１': 'rightRingProximal',
    '右薬指２': 'rightRingIntermediate',
    '右薬指３': 'rightRingDistal',
    '右小指１': 'rightLittleProximal',
    '右小指２': 'rightLittleIntermediate',
    '右小指３': 'rightLittleDistal',
  };
  
  // 加载 VMD 动画
  async function loadVMDAnimation(filePath: string): Promise<THREE.AnimationClip> {
    if (!vrm.value) {
      throw new Error('VRM 模型未加载');
    }
    
    try {
      // 读取 VMD 文件
      const { readBinaryFile } = await import('@tauri-apps/api/fs');
      const fileData = await readBinaryFile(filePath);
      const arrayBuffer = fileData.buffer as ArrayBuffer;
      const blob = new Blob([arrayBuffer]);
      const url = URL.createObjectURL(blob);
      
      // 使用 MMDLoader 加载 VMD
      const mmdLoader = new MMDLoader();
      
      // 加载 VMD 动画数据
      const vmd = await new Promise<any>((resolve, reject) => {
        mmdLoader.loadAnimation(url, null as any, (animation) => {
          resolve(animation);
        }, undefined, reject);
      });
      
      URL.revokeObjectURL(url);
      
      console.log('✅ VMD 文件加载成功');
      
      // 转换 MMD 动画到 Three.js AnimationClip
      const clip = convertMMDToVRM(vmd);
      
      return clip;
    } catch (error) {
      console.error('❌ 加载 VMD 动画失败:', error);
      throw new Error('VMD 文件加载失败，请确认文件格式正确。\n\n提示：\n• 确保 VMD 文件未损坏\n• 某些复杂的 MMD 动画可能不完全兼容\n• 建议使用 Blender 转换为 VRMA 格式以获得最佳兼容性');
    }
  }
  
  // 将 MMD 动画转换为 VRM 兼容的 AnimationClip
  function convertMMDToVRM(mmdAnimation: any): THREE.AnimationClip {
    if (!vrm.value) {
      throw new Error('VRM 模型未加载');
    }
    
    const tracks: THREE.KeyframeTrack[] = [];
    const humanoid = vrm.value.humanoid;
    
    // 处理骨骼动画
    if (mmdAnimation && mmdAnimation.tracks) {
      mmdAnimation.tracks.forEach((track: THREE.KeyframeTrack) => {
        // 解析轨道名称，提取骨骼名称
        const trackName = track.name;
        const match = trackName.match(/^(.+)\.(position|quaternion|scale)$/);
        
        if (match) {
          const mmdBoneName = match[1];
          const property = match[2];
          
          // 映射 MMD 骨骼名称到 VRM 骨骼名称
          const vrmBoneName = MMD_TO_VRM_BONE_MAP[mmdBoneName];
          
          if (vrmBoneName) {
            // 获取 VRM 对应的骨骼节点
            const bone = humanoid.getRawBoneNode(vrmBoneName as any);
            
            if (bone) {
              // 创建新的轨道，使用 VRM 骨骼的名称
              const newTrackName = `${bone.name}.${property}`;
              
              // 创建新轨道（复制数据）
              let newTrack: THREE.KeyframeTrack;
              
              if (property === 'position') {
                newTrack = new THREE.VectorKeyframeTrack(
                  newTrackName,
                  track.times,
                  track.values
                );
              } else if (property === 'quaternion') {
                newTrack = new THREE.QuaternionKeyframeTrack(
                  newTrackName,
                  track.times,
                  track.values
                );
              } else {
                newTrack = new THREE.VectorKeyframeTrack(
                  newTrackName,
                  track.times,
                  track.values
                );
              }
              
              tracks.push(newTrack);
              console.log(`✓ 映射骨骼: ${mmdBoneName} → ${vrmBoneName}`);
            }
          }
        }
      });
    }
    
    if (tracks.length === 0) {
      console.warn('⚠️ 未找到可映射的骨骼动画');
      throw new Error('VMD 动画中没有找到兼容的骨骼数据。\n\n可能的原因：\n• VMD 文件使用了非标准的骨骼名称\n• 动画与 VRM 模型结构不兼容\n\n建议使用 Blender + Cats 插件转换为 VRMA 格式。');
    }
    
    console.log(`✅ 成功映射 ${tracks.length} 个动画轨道`);
    
    // 创建 AnimationClip
    const clip = new THREE.AnimationClip('vmd_animation', -1, tracks);
    
    return clip;
  }

  // 处理窗口大小变化
  function handleResize() {
    if (!container || !camera.value || !renderer.value) return;

    camera.value.aspect = container.clientWidth / container.clientHeight;
    camera.value.updateProjectionMatrix();
    renderer.value.setSize(container.clientWidth, container.clientHeight);
  }

  // 清理资源
  function dispose() {
    console.log('🧹 清理VRM资源...');

    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (vrm.value && scene.value) {
      scene.value.remove(vrm.value.scene);
      VRMUtils.deepDispose(vrm.value.scene);
      vrm.value = null;
    }

    if (renderer.value) {
      renderer.value.dispose();
      if (renderer.value.domElement.parentElement) {
        renderer.value.domElement.parentElement.removeChild(renderer.value.domElement);
      }
      renderer.value = null;
    }

    scene.value = null;
    camera.value = null;

    console.log('✅ VRM资源已清理');
  }

  // Getter 方法（用于智能穿透等功能）
  function getCamera() {
    return camera.value;
  }

  function getScene() {
    return scene.value;
  }

  function getVrm() {
    return vrm.value;
  }

  return {
    scene,
    camera,
    renderer,
    vrm,
    isLoading,
    error,
    initScene,
    loadVrm,
    setScale,
    setPosition,
    setRotation,
    setLighting,
    handleResize,
    dispose,
    getCamera,
    getScene,
    getVrm,
    // 动画相关
    setBreathing,
    setBlinking,
    playExpression,
    loadCustomAnimation,
    stopAnimation,
    setAnimationSpeed,
    getAvailableExpressions,
  };
}

