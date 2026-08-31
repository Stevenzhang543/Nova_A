process.env.NOVA_LAYOUT_VERSION = '6.4.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v6.4.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v6.4.0'
// The shared layout harness samples Manage → Automation for its locale-text probe.
// v6.4 contextual Asset/Animation labels are exercised by the component verifier and
// geometry matrix; use a label on the surface the harness actually opens here.
process.env.NOVA_LAYOUT_REQUIRED_TEXT = 'Automation Studio|Automatisierungsstudio|自动化工作室'
await import('./qualify-layout-v3.3.mjs')
