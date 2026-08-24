# Nova_A 4.2 schema compatibility matrix

| Input | Open policy | Mutation policy | Result |
| --- | --- | --- | --- |
| Schemas 5–28 | Guided migration only | Dry run → report → backup → verified transaction | Schema 29 / engine 4.2.0 |
| Schema 29, older engine | Compatibility seal when required | Same backup/validation/rollback path | Schema remains 29 |
| Schema 29 / 4.2.0 | Direct validated open | No migration; deterministic re-save optional | Byte-stable schema 29 |
| Schema 1–4 | Outside guaranteed public range | Block unless an explicit legacy importer proves validity | No silent mutation |
| Schema 30+ | Future version | Block before mutation | Open with a newer editor |
| Format major >2 or unknown named format | Incompatible | Block before mutation | No downgrade guess |
| Malformed JSON / duplicate identity / unsafe path | Invalid | Repair preview or block, depending on ambiguity | Actionable validation report |

Every integer schema from 5 through 29 has `reference-projects/migrations/schema-NN/pre-migration.nova` and `expected-migrated.nova`. The pinned Rust migration authority must produce the expected bytes twice, validate the result, preserve the unknown golden marker, and resolve all fixture references. Results are recorded in `migration-results.json` and release evidence.

Public contracts stay unchanged: Project Format 2/schema 29, Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1. Engine compatibility remains `>=3.9.0,<5.0.0` where declared by current projects.
