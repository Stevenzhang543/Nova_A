/** 功能回归脚本：执行 verify-v26.08-interactions.mjs 对应场景，保留断言和证据输出。 */
process.env.NOVA_INTERACTION_VERSION = '26.08'
process.env.NOVA_INTERACTION_ENGINE_VERSION = '26.8.0'
process.env.NOVA_INTERACTION_OUTPUT = 'v26.08-user-interactions.json'
await import('./verify-v6.0.2-interactions.mjs')
