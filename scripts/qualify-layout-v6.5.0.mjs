process.env.NOVA_LAYOUT_VERSION = '6.5.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v6.5.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v6.5.0'
// The shared harness probes required locale text in Manage → Automation. The
// renderer panel is still traversed and captured later in the same matrix.
process.env.NOVA_LAYOUT_REQUIRED_TEXT = 'Automation Studio|Automatisierungsstudio|自动化工作室'
await import('./qualify-layout-v3.3.mjs')
