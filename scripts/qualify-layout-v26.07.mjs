process.env.NOVA_LAYOUT_VERSION = '26.07'
process.env.NOVA_LAYOUT_ENGINE_VERSION = '26.7.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v26.07-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v26.07'
process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS = '1024x640,1024x768,1366x768,1920x1080,2560x1440'
process.env.NOVA_LAYOUT_REQUIRED_SCALES = '0.8,1,1.25,1.5'
process.env.NOVA_LAYOUT_REQUIRED_TEXT = 'Network Studio|Netzwerkstudio|网络工作室'
process.env.NOVA_LAYOUT_REQUIRED_WORKSPACE_INDEX = '4'
// A fresh qualification profile uses the frozen bottom-tab order where
// Network Studio is the sixth panel tab. Scope the selector to that tab so a
// generic workspace button can never satisfy the navigation step by accident.
process.env.NOVA_LAYOUT_REQUIRED_CLICK = '.panel-tabs button.panel-tab:nth-of-type(6)'
process.env.NOVA_LAYOUT_REQUIRED_ROOT = '.network-studio'
await import('./qualify-layout-v3.3.mjs')
