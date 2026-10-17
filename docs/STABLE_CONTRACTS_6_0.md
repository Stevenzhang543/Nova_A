# Nova_A 6.0 stable contracts

| Contract | Frozen version | Compatibility and migration |
| --- | --- | --- |
| Project | Format 2 / schema 29 | Schemas 5–28 migrate in memory, validate, canonicalize and commit only after backup. Future schemas open read-only/fail closed. |
| Rhai | API 2 | API 1 remains readable through an explicit generated compatibility map. |
| Visual Graph | Format 1 | UUID-preserving known migrations; unknown future formats fail closed. |
| Plugin | API 2 | API 1 declarative contributions normalize to API 2 and require a fresh permission review. |
| Package | Manifest 1 | Legacy metadata is normalized and re-certified; trust is never inferred. |
| Build | CLI 1 | `validate`, `import`, `test`, `build/export`, `package` and `version` remain machine-readable and deterministic. |
| Workspace | document 3 | Document 2 imports additively; unknown panels cannot alter project data. |

The 6.0 freeze permits only release-blocking, security, migration-correctness, accessibility, evidence and documentation corrections. Engine version 6.0.0 does not imply a project-schema migration. Migration tests cover current, oldest-supported and future fail-closed cases for all seven contracts.

The local candidate does not claim publisher identity, artifact signing, matching-host Linux/macOS qualification, two independent clean machines, independent browser/hardware results or a real 72-hour soak. Those are external evidence gates and remain visibly pending.

