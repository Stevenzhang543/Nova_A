interface ImportRequest {
  id: number
  bytes: ArrayBuffer
  settings: string
  importerVersion: string
  platform: string
}

self.onmessage = async (event: MessageEvent<ImportRequest>) => {
  const { id, bytes, settings, importerVersion, platform } = event.data
  try {
    const sourceHash = await crypto.subtle.digest('SHA-256', bytes)
    const sourceHex = [...new Uint8Array(sourceHash)].map(value => value.toString(16).padStart(2, '0')).join('')
    const keyInput = new TextEncoder().encode(`${sourceHex}\n${importerVersion}\n${platform}\n${settings}`)
    const keyHash = await crypto.subtle.digest('SHA-256', keyInput)
    const cacheKey = [...new Uint8Array(keyHash)].map(value => value.toString(16).padStart(2, '0')).join('')
    self.postMessage({ id, sourceHash: sourceHex, cacheKey })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}

export {}
