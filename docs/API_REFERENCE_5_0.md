# Nova_A 5.0 public API reference index

Rhai Runtime API v2, WASM Plugin API 2, Package Manifest 1, Build Manifest/Provenance 1, CLI 1, Project Format 2 schema 29, workspace document 3, diagnostic bundle 3, and the eleven-file artifact naming contract are frozen for 5.x. The generated Rhai signatures, lifetimes, determinism, permissions, examples, and deprecations remain in `API_REFERENCE_4_0.md` and the Script Studio API browser; this index establishes their 5.0 contract status.

New Rhai assets use API v2. API v1 appears only on imported compatibility records and must be migrated. CLI machine output is JSON Lines with stable exit behavior. Public records use finite numeric values, stable UUID/GUID references, deterministic ordering, and explicit versions. A future API addition must include lifecycle state, authoring/runtime/serialization behavior, docs, contract tests, migration impact, and supported-platform evidence before it can be Stable.
