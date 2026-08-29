process.env.NOVA_LAYOUT_VERSION = '5.9.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v5.9.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v5.9.0'
process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS = '1024x640,1366x768,1920x1080,2560x1440'
await import('./qualify-layout-v3.3.mjs')
