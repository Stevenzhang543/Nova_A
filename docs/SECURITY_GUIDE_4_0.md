# Nova_A 4.0 security and permissions guide

Stable package installation requires a valid reverse-domain ID, SemVer, engine/API range, one entry type, dependency hashes, archive SHA-256, trusted signature record, declared permissions, and deterministic lock resolution. Changed permissions require review. Invalid or modified content is blocked and quarantined; Safe Mode preserves serialized data while disabling execution.

Treat scripts, shaders, packages, imported archives, project JSON, file paths, URLs, and build manifests as untrusted. Nova_A rejects path traversal, future schema mutation, malformed IDs/ranges, non-finite physics values, missing dependencies, cycles, and incompatible engines. Native packages are never implied safe by a UI label.

Telemetry is disabled by default. Diagnostic/crash files are created locally only after privacy review and explicit consent; Nova_A never uploads them automatically. Remove identifiers and paths unless required, inspect the file, then use a trusted channel. Keep HTTPS, CSP, minimal permissions, dependency locks, SBOM, licenses, signing keys, and provenance in release review.
