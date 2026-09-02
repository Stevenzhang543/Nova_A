import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NOVA_WINDOWS_VERSION = '26.3.0'
process.env.NOVA_WINDOWS_REFERENCE = 'creator-v700-stable-platform'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 7 Stable Creator Platform'
await import('./verify-v6.2.0-windows.mjs')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
await copyFile(join(root, 'release-audits/v26.3.0-windows-smoke.json'), join(root, 'release-audits/v26.03-windows-smoke.json'))
