process.env.NOVA_INTERACTION_VERSION = '26.10'
process.env.NOVA_INTERACTION_ENGINE_VERSION = '26.10.0'
process.env.NOVA_INTERACTION_OUTPUT = 'v26.10-user-interactions.json'
await import('./verify-v6.0.2-interactions.mjs')
