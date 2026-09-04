process.env.NOVA_HEADLESS_RELEASE = '26.08'
process.env.NOVA_HEADLESS_ENGINE_VERSION = '26.8.0'
process.env.NOVA_HEADLESS_REFERENCE = 'server-v2608-headless-authority'
process.env.NOVA_HEADLESS_GAME_NAME = 'Nova 26.08 Headless Authority'
await import('./verify-v26.07-headless.mjs')
