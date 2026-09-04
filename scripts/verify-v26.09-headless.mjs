process.env.NOVA_HEADLESS_RELEASE = '26.09'
process.env.NOVA_HEADLESS_ENGINE_VERSION = '26.9.0'
process.env.NOVA_HEADLESS_REFERENCE = 'server-v2609-headless-authority'
process.env.NOVA_HEADLESS_GAME_NAME = 'Nova 26.09 Headless Authority'
await import('./verify-v26.07-headless.mjs')
