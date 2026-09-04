/**
 * Headless mirror of the frozen Export Template 1 registry.
 *
 * Browser code owns the interactive installation state. The Build CLI cannot
 * import that reactive TypeScript module, so this deliberately small registry
 * contains only the identities required to validate a non-interactive build.
 * `verify-template-catalog.mjs` compares both registries and fails the release
 * if their stable IDs or target tuples drift.
 */
export const REGISTERED_EXPORT_TEMPLATES = Object.freeze([
  Object.freeze({ id: 'windows-x64-v1', name: 'Windows x64 player', target: 'windows', architectures: ['x86_64'], runtimeModes: ['game'], hosts: ['win32'], bundled: true }),
  Object.freeze({ id: 'windows-headless-x64-v1', name: 'Windows x64 headless server', target: 'windows', architectures: ['x86_64'], runtimeModes: ['headless-server'], hosts: ['win32'], bundled: true }),
  Object.freeze({ id: 'web-es2022-v1', name: 'Web ES2022 player', target: 'web', architectures: ['x86_64'], runtimeModes: ['game'], hosts: ['win32', 'linux', 'darwin'], bundled: true }),
  Object.freeze({ id: 'linux-x64-experimental-v1', name: 'Linux x64 matching-host player', target: 'linux', architectures: ['x86_64'], runtimeModes: ['game', 'headless-server'], hosts: ['linux'], bundled: false }),
  Object.freeze({ id: 'macos-universal-experimental-v1', name: 'macOS universal matching-host player', target: 'macos', architectures: ['x86_64', 'aarch64'], runtimeModes: ['game'], hosts: ['darwin'], bundled: false }),
  Object.freeze({ id: 'android-aarch64-gated-v1', name: 'Android aarch64 gated template', target: 'android', architectures: ['aarch64'], runtimeModes: ['game'], hosts: [], bundled: false })
])

function tuple(template, target, architecture, runtimeMode) {
  return template.target === target && template.architectures.includes(architecture) && template.runtimeModes.includes(runtimeMode)
}

export function compatibleExportTemplates(target, architecture, runtimeMode) {
  return REGISTERED_EXPORT_TEMPLATES.filter(template => tuple(template, target, architecture, runtimeMode))
}

export function defaultExportTemplateId(target, architecture, runtimeMode, host = process.platform) {
  const compatible = compatibleExportTemplates(target, architecture, runtimeMode)
  return compatible.find(template => template.bundled && template.hosts.includes(host))?.id
    ?? compatible.find(template => template.bundled)?.id
    ?? compatible[0]?.id
    ?? ''
}

function isKnownLegacyId(id, target, architecture) {
  if (!id) return true
  const aliases = new Set([
    `${target}-${architecture}-v1`,
    `${target}-${architecture === 'x86_64' ? 'x64' : architecture}-v1`,
    target === 'web' ? 'web-x64-v1' : '',
    target === 'macos' && architecture === 'aarch64' ? 'macos-arm64-v1' : ''
  ])
  return aliases.has(id)
}

/**
 * Unknown IDs are intentionally preserved so missing third-party templates
 * fail visibly instead of being silently replaced by a bundled template.
 */
export function resolveExportTemplateId(id, target, architecture, runtimeMode, host = process.platform) {
  const requested = String(id ?? '').trim()
  if (REGISTERED_EXPORT_TEMPLATES.some(template => template.id === requested)) return requested
  return isKnownLegacyId(requested, target, architecture)
    ? defaultExportTemplateId(target, architecture, runtimeMode, host)
    : requested
}

export function validateExportTemplate({ id, target, architecture, runtimeMode, host = process.platform, explicitPlayer = false }) {
  const requested = String(id ?? '').trim()
  const resolvedId = resolveExportTemplateId(requested, target, architecture, runtimeMode, host)
  const template = REGISTERED_EXPORT_TEMPLATES.find(candidate => candidate.id === resolvedId)
  const compatible = compatibleExportTemplates(target, architecture, runtimeMode)
  const available = compatible.map(candidate => candidate.id)
  const errors = []
  if (!template) {
    errors.push({
      code: 'EXPORT_TEMPLATE_NOT_REGISTERED',
      message: `Export template "${resolvedId || '(empty)'}" is not registered for ${target}/${architecture}/${runtimeMode}. ${available.length ? `Choose ${available.join(' or ')}.` : 'No compatible template is registered; install a matching template or change the target tuple.'}`
    })
    return { requested, resolvedId, template: null, migratedFrom: null, errors, warnings: [] }
  }
  if (!tuple(template, target, architecture, runtimeMode)) {
    errors.push({
      code: 'EXPORT_TEMPLATE_TUPLE_MISMATCH',
      message: `${template.name} (${template.id}) does not support ${target}/${architecture}/${runtimeMode}. ${available.length ? `Choose ${available.join(' or ')}.` : 'Install a compatible export template or change Target, Architecture, or Runtime.'}`
    })
  }
  const installedHere = template.bundled && template.hosts.includes(host)
  if (!installedHere && !(explicitPlayer && template.hosts.includes(host))) {
    errors.push({
      code: 'EXPORT_TEMPLATE_NOT_INSTALLED',
      message: `${template.name} (${template.id}) is registered but not installed for host ${host}. Install and verify that template, use its matching-host runner, or choose a locally installed target.`
    })
  }
  return {
    requested,
    resolvedId,
    template,
    migratedFrom: requested && requested !== resolvedId ? requested : null,
    errors,
    warnings: []
  }
}
