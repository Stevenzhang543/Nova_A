process.env.NOVA_WINDOWS_VERSION = '6.5.0'
process.env.NOVA_WINDOWS_REFERENCE = 'creator-v650-physics-renderer'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 6.5 Physics Renderer Audit'
await import('./verify-v6.2.0-windows.mjs')
