# Nova_A 26.19 delivery field and action inventory

This is a source inventory of 142 distinct template occurrences, not a claim that every possible field value was clicked. Conditional and repeated controls are identified by their binding. Real user/layout reports state the observed states separately.

## Ownership and audit routes

| Family | UI → validation → state → persistence/runtime | Acceptance and boundaries |
|---|---|---|
| Build | BuildSettingsPanel → validateBuildSettings/detectExportCapabilities → serialized build settings → gameExporter/native export | Target/architecture/template/prerequisites block before build; scene order and project values survive the actual export; clean/moved byte comparison and native build gates. Browser OS is not native capability. |
| Packages | PackageManagerPanel → review/security and full candidate solver → installed/cache/lock commit → package lifecycle notifications | Failed install/update/rollback/uninstall preserves installed state; rejected grants restored. Plugin unload follows disable/removal/version change. User confirmation, Undo and save/reopen exercised separately. |
| Collaboration | TeamWorkflowPanel → canonical bounded identity merge → reviewed plan → one history transaction → serialized/reopened/exported project | Actual -6/-4/-2 conflict, repeated choice, order/deletion, stale preview refusal and exported changed pickup. Metadata plans never imply cloud operations. |
| External files/LSP | Project watcher generations; LSP full-sync revisions and bounded framing → current document/index | Old asynchronous work cannot overwrite current state. Real stdio child and controlled file-read regressions; external native editor GUI remains unobserved. |
| Signed updates | Explicit manifest/key import → signature/channel/base/sequence checks → staged operator plan | Cancellation rechecked after awaits. No download/installation implicit. Commit/rollback bookkeeping is distinct from an atomic binary updater and disposable-machine lifecycle. |

## Template bindings

| Owner | Line | Binding / action |
|---|---:|---|
| `src/components/BuildSettingsPanel.vue` | 5 | `@click="activeTab = tab.id"` |
| `src/components/BuildSettingsPanel.vue` | 12 | `@change="applyBuildPreset(($event.target as HTMLSelectElement).value)"` |
| `src/components/BuildSettingsPanel.vue` | 13 | `v-model="buildSettings.gameName"` |
| `src/components/BuildSettingsPanel.vue` | 14 | `v-model="buildSettings.target"` |
| `src/components/BuildSettingsPanel.vue` | 15 | `v-model="buildSettings.architecture"` |
| `src/components/BuildSettingsPanel.vue` | 16 | `@change="setBuildProfile(($event.target as HTMLSelectElement).value as BuildProfile)"` |
| `src/components/BuildSettingsPanel.vue` | 17 | `v-model="buildSettings.runtimeMode"` |
| `src/components/BuildSettingsPanel.vue` | 18 | `v-model="buildSettings.outputDirectory"` |
| `src/components/BuildSettingsPanel.vue` | 19 | `v-model="buildSettings.packageIntoExecutable"` |
| `src/components/BuildSettingsPanel.vue` | 28 | `v-model="buildSettings.startupSceneUuid"` |
| `src/components/BuildSettingsPanel.vue` | 28 | `@click="move(index, -1)"` |
| `src/components/BuildSettingsPanel.vue` | 28 | `@click="move(index, 1)"` |
| `src/components/BuildSettingsPanel.vue` | 33 | `@click="applyPreset"` |
| `src/components/BuildSettingsPanel.vue` | 35 | `v-model="buildSettings.platform.identifier"` |
| `src/components/BuildSettingsPanel.vue` | 36 | `v-model="buildSettings.platform.version"` |
| `src/components/BuildSettingsPanel.vue` | 37 | `v-model="buildSettings.platform.orientation"` |
| `src/components/BuildSettingsPanel.vue` | 38 | `v-model="iconAsset"` |
| `src/components/BuildSettingsPanel.vue` | 39 | `v-model="splashAsset"` |
| `src/components/BuildSettingsPanel.vue` | 40 | `v-model="manifestAsset"` |
| `src/components/BuildSettingsPanel.vue` | 41 | `v-model="permissionText"` |
| `src/components/BuildSettingsPanel.vue` | 42 | `v-model="buildSettings.platform.signingMode"` |
| `src/components/BuildSettingsPanel.vue` | 43 | `v-model="buildSettings.platform.signingIdentity"` |
| `src/components/BuildSettingsPanel.vue` | 44 | `v-model="buildSettings.platform.notarizationProfile"` |
| `src/components/BuildSettingsPanel.vue` | 53 | `v-model="buildSettings.delivery.deterministic"` |
| `src/components/BuildSettingsPanel.vue` | 54 | `v-model="buildSettings.delivery.incremental"` |
| `src/components/BuildSettingsPanel.vue` | 55 | `v-model="buildSettings.delivery.patchManifest"` |
| `src/components/BuildSettingsPanel.vue` | 56 | `v-model="buildSettings.delivery.contentCache"` |
| `src/components/BuildSettingsPanel.vue` | 57 | `v-model="buildSettings.delivery.deltaBuilds"` |
| `src/components/BuildSettingsPanel.vue` | 58 | `v-model="buildSettings.delivery.structuredLogs"` |
| `src/components/BuildSettingsPanel.vue` | 59 | `v-model="buildSettings.delivery.crashReports"` |
| `src/components/BuildSettingsPanel.vue` | 60 | `v-model="buildSettings.delivery.stripUnusedAssets"` |
| `src/components/BuildSettingsPanel.vue` | 61 | `v-model="buildSettings.delivery.sizeReport"` |
| `src/components/BuildSettingsPanel.vue` | 62 | `v-model="buildSettings.delivery.dependencyReport"` |
| `src/components/BuildSettingsPanel.vue` | 63 | `v-model="buildSettings.delivery.debugSymbols"` |
| `src/components/BuildSettingsPanel.vue` | 64 | `v-model="buildSettings.delivery.crashSymbols"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.releaseChannel"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.exportTemplate"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.cacheMode"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.compression"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="includeRules"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="excludeRules"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.deploymentMode"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.deploymentDestination"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.signingHook"` |
| `src/components/BuildSettingsPanel.vue` | 66 | `v-model="buildSettings.delivery.notarizationHook"` |
| `src/components/BuildSettingsPanel.vue` | 67 | `v-model="buildSettings.delivery.provenance"` |
| `src/components/BuildSettingsPanel.vue` | 67 | `v-model="buildSettings.delivery.sbom"` |
| `src/components/BuildSettingsPanel.vue` | 67 | `v-model="buildSettings.delivery.webHeaders"` |
| `src/components/BuildSettingsPanel.vue` | 67 | `v-model="buildSettings.delivery.cleanMachineJob"` |
| `src/components/BuildSettingsPanel.vue` | 67 | `v-model="buildSettings.delivery.deploymentPermissionGranted"` |
| `src/components/BuildSettingsPanel.vue` | 69 | `v-model="buildSettings.delivery.telemetryEnabled"` |
| `src/components/BuildSettingsPanel.vue` | 70 | `v-model="buildSettings.delivery.telemetryEndpoint"` |
| `src/components/BuildSettingsPanel.vue` | 70 | `v-model="buildSettings.delivery.privacyPolicyUrl"` |
| `src/components/BuildSettingsPanel.vue` | 92 | `@click="openBundledManual(issue.helpTarget)"` |
| `src/components/BuildSettingsPanel.vue` | 95 | `@click="runBuild(false)"` |
| `src/components/BuildSettingsPanel.vue` | 95 | `@click="runBuild(true)"` |
| `src/components/PackageManagerPanel.vue` | 5 | `v-model="packages.offlineMode"` |
| `src/components/PackageManagerPanel.vue` | 6 | `@click="pluginToolsOpen = false; registryOpen = !registryOpen"` |
| `src/components/PackageManagerPanel.vue` | 7 | `@click="pluginToolsOpen = !pluginToolsOpen; registryOpen = false"` |
| `src/components/PackageManagerPanel.vue` | 8 | `@click="manifestInput?.click()"` |
| `src/components/PackageManagerPanel.vue` | 9 | `@change="importManifest"` |
| `src/components/PackageManagerPanel.vue` | 13 | `@click="packages.selectedStatus = tab"` |
| `src/components/PackageManagerPanel.vue` | 19 | `v-model="packages.selectedRegistry"` |
| `src/components/PackageManagerPanel.vue` | 19 | `v-model="packages.registryQuery"` |
| `src/components/PackageManagerPanel.vue` | 20 | `@click="selectedRegistryId = manifest.id"` |
| `src/components/TeamWorkflowPanel.vue` | 3 | `v-model="team.enabled"` |
| `src/components/TeamWorkflowPanel.vue` | 3 | `@change="persistTeamWorkflowSettings"` |
| `src/components/TeamWorkflowPanel.vue` | 6 | `@click="refresh"` |
| `src/components/TeamWorkflowPanel.vue` | 8 | `@click="selectedChange = change.id"` |
| `src/components/TeamWorkflowPanel.vue` | 11 | `@click="downloadNovaIgnoreFile"` |
| `src/components/TeamWorkflowPanel.vue` | 11 | `@click="downloadPreCommitHook"` |
| `src/components/TeamWorkflowPanel.vue` | 11 | `@click="downloadCiValidationTemplate"` |
| `src/components/TeamWorkflowPanel.vue` | 11 | `@click="openDiff"` |
| `src/components/TeamWorkflowPanel.vue` | 12 | `@click="incomingInput?.click()"` |
| `src/components/TeamWorkflowPanel.vue` | 12 | `@change="readIncoming"` |
| `src/components/TeamWorkflowPanel.vue` | 13 | `@click="reloadIncoming"` |
| `src/components/TeamWorkflowPanel.vue` | 13 | `@click="openMerge"` |
| `src/components/TeamWorkflowPanel.vue` | 21 | `@click="chooseConflict(conflict.id, 'ours')"` |
| `src/components/TeamWorkflowPanel.vue` | 22 | `@click="chooseConflict(conflict.id, 'theirs')"` |
| `src/components/TeamWorkflowPanel.vue` | 25 | `@click="applySemanticMerge"` |
| `src/components/TeamWorkflowPanel.vue` | 27 | `v-model="changeListName"` |
| `src/components/TeamWorkflowPanel.vue` | 27 | `v-model="changeListOwner"` |
| `src/components/TeamWorkflowPanel.vue` | 27 | `@click="createChangeList"` |
| `src/components/TeamWorkflowPanel.vue` | 31 | `v-model="repositoryPath"` |
| `src/components/TeamWorkflowPanel.vue` | 31 | `@click="initializeRepository"` |
| `src/components/TeamWorkflowPanel.vue` | 35 | `v-model="team.diffTool"` |
| `src/components/TeamWorkflowPanel.vue` | 35 | `@change="persistTeamWorkflowSettings"` |
| `src/components/TeamWorkflowPanel.vue` | 36 | `v-model="team.diffArguments"` |
| `src/components/TeamWorkflowPanel.vue` | 36 | `@change="persistTeamWorkflowSettings"` |
| `src/components/TeamWorkflowPanel.vue` | 37 | `v-model="team.mergeTool"` |
| `src/components/TeamWorkflowPanel.vue` | 37 | `@change="persistTeamWorkflowSettings"` |
| `src/components/TeamWorkflowPanel.vue` | 38 | `v-model="team.mergeArguments"` |
| `src/components/TeamWorkflowPanel.vue` | 38 | `@change="persistTeamWorkflowSettings"` |
| `src/components/TeamWorkflowPanel.vue` | 43 | `v-model="lockOwner"` |
| `src/components/TeamWorkflowPanel.vue` | 44 | `@click="acquireLock"` |
| `src/components/TeamWorkflowPanel.vue` | 44 | `@click="downloadProjectLock(project.id, lockOwner)"` |
| `src/components/TeamWorkflowPanel.vue` | 44 | `@click="releaseLock"` |
| `src/components/EcosystemStudioPanel.vue` | 5 | `@click="activeTab = tab.id"` |
| `src/components/EcosystemStudioPanel.vue` | 17 | `@change="setPluginSafeMode(($event.target as HTMLInputElement).checked)"` |
| `src/components/EcosystemStudioPanel.vue` | 18 | `@click="pluginRuntime.start()"` |
| `src/components/EcosystemStudioPanel.vue` | 18 | `@click="pluginRuntime.reload()"` |
| `src/components/EcosystemStudioPanel.vue` | 18 | `@click="pluginRuntime.stop()"` |
| `src/components/EcosystemStudioPanel.vue` | 22 | `@click="pluginRuntime.reload(manifest.id)"` |
| `src/components/EcosystemStudioPanel.vue` | 22 | `@click="pluginRuntime.unload(manifest.id)"` |
| `src/components/EcosystemStudioPanel.vue` | 31 | `@click="invoke(item)"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.id"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.name"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.version"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.publisher"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.entryPointType"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.license"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.archiveSha256"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="permissionText"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.documentationUrl"` |
| `src/components/EcosystemStudioPanel.vue` | 38 | `v-model="draft.securityUrl"` |
| `src/components/EcosystemStudioPanel.vue` | 39 | `@click="downloadSigningRequest"` |
| `src/components/EcosystemStudioPanel.vue` | 39 | `@click="certifyDraft"` |
| `src/components/EcosystemStudioPanel.vue` | 43 | `v-model="publicKey"` |
| `src/components/EcosystemStudioPanel.vue` | 43 | `v-model="signature"` |
| `src/components/EcosystemStudioPanel.vue` | 44 | `@click="verifySignature"` |
| `src/components/EcosystemStudioPanel.vue` | 52 | `@click="downloadRegistry"` |
| `src/components/EcosystemStudioPanel.vue` | 52 | `@click="registryInput?.click()"` |
| `src/components/EcosystemStudioPanel.vue` | 52 | `@change="readRegistry"` |
| `src/components/EcosystemStudioPanel.vue` | 58 | `@click="templateInput?.click()"` |
| `src/components/EcosystemStudioPanel.vue` | 58 | `@change="readTemplate"` |
| `src/components/EcosystemStudioPanel.vue` | 65 | `v-model="deliveryPipelineState.contentCacheEnabled"` |
| `src/components/EcosystemStudioPanel.vue` | 65 | `v-model="deliveryPipelineState.deltaBuildsEnabled"` |
| `src/components/EcosystemStudioPanel.vue` | 65 | `@click="refreshKeys"` |
| `src/components/EcosystemStudioPanel.vue` | 66 | `v-model="connectorDraft.name"` |
| `src/components/EcosystemStudioPanel.vue` | 66 | `v-model="connectorDraft.kind"` |
| `src/components/EcosystemStudioPanel.vue` | 66 | `v-model="connectorDraft.destination"` |
| `src/components/EcosystemStudioPanel.vue` | 66 | `@click="addConnector"` |
| `src/components/EcosystemStudioPanel.vue` | 67 | `@click="grantConnector(connector)"` |
| `src/components/EcosystemStudioPanel.vue` | 67 | `@click="prepare(connector.id)"` |
| `src/components/EcosystemStudioPanel.vue` | 72 | `@click="refreshSolver"` |
| `src/components/EcosystemStudioPanel.vue` | 73 | `v-model="securityPublicKey"` |
| `src/components/EcosystemStudioPanel.vue` | 73 | `@click="securityInput?.click()"` |
| `src/components/EcosystemStudioPanel.vue` | 73 | `@change="readSecurityBulletin"` |
| `src/components/EcosystemStudioPanel.vue` | 74 | `@change="setUpdaterOptIn(($event.target as HTMLInputElement).checked)"` |
| `src/components/EcosystemStudioPanel.vue` | 74 | `v-model="ecosystemShippingState.updaterChannel"` |
| `src/components/EcosystemStudioPanel.vue` | 74 | `@click="updateInput?.click()"` |
| `src/components/EcosystemStudioPanel.vue` | 74 | `@change="readUpdateManifest"` |

## Programmer and user evidence

Run verify-v26.19-delivery, lsp, save-recovery and reproducibility for programmer regressions; delivery-user and package-user for visible operations, with --layout for locale/theme/scale/width matrices. Current candidate reports identify source version and development status; all release evidence is regenerated after source freeze. Matching-host/mobile/signing/disposable installation remain pending because the required environments were not supplied.
