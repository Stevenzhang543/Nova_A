import type { AssetRecord, TextureAtlasPage } from './types'

interface LoadedImage {
  record: AssetRecord
  image: HTMLImageElement
}

interface Shelf {
  y: number
  height: number
  x: number
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image asset could not be decoded'))
    image.src = source
  })
}

function place(width: number, height: number, shelves: Shelf[], pageSize: number): { x: number; y: number } | null {
  for (const shelf of shelves) {
    if (height <= shelf.height && shelf.x + width <= pageSize) {
      const result = { x: shelf.x, y: shelf.y }
      shelf.x += width
      return result
    }
  }
  const y = shelves.reduce((bottom, shelf) => Math.max(bottom, shelf.y + shelf.height), 0)
  if (y + height > pageSize) return null
  shelves.push({ y, height, x: width })
  return { x: 0, y }
}

export async function buildTextureAtlases(records: AssetRecord[], pageSize = 2048): Promise<TextureAtlasPage[]> {
  const sources = records.filter(record => record.assetType === 'image' && record.settings.atlas && record.source)
  const loaded = (await Promise.all(sources.map(async record => {
    try { return { record, image: await loadImage(record.source) } as LoadedImage }
    catch { return null }
  }))).filter((value): value is LoadedImage => value !== null)
  loaded.sort((first, second) => first.record.settings.atlasSettings.group.localeCompare(second.record.settings.atlasSettings.group) || second.image.naturalHeight - first.image.naturalHeight || second.image.naturalWidth - first.image.naturalWidth || first.record.uuid.localeCompare(second.record.uuid))

  const pages: TextureAtlasPage[] = []
  let page: TextureAtlasPage | null = null
  let context: CanvasRenderingContext2D | null = null
  let shelves: Shelf[] = []
  const createPage = () => {
    const canvas = document.createElement('canvas')
    canvas.width = pageSize
    canvas.height = pageSize
    page = { key: `atlas:${pages.length}`, canvas, regions: new Map() }
    pages.push(page)
    context = canvas.getContext('2d', { alpha: true })
    context?.clearRect(0, 0, pageSize, pageSize)
    shelves = []
  }

  for (const item of loaded) {
    const padding = Math.min(32, Math.max(0, Math.trunc(item.record.settings.atlasSettings.padding)))
    const scale = Math.min(1, (pageSize - padding * 2) / Math.max(item.image.naturalWidth, item.image.naturalHeight))
    const width = Math.max(1, Math.round(item.image.naturalWidth * scale))
    const height = Math.max(1, Math.round(item.image.naturalHeight * scale))
    if (!page) createPage()
    let position = place(width + padding * 2, height + padding * 2, shelves, pageSize)
    if (!position) { createPage(); position = place(width + padding * 2, height + padding * 2, shelves, pageSize) }
    if (!page || !context || !position) continue
    const activePage = page as TextureAtlasPage
    const activeContext = context as CanvasRenderingContext2D
    const x = position.x + padding, y = position.y + padding
    activeContext.drawImage(item.image, x, y, width, height)
    activePage.regions.set(item.record.uuid, {
      key: activePage.key,
      source: activePage.canvas,
      uv: { x: x / pageSize, y: y / pageSize, width: width / pageSize, height: height / pageSize },
      filter: item.record.settings.filterMode
    })
  }
  return pages
}
