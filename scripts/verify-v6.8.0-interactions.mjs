/** 功能回归脚本：执行 verify-v6.8.0-interactions.mjs 对应场景，保留断言和证据输出。 */
process.env.NOVA_INTERACTION_VERSION = '6.8.0'
await import('./verify-v6.0.2-interactions.mjs')
