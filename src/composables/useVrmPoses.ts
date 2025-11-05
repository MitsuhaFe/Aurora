import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

/**
 * VRM姿势定义
 * 每个姿势包含骨骼名称和对应的旋转角度（欧拉角，单位：弧度）
 */
export interface BoneRotation {
  bone: VRMHumanBoneName;
  rotation: { x: number; y: number; z: number };
}

export interface PoseDefinition {
  name: string;
  displayName: string;
  description: string;
  bones: BoneRotation[];
}

/**
 * 预定义的姿势库
 */
export const POSE_LIBRARY: Record<string, PoseDefinition> = {
  default: {
    name: 'default',
    displayName: '默认站立',
    description: '自然的站立姿势',
    bones: [
      // 重置所有主要骨骼到默认位置
      { bone: 'leftUpperArm', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'leftLowerArm', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'leftHand', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'rightHand', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'spine', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'chest', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'upperChest', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'neck', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'head', rotation: { x: 0, y: 0, z: 0 } },
    ],
  },

  wave: {
    name: 'wave',
    displayName: '挥手打招呼',
    description: '友好地向你挥手问好',
    bones: [
      // 右手臂抬起挥手
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: -1.8 } }, // 向外抬起约103度
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -1.2 } }, // 手肘弯曲约69度
      { bone: 'rightHand', rotation: { x: 0, y: 0, z: 0.3 } }, // 手腕稍微弯曲
      // 头部稍微倾斜
      { bone: 'head', rotation: { x: 0.1, y: 0.15, z: 0 } }, // 头稍微侧倾
      // 身体稍微倾斜
      { bone: 'spine', rotation: { x: 0, y: 0.1, z: 0 } },
    ],
  },

  sit: {
    name: 'sit',
    displayName: '坐姿',
    description: '舒适的坐姿',
    bones: [
      // 上身稍微前倾
      { bone: 'spine', rotation: { x: 0.2, y: 0, z: 0 } },
      { bone: 'chest', rotation: { x: 0.1, y: 0, z: 0 } },
      // 双手放在腿上
      { bone: 'leftUpperArm', rotation: { x: 0.5, y: 0, z: 0.3 } },
      { bone: 'rightUpperArm', rotation: { x: 0.5, y: 0, z: -0.3 } },
      { bone: 'leftLowerArm', rotation: { x: 0, y: 0, z: 0.8 } },
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -0.8 } },
      // 头部稍微低下
      { bone: 'head', rotation: { x: 0.15, y: 0, z: 0 } },
    ],
  },

  thinking: {
    name: 'thinking',
    displayName: '思考',
    description: '手托下巴思考的样子',
    bones: [
      // 右手托下巴
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: -1.2 } }, // 手臂抬起
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -1.5 } }, // 手肘弯曲
      { bone: 'rightHand', rotation: { x: -0.3, y: 0, z: 0 } },
      // 头部稍微低下并倾斜
      { bone: 'head', rotation: { x: 0.2, y: 0.1, z: 0.05 } },
      { bone: 'neck', rotation: { x: 0.1, y: 0, z: 0 } },
      // 身体稍微放松
      { bone: 'spine', rotation: { x: 0.1, y: 0, z: 0 } },
    ],
  },

  rest: {
    name: 'rest',
    displayName: '休息',
    description: '双手交叉休息的姿势',
    bones: [
      // 双手交叉放在胸前
      { bone: 'leftUpperArm', rotation: { x: 0, y: 0, z: 0.8 } },
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: -0.8 } },
      { bone: 'leftLowerArm', rotation: { x: 0, y: 0, z: 1.2 } },
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -1.2 } },
      // 头部稍微倾斜
      { bone: 'head', rotation: { x: 0, y: 0.1, z: 0 } },
      // 身体放松
      { bone: 'spine', rotation: { x: 0.05, y: 0, z: 0 } },
    ],
  },

  bow: {
    name: 'bow',
    displayName: '鞠躬',
    description: '礼貌地鞠躬致意',
    bones: [
      // 上身前倾
      { bone: 'spine', rotation: { x: 0.5, y: 0, z: 0 } },
      { bone: 'chest', rotation: { x: 0.3, y: 0, z: 0 } },
      { bone: 'upperChest', rotation: { x: 0.2, y: 0, z: 0 } },
      // 头部随身体前倾
      { bone: 'neck', rotation: { x: 0.2, y: 0, z: 0 } },
      { bone: 'head', rotation: { x: 0.1, y: 0, z: 0 } },
      // 双手自然下垂
      { bone: 'leftUpperArm', rotation: { x: 0.2, y: 0, z: 0.1 } },
      { bone: 'rightUpperArm', rotation: { x: 0.2, y: 0, z: -0.1 } },
    ],
  },

  stretch: {
    name: 'stretch',
    displayName: '伸懒腰',
    description: '双手向上伸展的动作',
    bones: [
      // 双手向上伸展
      { bone: 'leftUpperArm', rotation: { x: 0, y: 0, z: 2.8 } }, // 手臂高举
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: -2.8 } },
      { bone: 'leftLowerArm', rotation: { x: 0, y: 0, z: 0.3 } },
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -0.3 } },
      // 身体稍微后仰
      { bone: 'spine', rotation: { x: -0.15, y: 0, z: 0 } },
      { bone: 'chest', rotation: { x: -0.1, y: 0, z: 0 } },
      // 头部稍微后仰
      { bone: 'head', rotation: { x: -0.1, y: 0, z: 0 } },
    ],
  },

  joy: {
    name: 'joy',
    displayName: '开心',
    description: '双手举起表示开心',
    bones: [
      // 双手举起
      { bone: 'leftUpperArm', rotation: { x: 0, y: 0, z: 2.2 } },
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: -2.2 } },
      { bone: 'leftLowerArm', rotation: { x: 0, y: 0, z: 0.8 } },
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -0.8 } },
      { bone: 'leftHand', rotation: { x: 0, y: 0, z: 0.2 } },
      { bone: 'rightHand', rotation: { x: 0, y: 0, z: -0.2 } },
      // 身体稍微前倾
      { bone: 'spine', rotation: { x: 0.1, y: 0, z: 0 } },
      // 头部稍微上扬
      { bone: 'head', rotation: { x: -0.05, y: 0, z: 0 } },
    ],
  },

  shy: {
    name: 'shy',
    displayName: '害羞',
    description: '害羞地用手遮脸',
    bones: [
      // 右手遮脸
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: -1.5 } },
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -1.8 } },
      { bone: 'rightHand', rotation: { x: -0.2, y: 0, z: 0 } },
      // 左手稍微收起
      { bone: 'leftUpperArm', rotation: { x: 0, y: 0, z: 0.3 } },
      { bone: 'leftLowerArm', rotation: { x: 0, y: 0, z: 0.5 } },
      // 头部稍微低下并倾斜
      { bone: 'head', rotation: { x: 0.15, y: -0.1, z: 0.1 } },
      // 身体稍微倾斜
      { bone: 'spine', rotation: { x: 0.05, y: -0.05, z: 0.05 } },
    ],
  },

  salute: {
    name: 'salute',
    displayName: '敬礼',
    description: '军人式敬礼',
    bones: [
      // 右手敬礼
      { bone: 'rightUpperArm', rotation: { x: 0, y: 0, z: -1.8 } },
      { bone: 'rightLowerArm', rotation: { x: 0, y: 0, z: -1.5 } },
      { bone: 'rightHand', rotation: { x: -0.3, y: 0, z: -0.2 } },
      // 左手自然下垂
      { bone: 'leftUpperArm', rotation: { x: 0, y: 0, z: 0 } },
      { bone: 'leftLowerArm', rotation: { x: 0, y: 0, z: 0 } },
      // 身体挺直
      { bone: 'spine', rotation: { x: -0.05, y: 0, z: 0 } },
      { bone: 'chest', rotation: { x: -0.05, y: 0, z: 0 } },
      // 头部正视
      { bone: 'head', rotation: { x: 0, y: 0, z: 0 } },
    ],
  },
};

/**
 * 应用姿势到VRM模型
 */
export function applyPose(vrm: VRM | null, poseName: string, transitionDuration = 0.5) {
  if (!vrm || !vrm.humanoid) {
    console.warn('⚠️ VRM模型或Humanoid骨骼不存在，无法应用姿势');
    return;
  }

  const pose = POSE_LIBRARY[poseName];
  if (!pose) {
    console.warn(`⚠️ 未找到姿势: ${poseName}`);
    return;
  }

  console.log(`🎭 应用姿势: ${pose.displayName} (${pose.description})`);

  // 应用每个骨骼的旋转
  pose.bones.forEach(({ bone, rotation }) => {
    const boneNode = vrm.humanoid.getNormalizedBoneNode(bone);
    if (boneNode) {
      // 创建目标旋转
      const targetRotation = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ');
      
      if (transitionDuration > 0) {
        // 平滑过渡（简单的线性插值，可以使用更复杂的缓动函数）
        const startRotation = boneNode.rotation.clone();
        const startTime = performance.now();
        
        const animate = () => {
          const elapsed = (performance.now() - startTime) / 1000;
          const progress = Math.min(elapsed / transitionDuration, 1);
          
          // 使用缓动函数（ease-out）
          const eased = 1 - Math.pow(1 - progress, 3);
          
          boneNode.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * eased;
          boneNode.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * eased;
          boneNode.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * eased;
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            console.log(`✅ 骨骼 ${bone} 姿势应用完成`);
          }
        };
        
        animate();
      } else {
        // 立即应用
        boneNode.rotation.copy(targetRotation);
      }
    } else {
      console.warn(`⚠️ 未找到骨骼: ${bone}`);
    }
  });
}

/**
 * 获取所有可用姿势列表
 */
export function getAvailablePoses(): Array<{ name: string; displayName: string; description: string }> {
  return Object.values(POSE_LIBRARY).map(pose => ({
    name: pose.name,
    displayName: pose.displayName,
    description: pose.description,
  }));
}

/**
 * 重置所有骨骼到默认T-Pose
 */
export function resetPose(vrm: VRM | null) {
  applyPose(vrm, 'default', 0.5);
}

