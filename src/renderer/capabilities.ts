import { reactive } from 'vue'

export type RendererBackendName = 'WebGL2' | 'Canvas2D'
export type RendererPath = 'Native' | 'Compatibility' | 'Diagnostic fallback'
export interface RendererFeatureSupport { id: string; label: string; support: 'supported' | 'limited' | 'unsupported'; detail: string; fix: string }
export interface RendererCapabilityReport {
  backend: RendererBackendName
  target: 'native-windows' | 'web'
  path: RendererPath
  fallbackReason: string
  device: string
  driver: string
  apiVersion: string
  shadingLanguage: string
  webgl2: boolean
  canvas2d: boolean
  maximumTextureSize: number
  textureUnits: number
  floatRenderTargets: boolean
  gpuTimers: boolean
  contextRecovery: boolean
  antialiasing: boolean
  enabledExtensions: string[]
  limits: Record<string, number>
  matrix: RendererFeatureSupport[]
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

export function queryRendererCapabilities(preferred?: RendererBackendName, requestedPath: 'Auto' | 'Native' | 'Compatibility' = 'Auto'): RendererCapabilityReport {
  if (typeof document === 'undefined') return { backend: preferred ?? 'Canvas2D', target: 'web', path: 'Diagnostic fallback', fallbackReason: 'DOM canvas is unavailable.', device: 'Unavailable', driver: 'Unavailable', apiVersion: 'Unavailable', shadingLanguage: 'Unavailable', webgl2: false, canvas2d: false, maximumTextureSize: 0, textureUnits: 0, floatRenderTargets: false, gpuTimers: false, contextRecovery: false, antialiasing: false, enabledExtensions: [], limits: {}, matrix: [{ id: 'canvas', label: 'Canvas output', support: 'unsupported', detail: 'DOM canvas is unavailable.', fix: 'Run Nova_A in a supported browser or desktop WebView.' }], features: [], unsupported: ['DOM canvas unavailable'], fallbackRules }
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2', { antialias: true, failIfMajorPerformanceCaveat: false })
  const canvas2d = Boolean(document.createElement('canvas').getContext('2d'))
  const backend = preferred ?? (gl ? 'WebGL2' : 'Canvas2D')
  const debug = gl?.getExtension('WEBGL_debug_renderer_info')
  const device = gl ? String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)) : 'Canvas2D software path'
  const driver = gl ? String(gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR)) : navigator.userAgent
  const native = target() === 'native-windows'
  const supported = (id: string, label: string, detail: string): RendererFeatureSupport => ({ id, label, support: 'supported', detail, fix: 'No action required.' })
  const limited = (id: string, label: string, detail: string, fix: string): RendererFeatureSupport => ({ id, label, support: 'limited', detail, fix })
  const unsupported = (id: string, label: string, detail: string, fix: string): RendererFeatureSupport => ({ id, label, support: 'unsupported', detail, fix })
  const matrix: RendererFeatureSupport[] = backend === 'WebGL2' ? [
    supported('sprites', 'Sprites, atlases, cameras and render targets', 'Batched WebGL2 path with stable layer/order sorting.'),
    supported('materials', 'Typed materials and shaders', 'GLSL ES 3.00 safe subset with reflection, includes and hot reload.'),
    supported('lighting', '2D lights, occluders, shadows and normals', 'Renderer lighting pass is enabled when requested.'),
    supported('particles', 'GPU-rendered 2D particle output', 'CPU simulation feeds batched renderer geometry.'),
    gl?.getExtension('EXT_disjoint_timer_query_webgl2') ? supported('gpu-timing', 'GPU timings', 'Disjoint timer queries are available.') : limited('gpu-timing', 'GPU timings', 'This driver does not expose disjoint timer queries.', 'Use CPU frame timings or update the GPU driver.'),
    unsupported('compute', 'Compute and storage shaders', 'WebGL2 does not expose compute/storage shader stages.', 'Use the documented CPU/job-system equivalent.')
  ] : [
    supported('base-2d', 'Sprites, shapes, text and cameras', 'Canvas2D compatibility output remains deterministic.'),
    limited('materials', 'Custom materials', 'Canvas2D renders the safe base material only.', 'Restore WebGL2 or switch the renderer path to Auto.'),
    unsupported('post', 'Render targets and post processing', 'Canvas2D has no Nova_A post-process graph.', 'Restore WebGL2 support or disable the post-process effect.'),
    unsupported('gpu-timing', 'GPU timings', 'No GPU query API exists on Canvas2D.', 'Use CPU frame timings.')
  ]
  const report: RendererCapabilityReport = {
    backend, target: target(), path: backend === 'Canvas2D' ? 'Diagnostic fallback' : requestedPath === 'Compatibility' ? 'Compatibility' : native ? 'Native' : 'Compatibility',
    fallbackReason: backend === 'Canvas2D' ? 'WebGL2 is unavailable or the diagnostic backend was requested.' : requestedPath === 'Native' && !native ? 'Native was requested in a web host; Compatibility WebGL2 was selected.' : '',
    device, driver, apiVersion: gl ? String(gl.getParameter(gl.VERSION)) : 'Canvas 2D', shadingLanguage: gl ? String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)) : 'n/a',
    webgl2: Boolean(gl), canvas2d,
    maximumTextureSize: gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 0,
    textureUnits: gl ? Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)) : 0,
    floatRenderTargets: Boolean(gl?.getExtension('EXT_color_buffer_float')),
    gpuTimers: Boolean(gl?.getExtension('EXT_disjoint_timer_query_webgl2')),
    contextRecovery: backend === 'WebGL2', antialiasing: gl ? Boolean(gl.getContextAttributes()?.antialias) : true,
    enabledExtensions: gl?.getSupportedExtensions()?.sort() ?? [],
    limits: gl ? { maximumTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)), textureUnits: Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)), maximumRenderbufferSize: Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)), maximumViewportWidth: Number((gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array)[0]), maximumViewportHeight: Number((gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array)[1]), maximumVertexAttributes: Number(gl.getParameter(gl.MAX_VERTEX_ATTRIBS)), maximumVaryingVectors: Number(gl.getParameter(gl.MAX_VARYING_VECTORS)) } : {},
    matrix,
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

export function reportRendererCreated(backend: RendererBackendName, requestedPath: 'Auto' | 'Native' | 'Compatibility' = 'Auto'): void {
  rendererCapabilityState.report = queryRendererCapabilities(backend, requestedPath)
  rendererCapabilityState.contextLost = false
  rendererCapabilityState.lastEvent = `${rendererCapabilityState.report.path} ${backend} ready`
}
export function reportRendererContextLost(): void {
  rendererCapabilityState.contextLost = true; rendererCapabilityState.contextLosses++; rendererCapabilityState.lastEvent = 'WebGL context lost; drawing suspended safely'
}
export function reportRendererContextRestored(): void {
  rendererCapabilityState.contextLost = false; rendererCapabilityState.recoveries++; rendererCapabilityState.lastEvent = 'WebGL context restored; renderer rebuild requested'
}
export function reportRendererReset(): void { rendererCapabilityState.resetCount++; rendererCapabilityState.lastEvent = 'Renderer reset completed' }
export function requestRendererReset(): void { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nova-renderer-reset-request')) }
