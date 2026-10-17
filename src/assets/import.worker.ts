/** 资源导入工作线程入口：处理独立导入计算请求并回传对应结果。 */
interface ImportRequest {
  id: number
  bytes: ArrayBuffer
  settings: string
  importerVersion: string
  platform: string
}

self.onmessage = /** 在 Worker 中计算源字节 SHA-256，再结合导入器、平台和设置计算缓存键，带请求 ID 返回结果或错误。 */ async (event: MessageEvent<ImportRequest>) => {
  const { id, bytes, settings, importerVersion, platform } = event.data
  try {
    const sourceHash = await crypto.subtle.digest('SHA-256', bytes)
    const sourceHex = [...new Uint8Array(sourceHash)].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('')
    const keyInput = new TextEncoder().encode(`${sourceHex}\n${importerVersion}\n${platform}\n${settings}`)
    const keyHash = await crypto.subtle.digest('SHA-256', keyInput)
    const cacheKey = [...new Uint8Array(keyHash)].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('')
    self.postMessage({ id, sourceHash: sourceHex, cacheKey })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}

export {}
