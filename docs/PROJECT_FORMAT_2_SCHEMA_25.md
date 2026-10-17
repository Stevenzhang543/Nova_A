# Project Format 2 — schema 25

Schema 25 is the Nova_A 3.5 scripting-contract migration. It is additive and preserves all schema 5–24 projects.

Script asset metadata now records API version 1, detailed persistent breakpoints, discovered tests, project package identity/dependencies, Preserve/Recreate/Disabled hot-reload policy, editor-visible signal connections, bounded recovery source, and the last-saved content hash. Legacy numeric breakpoint lines remain authoritative compatibility input.

Project scripting settings add API version, hot reload, break-on-runtime-error, deterministic test seed, and the documented external-editor protocol switch. Migration fills missing values, retains unknown fields, validates all string/count/range bounds, and never rewrites a future schema.

Release builds still strip editor-only script metadata and disable the debugger. Authored script properties marked `serialize=false` do not enter project/component persistence.
