import { createTextAsset, readTextAsset, updateTextAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { scheduleJob } from './jobScheduler'

export type DataFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'json'
export interface DataFieldSchema { name: string; type: DataFieldType; required: boolean; default: string | number | boolean | null }
export interface DataSchemaResource { format: 'nova-data-schema'; version: 1; name: string; schemaVersion: number; keyField: string; fields: DataFieldSchema[] }
export interface DataTableResource { format: 'nova-data-table'; version: 1; schemaAsset: string | null; rows: Array<Record<string, unknown>>; source: 'editor' | 'csv' | 'json' | 'database' }
export interface DataValidationIssue { row: number; field: string; message: string }

function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function safeName(value: unknown, fallback: string): string { const result = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80) : ''; return result || fallback }

export function normalizeDataSchema(value: unknown): DataSchemaResource {
  const source = object(value), fieldTypes: DataFieldType[] = ['string', 'number', 'integer', 'boolean', 'json'], seen = new Set<string>()
  const fields = (Array.isArray(source.fields) ? source.fields : []).slice(0, 512).flatMap((raw, index) => {
    const field = object(raw), name = safeName(field.name, `field_${index + 1}`)
    if (seen.has(name)) return []; seen.add(name)
    const type = fieldTypes.includes(field.type as DataFieldType) ? field.type as DataFieldType : 'string'
    const fallback = field.default
    return [{ name, type, required: field.required === true, default: fallback === null || ['string', 'number', 'boolean'].includes(typeof fallback) ? fallback as string | number | boolean | null : null }]
  })
  if (!fields.length) fields.push({ name: 'id', type: 'string', required: true, default: '' })
  const keyField = safeName(source.keyField, fields[0].name)
  return { format: 'nova-data-schema', version: 1, name: safeName(source.name, 'DataSchema'), schemaVersion: Math.min(65_535, Math.max(1, Math.round(Number(source.schemaVersion) || 1))), keyField: fields.some(field => field.name === keyField) ? keyField : fields[0].name, fields }
}

function coerce(value: unknown, field: DataFieldSchema): unknown {
  if (value === undefined || value === null || value === '') return field.default
  if (field.type === 'string') return String(value).slice(0, 100_000)
  if (field.type === 'boolean') return value === true || String(value).toLowerCase() === 'true' || String(value) === '1'
  if (field.type === 'integer') { const number = Number(value); return Number.isFinite(number) ? Math.round(number) : value }
  if (field.type === 'number') { const number = Number(value); return Number.isFinite(number) ? number : value }
  if (typeof value === 'string') { try { return JSON.parse(value) } catch { return value } }
  return value
}

export function validateDataRows(rowsValue: unknown, schemaValue: unknown): { rows: Array<Record<string, unknown>>; issues: DataValidationIssue[] } {
  const schema = normalizeDataSchema(schemaValue), source = Array.isArray(rowsValue) ? rowsValue : [], rows: Array<Record<string, unknown>> = [], issues: DataValidationIssue[] = [], keys = new Set<string>()
  for (const [rowIndex, raw] of source.slice(0, 100_000).entries()) {
    const input = object(raw), row: Record<string, unknown> = {}
    for (const field of schema.fields) {
      const value = coerce(input[field.name], field)
      if (field.required && (value === null || value === undefined || value === '')) issues.push({ row: rowIndex + 1, field: field.name, message: 'Required value is missing' })
      if ((field.type === 'number' || field.type === 'integer') && typeof value !== 'number') issues.push({ row: rowIndex + 1, field: field.name, message: `${field.type} value is invalid` })
      row[field.name] = value
    }
    const key = String(row[schema.keyField] ?? '')
    if (key && keys.has(key)) issues.push({ row: rowIndex + 1, field: schema.keyField, message: 'Key value is duplicated' })
    if (key) keys.add(key)
    rows.push(row)
    if (issues.length >= 2_000) break
  }
  return { rows, issues }
}

export function normalizeDataTable(value: unknown): DataTableResource {
  const source = object(value), sources = ['editor', 'csv', 'json', 'database'] as const
  return { format: 'nova-data-table', version: 1, schemaAsset: typeof source.schemaAsset === 'string' ? source.schemaAsset.slice(0, 512) : null, rows: (Array.isArray(source.rows) ? source.rows : []).slice(0, 100_000).map(object), source: sources.includes(source.source as typeof sources[number]) ? source.source as typeof sources[number] : 'editor' }
}

export function createDataSchemaAsset(name = 'Data Schema'): AssetRecord {
  const schema = normalizeDataSchema({ name, fields: [{ name: 'id', type: 'string', required: true, default: '' }] })
  return createTextAsset(name, 'dataSchema', JSON.stringify(schema, null, 2), 'Assets/Data/Schemas')
}

export function createDataTableAsset(name = 'Data Table', schemaAsset: string | null = null): AssetRecord {
  const table: DataTableResource = { format: 'nova-data-table', version: 1, schemaAsset, rows: [], source: 'editor' }
  return createTextAsset(name, 'dataTable', JSON.stringify(table, null, 2), 'Assets/Data/Tables')
}

export function readDataSchema(reference: string | null | undefined): DataSchemaResource | null { const source = readTextAsset(reference); if (!source) return null; try { return normalizeDataSchema(JSON.parse(source)) } catch { return null } }
export function readDataTable(reference: string | null | undefined): DataTableResource | null { const source = readTextAsset(reference); if (!source) return null; try { return normalizeDataTable(JSON.parse(source)) } catch { return null } }
export function saveDataSchema(reference: string, schema: DataSchemaResource): boolean { return updateTextAsset(reference, JSON.stringify(normalizeDataSchema(schema), null, 2)) }
export function saveDataTable(reference: string, table: DataTableResource): boolean { return updateTextAsset(reference, JSON.stringify(normalizeDataTable(table), null, 2)) }

export async function importDataText(source: string, type: 'csv' | 'json' | 'database', schema: DataSchemaResource): Promise<{ rows: Array<Record<string, unknown>>; issues: DataValidationIssue[] }> {
  let rows: unknown[]
  if (type === 'csv') {
    const parsed = await scheduleJob<string[][]>('parseCsv', source).promise
    const [headers = [], ...values] = parsed
    rows = values.map(columns => Object.fromEntries(headers.map((header, index) => [safeName(header, `column_${index + 1}`), columns[index] ?? ''])))
  } else {
    const parsed = await scheduleJob<unknown>('parseJson', source).promise
    const document = object(parsed)
    const candidate = Array.isArray(parsed) ? parsed : Array.isArray(document.rows) ? document.rows : Array.isArray(document.records) ? document.records : []
    rows = candidate
  }
  return validateDataRows(rows, schema)
}

export function generateTypedDataAccessors(schemaValue: unknown): string {
  const schema = normalizeDataSchema(schemaValue), typeName = schema.name.replace(/[^a-zA-Z0-9_]/g, '_')
  const typeFor = (field: DataFieldSchema) => field.type === 'string' ? 'string' : field.type === 'boolean' ? 'boolean' : field.type === 'json' ? 'unknown' : 'number'
  const fields = schema.fields.map(field => `  ${field.name}${field.required ? '' : '?'}: ${typeFor(field)}`).join('\n')
  return `// Generated by Nova_A 2.8 from schema v${schema.schemaVersion}.\nexport interface ${typeName} {\n${fields}\n}\n\nexport function index${typeName}(rows: readonly ${typeName}[]): ReadonlyMap<string, ${typeName}> {\n  return new Map(rows.map(row => [String(row.${schema.keyField}), row]))\n}\n`
}
