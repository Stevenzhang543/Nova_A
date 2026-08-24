import { reactive } from 'vue'

export type RendererBackendName = 'WebGL2' | 'Canvas2D'
export interface RendererCapabilityReport {
  backend: RendererBackendName
  target: 'native-windows' | 'web'
  tier: 'Production qualified' | 'Compatibility fallback'
  webgl2: boolean
  canvas2d: boolean
  maximumTextureSize: number
  textureUnits: number
  floatRenderTargets: boolean
  gpuTimers: boolean
  contextRecovery: boolean
  antialiasing: boolean
  features: string[]
  unsupported: string[]
  fallbackRules: string[]
}

const fallbackRules = [
  'WebGL2 unavailable → Canvas2D base-material renderer',
  'Unsafe or failed shader → Default base material',
  'Missing texture → opaque white texture',
  'Unsupported post-process target → direct world framebuffer'
]

export const rendererCapabilityState = reactive({
  report: null as RendererCapabilityReport | null,
  contextLost: false,
  contextLosses: 0,
  recoveries: 0,
  resetCount: 0,
  lastEvent: 'Not initialized'
})

function target(): 'native-windows' | 'web' { return '__TAURI_INTERNALS__' in globalThis ? 'native-windows' : 'web' }

export function queryRendererCapabilities(preferred?: RendererBackendName): RendererCapabilityReport {
  if (typeof document === 'undefined') return { backend: preferred ?? 'Canvas2D', target: 'web', tier: 'Compatibility fallback', webgl2: false, canvas2d: false, maximumTextureSize: 0, textureUnits: 0, floatRenderTargets: false, gpuTimers: false, contextRecovery: false, antialiasing: false, features: [], unsupported: ['DOM canvas unavailable'], fallbackRules }
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2', { antialias: true, failIfMajorPerformanceCaveat: false })
  const canvas2d = Boolean(document.createElement('canvas').getContext('2d'))
  const backend = preferred ?? (gl ? 'WebGL2' : 'Canvas2D')
  const report: RendererCapabilityReport = {
    backend, target: target(), tier: backend === 'WebGL2' ? 'Production qualified' : 'Compatibility fallback', webgl2: Boolean(gl), canvas2d,
    maximumTextureSize: gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 0,
    textureUnits: gl ? Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)) : 0,
    floatRenderTargets: Boolean(gl?.getExtension('EXT_color_buffer_float')),
    gpuTimers: Boolean(gl?.getExtension('EXT_disjoint_timer_query_webgl2')),
    contextRecovery: backend === 'WebGL2', antialiasing: gl ? Boolean(gl.getContextAttributes()?.antialias) : true,
    features: backend === 'WebGL2'
      ? ['stable sprite batching', 'texture atlases', 'multiple cameras/viewports', 'render textures', 'typed materials', '2D lights/shadows', 'particles', 'sRGB/linear textures']
      : ['stable draw order', 'multiple cameras/viewports', 'sprites/shapes/text', 'base material fallback'],
    unsupported: backend === 'WebGL2'
      ? ['compute shaders', '3D/cube samplers', 'storage images', 'unbounded shader loops']
      : ['custom shaders', 'post-process render targets', 'GPU timings', 'normal-map lighting'],
    fallbackRules
  }
  rendererCapabilityState.report = report
  return report
}

export function reportRendererCreated(backend: RendererBackendName): void {
  rendererCapabilityState.report = queryRendererCapabilities(backend)
  rendererCapabilityState.contextLost = false
  rendererCapabilityState.lastEvent = `${backend} ready`
}
export function reportRendererContextLost(): void {
  rendererCapabilityState.contextLost = true; rendererCapabilityState.contextLosses++; rendererCapabilityState.lastEvent = 'WebGL context lost; drawing suspended safely'
}
export function reportRendererContextRestored(): void {
  rendererCapabilityState.contextLost = false; rendererCapabilityState.recoveries++; rendererCapabilityState.lastEvent = 'WebGL context restored; renderer rebuild requested'
}
export function reportRendererReset(): void { rendererCapabilityState.resetCount++; rendererCapabilityState.lastEvent = 'Renderer reset completed' }
export function requestRendererReset(): void { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nova-renderer-reset-request')) }
