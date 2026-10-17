# Nova_A 26.22 runtime gaps and qualification boundaries

Capability and qualification boundary record. Release acceptance is recorded separately in packaged evidence. Retain the unresolved items in [26.21's gap register](GAP_REGISTER_26_21.md); a passing persistence corpus does not close a runtime feature gap.

| ID | Authored field / feature | Observed implementation boundary | Required closure |
|---|---|---|---|
| TEST-HOOKS-22 | `production.testing.tests[*].setup` and `.teardown` | The production normalizer stores both strings. `src/runtime/testRunner.ts#runOne` does not invoke either hook. This is distinct from Script Studio's script-test hooks. | Define hook ownership, supported function signature, setup failure and guaranteed teardown behavior; verify actual VM effects and restoration. Track with 26.25's deeper testing work. |
| TEST-FIXTURE-22 | `production.testing.tests[*].fixture` | The project runner copies this field into report metadata. It does not load the named fixture as a resource. | Keep it documented as a label, or implement explicit fixture loading/isolation with missing-resource and restoration tests before claiming that capability. |
| TEST-SEED-22 | `production.testing.tests[*].seed` | The project runner reports the selected seed but does not pass it to the gameplay seed owner. `GameplayRuntime.beginSession` resets the replay seed separately. Script Studio's test executor has a separate seed binding. | Bind the project-test seed before initialization and test actual deterministic outputs, including seed zero, retries and restoration. Do not infer execution determinism from the report field. |

26.22 fixes verified so far include pending-draft boundaries, scene navigation ownership, discrete property history, prefab canonical comparison and restoration, scalar component validation, collider replacement retention, unlimited joint values, stale merge rejection, and project-test draft preservation. Every enumerated field and public operation has a named disposition; stage-specific input/structural limits remain visible in the matrix and are not counted as passes.

The midnight-blue development panel sweep passed 1,333 visited states across three languages with 25 captures. This does not substitute for remaining palettes, conditional workflows, physical assistive technology or a frozen release run. The actual external-merge workflow passed Undo/Redo, save/reopen and exported checkpoint gameplay.

The source authority is 26.22.0. Final source/build identity and previous-release preservation are independently checked during packaging.

Additional metadata runtime findings:

| ID | Authored field | Actual boundary | Required closure |
|---|---|---|---|
| ENTITY-EDITOR-ONLY-22 | Entity.editorOnly | Serialized/hydrated and checked by authoring validation, but no entity gameplay/export consumer exists. NovaPak retains the entity and the flag. AssetRecord.editorOnly has a separate working export consumer; it does not implement entity behavior. | Define and test runtime exclusion across initial scene, additive streaming, dynamic spawn and descendants, while preserving authoring/Undo data. Do not advertise this entity switch as gameplay exclusion before that work. |
| ENTITY-PERSISTENCE-22 | Entity.runtimePersistence | Scene/Session/SaveGame/Transient values persist and are validated; no runtime policy consumer was found. The separate persistentAcrossScenes boolean is used by runtimeSceneTransition/runtimeSceneStreaming. | Bind the policy to explicit scene/session/save lifetimes and test transitions, save inclusion, spawned objects and restoration. Current policy values are metadata, not a completed lifetime implementation. |

| ID | Authored field | Actual boundary | Required closure |
|---|---|---|---|
| EVENT-SEED-22 | EventSheetDocument.deterministicSeed | The editor stores and validates 1–2147483647. createEventRandomStream implements a seeded helper, but no production caller connects the sheet's seed to gameplay execution. | Connect the sheet-owned seed to actual script execution/lifetime state and verify repeatable observable VM output before claiming per-sheet random determinism. |

The updated Inspector midnight-blue sweep again passed all 1,333 states and 25 captures after converting runtime numeric controls. It remains development evidence, not frozen-release or physical assistive-technology acceptance.

## IMPORT-TRANSCODING-22 — stored codec and platform-format intent
`src/assets/importPipeline.ts:processAssetImport` verifies and caches a Blob of the original source bytes and assigns the source hash as the artifact hash. `audioSettings.codec`, `audioSettings.quality` and platform compression/format choices affect profiles/settings/provenance but do not invoke an audio or GPU texture encoder. Retention tests must not be described as transcoding or delivered quality tests. Playback normalization gain and renderer filtering are separate executed capabilities. No existing option has been removed.

## Audit interpretation
The field matrix contains 2,854 named entries, including declaration aliases and containers. Its stage evidence limits are explicit: family-level runtime observations do not prove every value or structural combination. The public-operation inventory links 1,461 operations to observed passing suites and excludes 549 with individually reviewed reasons; exclusions retain an empty execution list. Independent effects are linked for 22 named families. These are bounded claims, not a global zero-defect certification. Local signed-bulletin tests use generated fixture keys and do not query registry advisories.
