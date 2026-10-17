/** 功能回归脚本：执行 verify-v6.3.0-windows.mjs 对应场景，保留断言和证据输出。 */
process.env.NOVA_WINDOWS_VERSION='6.3.0'
process.env.NOVA_WINDOWS_REFERENCE='creator-v630-automation-blocks'
process.env.NOVA_WINDOWS_GAME_NAME='Automation Knockout'
await import('./verify-v6.2.0-windows.mjs')
