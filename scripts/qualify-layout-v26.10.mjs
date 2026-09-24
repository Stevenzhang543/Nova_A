/** 版本资格入口：配置对应发布检查并调用保留的执行流程。 */
process.env.NOVA_LAYOUT_VERSION = '26.10'
process.env.NOVA_LAYOUT_ENGINE_VERSION = '26.10.0'
process.env.NOVA_LAYOUT_SCREENSHOTS = 'v26.10'
await import('./qualify-layout-v3.3.mjs')
