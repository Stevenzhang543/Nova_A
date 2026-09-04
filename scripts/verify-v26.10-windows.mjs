import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.env.NOVA_WINDOWS_VERSION = '26.10.0'
process.env.NOVA_WINDOWS_REFERENCE = 'creator-v2610-mixed-game'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 26.10 Mixed Code and Blocks'
await import('./verify-v6.2.0-windows.mjs')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
await copyFile(join(root, 'release-audits/v26.10.0-windows-smoke.json'), join(root, 'release-audits/v26.10-windows-smoke.json'))
