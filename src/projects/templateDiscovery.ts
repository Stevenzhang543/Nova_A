import type { ProjectTemplateCategory, ProjectTemplateDescriptor, ProjectTemplateDifficulty } from './templates'

export interface TemplateDiscoveryFilters {
  category: ProjectTemplateCategory | 'all'
  difficulty: ProjectTemplateDifficulty | 'all'
  query: string
  sort: 'catalog' | 'name' | 'time' | 'newest'
  locale: string
}

/** Search every word in displayed and original metadata, without changing the catalog. */
export function discoverTemplates(catalog: readonly ProjectTemplateDescriptor[], filters: TemplateDiscoveryFilters, display: (template: ProjectTemplateDescriptor) => string): ProjectTemplateDescriptor[] {
  const words = filters.query.toLocaleLowerCase(filters.locale).split(/\s+/u).filter(Boolean)
  const results = catalog.filter(template => {
    if (filters.category !== 'all' && template.category !== filters.category) return false
    if (filters.difficulty !== 'all' && template.difficulty !== filters.difficulty) return false
    const searchable = `${template.id} ${template.name} ${template.description} ${template.features.join(' ')} ${template.tags.join(' ')} ${display(template)}`.toLocaleLowerCase(filters.locale)
    return words.every(word => searchable.includes(word))
  })
  if (filters.sort === 'name') results.sort((a, b) => display(a).localeCompare(display(b), filters.locale))
  if (filters.sort === 'time') results.sort((a, b) => a.setupMinutes - b.setupMinutes)
  if (filters.sort === 'newest') results.sort((a, b) => (b.introduced ?? '').localeCompare(a.introduced ?? '', undefined, { numeric: true }))
  return results
}
