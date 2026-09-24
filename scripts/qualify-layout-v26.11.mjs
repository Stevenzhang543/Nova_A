/** 版本资格入口：配置对应发布检查并调用保留的执行流程。 */
import { readFile } from 'node:fs/promises'
process.env.NOVA_LAYOUT_VERSION = '26.11'
process.env.NOVA_LAYOUT_ENGINE_VERSION = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version
process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS = '1024x640,1366x768,1920x1080'
process.env.NOVA_LAYOUT_REQUIRED_SCALES = '1,1.5,2'
await import('./qualify-layout-v3.3.mjs')
