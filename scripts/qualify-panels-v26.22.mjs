/** 版本资格入口：配置对应发布检查并调用保留的执行流程。 */
// Retained complete panel traversal, with separate current-release evidence paths.
process.env.NOVA_LAYOUT_QUALIFICATION_RELEASE = '26.22'
await import('./qualify-panels-v26.21.mjs')
