process.env.NOVA_LAYOUT_VERSION = '6.3.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v6.3.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v6.3.0'
process.env.NOVA_LAYOUT_REQUIRED_TEXT = 'Automation Studio|Automatisierungsstudio|自动化工作室|Blocks|Blöcke|积木'
await import('./qualify-layout-v3.3.mjs')
