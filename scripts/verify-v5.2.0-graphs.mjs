/** 功能回归脚本：执行 verify-v5.2.0-graphs.mjs 对应场景，保留断言和证据输出。 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const excludedDirectories = new Set(['.git', 'dist', 'node_modules', 'release', 'target'])

/** 结构说明（自动提取）：graphFilesUnder；输入 directory；直接调用 readdir、entry.isDirectory、excludedDirectories.has、files.push、graphFilesUnder 等；返回路径包含 files；包含循环处理；等待异步结果。 */ async function graphFilesUnder(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) files.push(...await graphFilesUnder(join(directory, entry.name)))
    } else if (entry.isFile() && entry.name.endsWith('.nova-graph')) {
      files.push(join(directory, entry.name))
    }
  }
  return files
}

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    platform: 'Win32',
    hardwareConcurrency: 8,
    userAgent: 'Nova_A v5.2.0 graph verifier',
    mediaDevices: { /** 提供不注册监听器的测试事件接口。 */ addEventListener() {}, /** 提供无需移除监听器的测试事件接口。 */ removeEventListener() {}, /* 返回按声明顺序构造的数组 []。 */ async enumerateDevices() { return [] } },
  },
})
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, /** 提供不注册监听器的测试事件接口。 */ addEventListener() {}, /** 提供无需移除监听器的测试事件接口。 */ removeEventListener() {}, /** 生成器环境桩忽略事件派发。 */ dispatchEvent() {} }
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem() { return null }, /** 隔离存储桩忽略写入，不持久化生成过程数据。 */ setItem() {}, /** 隔离存储桩忽略删除请求。 */ removeItem() {} }

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()
const results = []
try {
  const types = await server.ssrLoadModule('/src/visual/graphTypes.ts')
  const compiler = await server.ssrLoadModule('/src/visual/graphCompiler.ts')
  const language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const graphFiles = (await graphFilesUnder(root)).sort(/* 根据 left < right 的真假，分别返回 -1 或 left > right ? 1 : 0。 */ (left, right) => left < right ? -1 : left > right ? 1 : 0)
  if (graphFiles.length === 0) throw new Error('No .nova-graph assets were found to verify.')

  for (const path of graphFiles) {
    const source = await readFile(path, 'utf8')
    const id = relative(root, path).replaceAll('\\', '/')
    try {
      const graph = types.parseGraphDocument(source)
      const canonical = types.serializeGraphDocument(graph)
      const roundTrip = types.serializeGraphDocument(types.parseGraphDocument(canonical))
      const compiled = compiler.compileGraphSource(canonical)
      const scriptErrors = compiled.valid
        ? language.analyzeScript(compiled.source, graph.apiVersion).diagnostics.filter(/* 比较 diagnostic.severity 与 'error'，返回严格相等的判断结果。 */ diagnostic => diagnostic.severity === 'error')
        : []
      const valid = canonical === roundTrip && compiled.valid && scriptErrors.length === 0
      results.push({
        id,
        status: valid ? 'passed' : 'failed',
        graphUuid: graph.uuid,
        apiVersion: graph.apiVersion,
        canonicalBytes: canonical.length,
        nodeCount: compiled.nodeCount,
        edgeCount: compiled.edgeCount,
        diagnostics: compiled.diagnostics,
        scriptErrors,
      })
    } catch (error) {
      results.push({ id, status: 'failed', error: error instanceof Error ? error.message : String(error) })
    }
  }
} finally {
  await Promise.race([server.close(), new Promise(/* 调用 setTimeout(resolve, 2_000) 并返回调用结果。 */ resolve => setTimeout(resolve, 2_000))])
}

const failed = results.filter(/* 比较 result.status 与 'failed'，返回严格相等的判断结果。 */ result => result.status === 'failed')
const report = {
  format: 'nova-v5.2.0-graph-asset-verification',
  version: 1,
  engineVersion: '5.2.0',
  generatedAt: new Date().toISOString(),
  graphCount: results.length,
  results,
  status: failed.length === 0 ? 'passed' : 'failed',
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v5.2.0-graph-assets.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length > 0) {
  console.error(`Nova_A v5.2.0 graph verification failed: ${failed.length}/${results.length} assets.`)
  process.exit(1)
}
console.log(`Nova_A v5.2.0 graph verification passed: ${results.length} asset${results.length === 1 ? '' : 's'}.`)
