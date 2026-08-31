process.env.NOVA_LAYOUT_VERSION = '6.2.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v6.2.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v6.2.0'
process.env.NOVA_LAYOUT_REQUIRED_TEXT = 'Contract|Vertrag|行为契约'
await import('./qualify-layout-v3.3.mjs')
