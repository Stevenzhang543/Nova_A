process.env.NOVA_LAYOUT_VERSION = '26.09'
process.env.NOVA_LAYOUT_ENGINE_VERSION = '26.9.0'
process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS = '1024x640,1366x768,1920x1080,2560x1440'
process.env.NOVA_LAYOUT_REQUIRED_SCALES = '0.8,1,1.25,1.5'
await import('./qualify-layout-v3.3.mjs')
