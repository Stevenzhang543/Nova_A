/** 功能回归脚本：执行 verify-v6.9.0-windows.mjs 对应场景，保留断言和证据输出。 */
process.env.NOVA_WINDOWS_VERSION = '6.9.0'
process.env.NOVA_WINDOWS_REFERENCE = 'creator-v690-package-shipping'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 6.9 Offline Package Shipping'
await import('./verify-v6.2.0-windows.mjs')
