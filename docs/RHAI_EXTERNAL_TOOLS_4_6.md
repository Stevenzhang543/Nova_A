# External Rhai tools for Nova_A 4.6

Run `pnpm script:lsp -- --index .nova/script-index-v2.json` and communicate through newline-delimited JSON on standard input/output. Protocol v2 supports analyze, semantic completion, signature help, hover, diagnostics, document/workspace symbols, definition, references, rename edits, code actions, formatting, imports/modules, cancellation, and shutdown. URIs are project-relative and source locations are one-based.

The server writes its index through a temporary file and atomic rename. On corrupt, missing, old-API, or incompatible index data it starts empty and rebuilds; it never treats stale symbols as current. The in-editor equivalent uses a checksum-validated temporary/committed pair and rebuilds after API changes.

Generated metadata stubs are in `docs/NOVA_RHAI_API_V2_STUBS.rhai`; the canonical machine-readable contract is `docs/RHAI_API_V2_MANIFEST.json`. Stubs are editor metadata only and are never executed or shipped in a player.

Use `docs/RHAI_DEBUG_PROTOCOL_V2.md` for debug-adapter integration. External editors should open a source URI at the supplied line/column and delegate runtime control to the authenticated, loopback-only debug protocol rather than starting a second engine instance.
