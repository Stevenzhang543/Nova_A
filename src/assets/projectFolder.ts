/** 项目目录导出：通过目录句柄创建子目录并写出项目及资源文件。 */
import type { AssetRecord } from './types'
import { canonicalProjectText } from '../projects/projectData'
import { NOVA_ENGINE_VERSION, NOVA_PROJECT_SCHEMA_VERSION } from '../projects/projectFormat'

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

/** 沿相对路径逐级获取或创建浏览器目录句柄。 */ async function directoryAt(root: ProjectDirectoryHandle, path: string): Promise<ProjectDirectoryHandle> {
  let directory = root
  for (const part of path.split('/').filter(Boolean)) directory = await directory.getDirectoryHandle(part, { create: true })
  return directory
}

/** 解析目标路径并创建父目录及文件，写入内容后关闭可写流完成提交。 */ async function writeFile(root: ProjectDirectoryHandle, path: string, value: Blob | string): Promise<void> {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return
  const directory = await directoryAt(root, parts.join('/'))
  const handle = await directory.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await writable.write(value)
  await writable.close()
}

/** 请求浏览器目标目录，输出规范项目、资源源文件、导入清单、缓存索引和构建设置，区分不支持与用户取消。 */ export async function exportProjectFolder(projectJson: string, assets: AssetRecord[], folders: string[]): Promise<'saved' | 'cancelled' | 'unsupported'> {
  const picker = (window as unknown as { showDirectoryPicker?: (options?: { mode: 'readwrite' }) => Promise<ProjectDirectoryHandle> }).showDirectoryPicker
  if (!picker) return 'unsupported'
  let root: ProjectDirectoryHandle
  try { root = await picker({ mode: 'readwrite' }) }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
  for (const folder of folders) await directoryAt(root, folder)
  const project = JSON.parse(canonicalProjectText(projectJson)) as Record<string, unknown>
  await writeFile(root, 'project.nova', canonicalProjectText(project))
  for (const asset of assets) {
    if (!asset.source || !asset.path.startsWith('Assets/')) continue
    const blob = await fetch(asset.source).then(/* 调用 response.blob() 并返回调用结果。 */ response => response.blob())
    await writeFile(root, asset.path, blob)
  }
  const manifest = assets.map(/* 返回 asset 的当前值。 */ ({ source: _source, ...asset }) => asset)
  await writeFile(root, '.nova/imported/manifest.json', canonicalProjectText({ generatedBy: `Nova_A ${NOVA_ENGINE_VERSION}`, generated: true, editable: false, schemaVersion: NOVA_PROJECT_SCHEMA_VERSION, assets: manifest }))
  await writeFile(root, '.nova/cache/index.json', JSON.stringify({
    generatedBy: `Nova_A ${NOVA_ENGINE_VERSION}`,
    disposable: true,
    entries: assets.map(/** 构造并返回记录 { uuid: asset.uuid, sourceModified: asset.sourceModified, byteLength: asset.byteLength, settings: asset.settings }，字段按当前实参及捕获状态求值。 */ asset => ({ uuid: asset.uuid, sourceModified: asset.sourceModified, byteLength: asset.byteLength, settings: asset.settings }))
  }, null, 2))
  await writeFile(root, 'ProjectSettings/project.manifest.json', canonicalProjectText(project.manifest ?? {}))
  await writeFile(root, 'ProjectSettings/build.presets.json', canonicalProjectText({ version: 1, presets: [(project.projectSettings as Record<string, unknown> | undefined)?.build ?? {}] }))
  await writeFile(root, 'Packages.lock', canonicalProjectText((project.packages as Record<string, unknown> | undefined)?.lockfile ?? []))
  await writeFile(root, 'ProjectSettings/renderer.json', JSON.stringify({ backend: 'WebGL2', fallback: 'Canvas2D', atlasPageSize: 2048 }, null, 2))
  return 'saved'
}
