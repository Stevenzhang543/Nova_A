import { reactive } from 'vue'

export const physicsDebugState = reactive({
  enabled: false,
  showColliders: true,
  showContactPoints: true,
  showNormals: true,
  showSleepingBodies: true,
  showAabbs: false,
  showJointConstraints: true,
  showRopeNodes: true
})
