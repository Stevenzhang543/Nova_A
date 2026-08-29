process.env.NOVA_LAYOUT_VERSION = '6.1.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v6.1.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v6.1.0'
process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS = '1024x640,1366x768,1920x1080,2560x1440'
process.env.NOVA_LAYOUT_REQUIRED_SCALES = '1,1.25,1.5,1.75,2'
await import('./qualify-layout-v3.3.mjs')
