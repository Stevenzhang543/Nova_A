/** 功能回归脚本：执行 verify-v26.01-interactions.mjs 对应场景，保留断言和证据输出。 */
process.env.NOVA_INTERACTION_VERSION = '26.01'
await import('./verify-v6.0.2-interactions.mjs')
