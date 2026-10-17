/** 功能回归脚本：执行 verify-v7.0.0-clean-source.mjs 对应场景，保留断言和证据输出。 */
process.env.NOVA_CLEAN_SOURCE_VERSION = '7.0.0'
await import('./verify-v6.9.0-clean-source.mjs')
