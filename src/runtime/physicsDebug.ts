/** 物理调试数据约定：声明或维护碰撞、接触和求解状态的可视化信息。 */
import { reactive } from 'vue'

export const physicsDebugState = reactive({
  enabled: false,
  showColliders: true,
  showContactPoints: true,
  showNormals: true,
  showSleepingBodies: true,
  showAabbs: false,
  showJointConstraints: true,
  showRopeNodes: true,
  showCharacterContacts: true,
  showCentersOfMass: false,
  showVelocities: false,
  showForces: false,
  colorByPhysicsLayer: false
})
