# Safe Rhai hot reload in Nova_A 4.6

Saving a script does not directly mutate a live instance. Nova first resolves the complete module graph, performs parser/semantic/API checks, compiles the candidate, compares its exported-state contract, and prepares a transaction.

## Compatibility classes

| Class | Result |
| --- | --- |
| `compatible` | Swap at a frame boundary and copy compatible exported state. |
| `recreate` | Compile succeeds, but instances must be recreated under the asset's explicit policy. |
| `restart-required` | Component/export serialization changed incompatibly; the valid running script remains active. |
| `rejected` | Syntax, module, permission, or compile validation failed; nothing live changes. |

Removing serialized state, changing an export type, or changing an incompatible component layout cannot be silently applied. Runtime exceptions after a successful swap follow the configured exception policy and retain the previous source for rollback. The Modules detail page shows candidate hash, classification, diagnostic, timestamp, prior/candidate export layout, transaction result, and bounded per-script history.

Rollback is another validated queued transaction. Reload policy is stored per script (`preserve`, `recreate`, or `disabled`), while project settings control whether reload is globally available.

Fixtures cover compatible property/function changes, added functions, removed state, syntax failure, and deliberate runtime failure under `reference-projects/projects/script-v46-hot-reload/`. Machine-readable results are in `release-audits/v4.6.0-hot-reload-fixtures.json`.
