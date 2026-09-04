process.env.NOVA_HEADLESS_RELEASE = '26.10'
process.env.NOVA_HEADLESS_ENGINE_VERSION = '26.10.0'
process.env.NOVA_HEADLESS_REFERENCE = 'server-v2610-headless-authority'
process.env.NOVA_HEADLESS_GAME_NAME = 'Nova 26.10 Headless Authority'
await import('./verify-v26.07-headless.mjs')
