/** 版本资格入口：配置对应发布检查并调用保留的执行流程。 */
// Execute the retained complete traversal against actual26.23 source.
process.env.NOVA_LAYOUT_QUALIFICATION_RELEASE='26.23'
await import('./qualify-panels-v26.21.mjs')
