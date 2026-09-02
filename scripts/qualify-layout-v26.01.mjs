process.env.NOVA_LAYOUT_VERSION = '26.01'
process.env.NOVA_LAYOUT_OUTPUT = 'v26.01-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v26.01'
process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS = '1024x640,1024x768,1366x768,1920x1080,2560x1440'
process.env.NOVA_LAYOUT_REQUIRED_SCALES = '1,1.5,2'
process.env.NOVA_LAYOUT_REQUIRED_MANAGE_INDEX = '3'
process.env.NOVA_LAYOUT_REQUIRED_TEXT = 'Learning Center|Lernzentrum|学习中心'
await import('./qualify-layout-v3.3.mjs')
