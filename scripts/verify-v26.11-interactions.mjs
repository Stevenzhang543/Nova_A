import { readFile } from 'node:fs/promises'
process.env.NOVA_INTERACTION_VERSION = '26.11'
process.env.NOVA_INTERACTION_ENGINE_VERSION = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version
process.env.NOVA_INTERACTION_OUTPUT = 'v26.11-user-interactions.json'
await import('./verify-v6.0.2-interactions.mjs')
