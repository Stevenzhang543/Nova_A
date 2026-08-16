import type { AssetRecord } from './types'
import { stableProjectText } from '../runtime/teamWorkflow'

interface WritableFile {
  write(value: Blob | string): Promise<void>
  close(): Promise<void>
}

interface ProjectFileHandle {
  createWritable(): Promise<WritableFile>
}

interface ProjectDirectoryHandle {
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<ProjectDirectoryHandle>
  getFileHandle(name: string, options: { create: boolean }): Promise<ProjectFileHandle>
}

async function directoryAt(root: ProjectDirectoryHandle, path: string): Promise<ProjectDirectoryHandle> {
  let directory = root
  for (const part of path.split('/').filter(Boolean)) directory = await directory.getDirectoryHandle(part, { create: true })
  return directory
}

async function writeFile(root: ProjectDirectoryHandle, path: string, value: Blob | string): Promise<void> {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return
  const directory = await directoryAt(root, parts.join('/'))
  const handle = await directory.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await writable.write(value)
  await writable.close()
}

export async function exportProjectFolder(projectJson: string, assets: AssetRecord[], folders: string[]): Promise<'saved' | 'cancelled' | 'unsupported'> {
  const picker = (window as unknown as { showDirectoryPicker?: (options?: { mode: 'readwrite' }) => Promise<ProjectDirectoryHandle> }).showDirectoryPicker
  if (!picker) return 'unsupported'
  let root: ProjectDirectoryHandle
  try { root = await picker({ mode: 'readwrite' }) }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
  for (const folder of folders) await directoryAt(root, folder)
  await writeFile(root, 'project.nova', stableProjectText(projectJson))
  for (const asset of assets) {
    if (!asset.source || !asset.path.startsWith('Assets/')) continue
    const blob = await fetch(asset.source).then(response => response.blob())
    await writeFile(root, asset.path, blob)
  }
  const manifest = assets.map(({ source: _source, ...asset }) => asset)
  await writeFile(root, '.nova/imported/manifest.json', JSON.stringify({ generatedBy: 'Nova_A 3.0.0', assets: manifest }, null, 2))
  await writeFile(root, '.nova/cache/index.json', JSON.stringify({
    generatedBy: 'Nova_A 3.0.0',
    disposable: true,
    entries: assets.map(asset => ({ uuid: asset.uuid, sourceModified: asset.sourceModified, byteLength: asset.byteLength, settings: asset.settings }))
  }, null, 2))
  await writeFile(root, 'ProjectSettings/renderer.json', JSON.stringify({ backend: 'WebGL2', fallback: 'Canvas2D', atlasPageSize: 2048 }, null, 2))
  return 'saved'
}
