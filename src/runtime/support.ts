import { reactive } from 'vue'
import { buildHistory, buildSettings } from './buildSettings'
import { feedbackDiagnostics } from './editorFeedback'
import { faultDiagnostics } from './faultCenter'
import { packageState } from './packages'
import { PLATFORM_SUPPORT_MATRIX } from './platformSupport'
import { recoveryDiagnostics } from './recovery'
import { stableContractDiagnostics } from './stableContracts'

export interface KnownIssue { severity: 'S2' | 'S3'; area: string; issue: string; workaround: string }
export const KNOWN_ISSUES: readonly KnownIssue[] = Object.freeze([
  Object.freeze({ severity: 'S2', area: 'Linux/macOS qualification', issue: 'Linux and macOS do not yet have the clean-machine evidence required for a stable tier.', workaround: 'Use the platform badge and run the supplied CI/reference matrix on matching hardware.' }),
  Object.freeze({ severity: 'S2', area: 'Package trust', issue: 'Stable accepts only packages verified by the pinned Nova_A trust record.', workaround: 'Use Beta or Development only for isolated authoring; publish signed packages after validation.' }),
  Object.freeze({ severity: 'S3', area: 'Large worlds', issue: 'World streaming memory values are author estimates rather than operating-system allocation measurements.', workaround: 'Use conservative estimates and compare Profiler captures on target hardware.' }),
  Object.freeze({ severity: 'S3', area: 'Networking', issue: 'The optional networking package remains Experimental.', workaround: 'Do not treat networking as a 4.0 core stability guarantee.' })
])

export type NovaReleaseChannel = 'stable' | 'beta' | 'development'
export const RELEASE_CHANNELS = Object.freeze([
  Object.freeze({ id: 'stable' as const, label: 'Stable', purpose: 'Production projects', policy: 'Security, S0/S1, migration and compatibility fixes only.', cadence: 'Patch releases after qualification.' }),
  Object.freeze({ id: 'beta' as const, label: 'Beta', purpose: 'Release-candidate validation', policy: 'Feature-complete candidates with documented S2 boundaries.', cadence: 'Time-boxed before a Stable release.' }),
  Object.freeze({ id: 'development' as const, label: 'Development', purpose: 'Extension and engine contributors', policy: 'Unstable; backups required and no production compatibility promise.', cadence: 'Continuous integration snapshots.' })
])
export const KNOWN_ISSUES_FEED = Object.freeze({ format: 'nova-known-issues-feed', version: 1, release: '4.0.0', updatedAt: '2026-08-19', source: 'bundled-offline', issues: KNOWN_ISSUES })

export const supportState = reactive({
  releaseChannel: 'stable' as NovaReleaseChannel,
  includeProjectIdentifiers: false,
  includeFilePaths: false,
  privacyReviewed: false,
  crashReportingOptIn: false,
  lastExport: '',
  lastCrashExport: ''
})

function download(name: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' })), anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function diagnosticBundle(): Record<string, unknown> {
  const sanitize = (source: string) => supportState.includeFilePaths ? JSON.parse(source) : JSON.parse(source.replace(/[A-Za-z]:\\[^"\n]+|\/(?:Users|home)\/[^"\n]+/g, '[redacted-path]'))
  return {
    format: 'nova-diagnostic-bundle', version: 2, engineVersion: '4.0.0', releaseChannel: supportState.releaseChannel, generatedAt: new Date().toISOString(), privacy: { projectIdentifiers: supportState.includeProjectIdentifiers, filePaths: supportState.includeFilePaths, uploaded: false },
    contracts: JSON.parse(stableContractDiagnostics()), platforms: PLATFORM_SUPPORT_MATRIX,
    build: { target: buildSettings.target, profile: buildSettings.profile, recent: buildHistory.slice(0, 10).map(item => ({ ...item, outputPath: supportState.includeFilePaths ? item.outputPath : '[redacted-path]' })) },
    packages: { installed: packageState.installed.map(item => ({ id: item.manifest.id, version: item.manifest.version, securityStatus: item.securityStatus, enabled: item.enabled })), quarantine: packageState.quarantine },
    faults: sanitize(faultDiagnostics()), tasks: sanitize(feedbackDiagnostics()), recovery: sanitize(recoveryDiagnostics()), knownIssuesFeed: KNOWN_ISSUES_FEED
  }
}

export function exportDiagnosticBundle(): boolean {
  if (!supportState.privacyReviewed) return false
  const source = `${JSON.stringify(diagnosticBundle(), null, 2)}\n`, name = `Nova_A-4.0.0-diagnostics-${new Date().toISOString().slice(0, 10)}.json`
  download(name, source); supportState.lastExport = name; return true
}

export function releaseHealthSnapshot(): Record<string, unknown> {
  const quarantined = packageState.quarantine.length
  const fatalFaults = (JSON.parse(faultDiagnostics()) as { entries?: Array<{ severity?: string }> }).entries?.filter(item => item.severity === 'fatal').length ?? 0
  return {
    format: 'nova-release-health', version: 1, engineVersion: '4.0.0', channel: supportState.releaseChannel,
    generatedAt: new Date().toISOString(), openS0: 0, openS1: fatalFaults, openS2: KNOWN_ISSUES.filter(issue => issue.severity === 'S2').length,
    packageQuarantine: quarantined, recoveryAvailable: true, status: fatalFaults ? 'attention' : 'healthy'
  }
}

export function exportCrashReportPackage(): boolean {
  if (!supportState.crashReportingOptIn || !supportState.privacyReviewed) return false
  const report = {
    format: 'nova-crash-report-package', version: 1, engineVersion: '4.0.0', createdAt: new Date().toISOString(),
    consent: { optIn: true, privacyReviewed: true, uploaded: false }, diagnostics: diagnosticBundle(), releaseHealth: releaseHealthSnapshot()
  }
  const name = `Nova_A-4.0.0-crash-report-${new Date().toISOString().replace(/[:.]/g, '-')}.nova-crash.json`
  download(name, `${JSON.stringify(report, null, 2)}\n`); supportState.lastCrashExport = name; return true
}
