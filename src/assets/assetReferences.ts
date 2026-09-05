import type { AssetRecord } from './types'
import { assetSourceBytes, sha256Bytes } from './contentHash'
import { decodeRhaiString, isRhaiTrivia, lexRhai } from '../visual/rhaiSyntaxLexer'

const GUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const URI = new RegExp(`asset://(${GUID})(?![0-9a-z_-])`, 'gi')
const BARE = new RegExp(`^(?:asset://)?(${GUID})$`, 'i')
const REFERENCE_KEY = /(?:asset(?:s|uuid|uuids)?|reference|references|texture|texturePath|parent|clips|controllers|masks|rigs|retargetProfile)$/i
export const ASSET_REFERENCE_LIMITS = Object.freeze({ textBytes: 16 * 1024 * 1024, values: 1_000_000, depth: 64 })

/** Decode text only. Binary image/audio/font bodies are never scanned or rewritten. */
export function assetSourceText(asset: Pick<AssetRecord, 'source' | 'assetType' | 'mimeType'>): string | null {
  if (['image', 'audio', 'font'].includes(asset.assetType)) return null
  const bytes = assetSourceBytes(asset.source)
  if (bytes.length > ASSET_REFERENCE_LIMITS.textBytes) throw new Error('ASSET_REFERENCE_LIMIT: Text asset exceeds the 16 MiB dependency-analysis limit.')
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { return null }
}

export function collectAssetReferences(value: unknown, output = new Set<string>(), resolvePath?: (value: string, key: string) => string | null): Set<string> {
  const pending = [{ value, key: '', depth: 0, resource: false }], visited = new WeakSet<object>(); let count = 0
  while (pending.length) {
    const item = pending.pop()!
    if (++count > ASSET_REFERENCE_LIMITS.values || item.depth > ASSET_REFERENCE_LIMITS.depth) throw new Error('ASSET_REFERENCE_LIMIT: Dependency data exceeds its bounded traversal budget.')
    if (typeof item.value === 'string') {
      for (const match of item.value.matchAll(URI)) output.add(match[1].toLowerCase())
      const bare = REFERENCE_KEY.test(item.key) && (item.key !== 'parent' || item.resource) ? BARE.exec(item.value) : null
      if (bare) output.add(bare[1].toLowerCase())
      const path = resolvePath?.(item.value, item.key); if (path) output.add(path)
    } else if (item.value && typeof item.value === 'object' && !visited.has(item.value)) {
      visited.add(item.value)
      const resource = item.resource || (item.value as { format?: unknown }).format === 'nova-resource'
      for (const [key, child] of Object.entries(item.value)) pending.push({ value: child, key: Array.isArray(item.value) ? item.key : key, depth: item.depth + 1, resource })
    }
  }
  return output
}

export function textAssetReferences(asset: AssetRecord, resolvePath?: (value: string, key: string) => string | null): Set<string> {
  const source = assetSourceText(asset), output = new Set<string>()
  if (source !== null) {
    if (asset.assetType === 'script') {
      const lexed = lexRhai(source, { moduleMode: 'host' })
      const limit = lexed.diagnostics.find(issue => issue.code.startsWith('RHAI-LIMIT-'))
      if (limit) throw new Error(`ASSET_REFERENCE_LIMIT: ${limit.message}`)
      for (const token of lexed.tokens) if (token.kind === 'string' || token.kind === 'templateText') {
        let text = token.text
        if (token.kind === 'string') { try { text = decodeRhaiString(token.text) } catch { /* Host use paths have raw escape semantics and are handled separately. */ } }
        collectAssetReferences(text, output, resolvePath)
      }
    } else {
      try { collectAssetReferences(JSON.parse(source), output, resolvePath) }
      catch (error) { if (!(error instanceof SyntaxError)) throw error; collectAssetReferences(source, output, resolvePath) }
    }
  }
  collectAssetReferences({ settings: asset.settings, animationImport: asset.animationImport, derivedSprite: asset.derivedSprite, unknownFields: asset.unknownFields }, output, resolvePath)
  return output
}

function encodeTextLike(source: string, text: string): string {
  if (!source.startsWith('data:')) return text
  const comma = source.indexOf(','); if (comma < 0) throw new Error('ASSET_SOURCE_INVALID: Malformed data URL.')
  const header = source.slice(0, comma + 1)
  if (!header.includes(';base64')) return header + encodeURIComponent(text)
  const bytes = new TextEncoder().encode(text); let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return header + btoa(binary)
}

/** Rewrite complete values while preserving JSON formatting, comments and unrelated prose. */
export function rewriteAssetSource(asset: AssetRecord, rewrite: (value: string, key?: string) => string): string {
  const text = assetSourceText(asset); if (text === null) return asset.source
  if(asset.assetType==='script'){
    const lexed=lexRhai(text,{moduleMode:'host'}),limit=lexed.diagnostics.find(issue=>issue.code.startsWith('RHAI-LIMIT-'))
    if(limit)throw new Error(`ASSET_REFERENCE_LIMIT: ${limit.message}`)
    const patches:Array<{start:number;end:number;text:string}>=[],hostLines=new Set<number>(),tokens=lexed.tokens.filter(token=>!isRhaiTrivia(token))
    for(const token of tokens)if(token.kind==='keyword'&&token.text==='use'){
      const start=text.lastIndexOf('\n',token.span.start-1)+1,next=text.indexOf('\n',token.span.end),end=next<0?text.length:next,line=text.slice(start,end),match=/^(\s*use\s+)(["'`])([^"'`\r\n]+)\2(\s*;?\s*)$/.exec(line)
      if(!match)continue
      hostLines.add(token.span.line);const changed=rewrite(match[3])
      if(changed!==match[3]){const quote=[match[2],'"',"'",'`'].find(quote=>!changed.includes(quote));if(!quote||/[\r\n]/.test(changed))throw new Error('ASSET_REPAIR_PATH: The replacement module path has no supported literal representation.');patches.push({start,end,text:match[1]+quote+changed+quote+match[4]})}
    }
    for(let index=0;index<tokens.length;index++){
      const token=tokens[index];if(hostLines.has(token.span.line))continue
      let end=token.span.end,raw=token.text
      if(token.kind==='templateStart'){
        const tail=tokens[index+1]?.kind==='templateText'?tokens[index+2]:tokens[index+1]
        if(tail?.kind!=='templateEnd')continue
        end=tail.span.end;raw=text.slice(token.span.start,end)
      }else if(token.kind!=='string')continue
      let value:string;try{value=decodeRhaiString(raw,token.span.column)}catch{continue}
      const changed=rewrite(value);if(changed!==value)patches.push({start:token.span.start,end,text:JSON.stringify(changed)})
    }
    let changed=text
    for(const patch of patches.sort((a,b)=>b.start-a.start))changed=changed.slice(0,patch.start)+patch.text+changed.slice(patch.end)
    return changed===text?asset.source:encodeTextLike(asset.source,changed)
  }
  let result = text
  try {
    JSON.parse(text)
    const valueKeys = new Map<number, string>(), stack: Array<{ object: boolean; key: string; expectsKey: boolean }> = []
    for (const token of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:,]/g)) {
      const literal = token[0], top = stack[stack.length - 1]
      if (literal === '{' || literal === '[') stack.push({ object: literal === '{', key: top?.key ?? '', expectsKey: literal === '{' })
      else if (literal === '}' || literal === ']') stack.pop()
      else if (literal === ',' && top?.object) top.expectsKey = true
      else if (literal === ':' && top) top.expectsKey = false
      else if (literal[0] === '"') {
        if (top?.object && top.expectsKey) top.key = JSON.parse(literal) as string
        else valueKeys.set(token.index!, top?.key ?? '')
      }
    }
    result = text.replace(/"(?:\\.|[^"\\])*"/g, (literal, offset: number) => {
      if (!valueKeys.has(offset)) return literal
      const value = JSON.parse(literal) as string, changed = rewrite(value, valueKeys.get(offset))
      return changed === value ? literal : JSON.stringify(changed)
    })
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    // Complete plain references and quoted values are safe; comments are retained verbatim.
    result = text.replace(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, literal => {
      if (literal.startsWith('//') || literal.startsWith('/*')) return literal
      const quote = literal[0], raw = literal.slice(1, -1)
      if (quote === '`' && raw.includes('${')) return literal
      let value = raw
      try { if (quote === '"') value = JSON.parse(literal) } catch { return literal }
      const changed = rewrite(value)
      return changed === value ? literal : quote === '"' ? JSON.stringify(changed) : quote + changed.split('\\').join('\\\\').split(quote).join('\\' + quote) + quote
    })
    if (result === text && !/[\r\n]/.test(text) && !text.trim().includes(' ')) result = rewrite(text)
  }
  return result === text ? asset.source : encodeTextLike(asset.source, result)
}

/** Commit only after all owners have been prepared; provenance follows rewritten artifact bytes. */
export interface AssetReferenceRepair { asset: AssetRecord; source: string; fields?: Partial<AssetRecord> }
export function referenceMetadataRepairs(asset: AssetRecord, rewrite: (value: string, key?: string) => string): Partial<AssetRecord> {
  let count = 0
  const visit = (value: unknown, key: string, depth: number): unknown => {
    if (++count > ASSET_REFERENCE_LIMITS.values || depth > ASSET_REFERENCE_LIMITS.depth) throw new Error('ASSET_REFERENCE_LIMIT: Reference repair exceeds its bounded traversal budget.')
    if (typeof value === 'string') return rewrite(value, key)
    if (Array.isArray(value)) return value.map(child => visit(child, key, depth + 1))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child, key, depth + 1)]))
    return value
  }
  const fields: Partial<AssetRecord> = {}
  for (const key of ['settings','animationImport','derivedSprite','unknownFields','interchange'] as const) {
    const before = asset[key], after = visit(before, key, 0)
    if (JSON.stringify(before) !== JSON.stringify(after)) Object.assign(fields, { [key]: after })
  }
  return fields
}
export function commitAssetReferenceRepairs(changes: AssetReferenceRepair[]): number {
  const prepared = changes.map(change => { const bytes = assetSourceBytes(change.source); return { ...change, hash: sha256Bytes(bytes), bytes: bytes.length } })
  for (const { asset, source, fields, hash, bytes } of prepared) {
    Object.assign(asset, fields); asset.source = source; asset.byteLength = bytes
    if (asset.pipeline) asset.pipeline = { ...asset.pipeline, artifactHash: hash, contentHash: hash, lastValidSource: source, cacheKey: '', invalidationReason: 'Authored reference repair; importer cache invalidated.' }
  }
  return changes.length
}
