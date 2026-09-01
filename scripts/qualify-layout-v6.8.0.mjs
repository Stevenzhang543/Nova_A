process.env.NOVA_LAYOUT_VERSION = '6.8.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v6.8.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v6.8.0'
process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS = '1024x768,1366x768,1920x1080'
process.env.NOVA_LAYOUT_REQUIRED_SCALES = '1,1.5,2'
process.env.NOVA_LAYOUT_REQUIRED_MANAGE_INDEX = '1'
process.env.NOVA_LAYOUT_REQUIRED_TEXT = 'Devices & mobile input|Geräte & mobile Eingabe|设备与移动输入'
await import('./qualify-layout-v3.3.mjs')
