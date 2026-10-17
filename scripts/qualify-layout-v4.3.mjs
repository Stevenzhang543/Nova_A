/** 版本资格入口：配置对应发布检查并调用保留的执行流程。 */
process.env.NOVA_LAYOUT_VERSION = '4.3.0'
process.env.NOVA_LAYOUT_OUTPUT = 'v4.3.0-layout-browser.json'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v4.3.0'
await import('./qualify-layout-v3.3.mjs')
