process.env.NOVA_WINDOWS_VERSION = '6.9.0'
process.env.NOVA_WINDOWS_REFERENCE = 'creator-v690-package-shipping'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 6.9 Offline Package Shipping'
await import('./verify-v6.2.0-windows.mjs')
