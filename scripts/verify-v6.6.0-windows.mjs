/** 功能回归脚本：执行 verify-v6.6.0-windows.mjs 对应场景，保留断言和证据输出。 */
process.env.NOVA_WINDOWS_VERSION = '6.6.0'
process.env.NOVA_WINDOWS_REFERENCE = 'creator-v660-coop-arena'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 6.6 Co-op Arena'
await import('./verify-v6.2.0-windows.mjs')
