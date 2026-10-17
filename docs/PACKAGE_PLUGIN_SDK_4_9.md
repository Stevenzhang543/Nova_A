# Nova_A 4.9 Package and Plugin SDK

Package manifest version 1 and Plugin API 2 are frozen for the 5.0 release candidate. Packages are data until the complete installation review passes.

## Required package identity

A Stable package declares an exact ID/version, engine and API range, entry-point type, publisher, publisher trust, license, provenance, permissions, dependencies, dependency SHA-256 values, archive SHA-256, signature, documentation, security URL and vulnerability policy. Stable resolution uses `Packages.lock`; mutable ranges are never resolved during a release build.

Installation order is fail closed:

1. Select a trusted registry or verified offline mirror.
2. Normalize and validate the manifest.
3. Verify publisher identity, archive digest, signature, engine/API compatibility and dependency locks.
4. Display license, provenance and requested permissions.
5. Obtain explicit user approval.
6. Install disabled if native, uncertified or quarantined; otherwise enable only the reviewed permissions.

Critical/High vulnerability findings, tampering, missing provenance, missing license, dependency conflicts, permission denial and malicious archive paths block execution. The cache verifier quarantines failures. Updates preserve rollback history and new permissions require a new review.

## Plugin API 2

Plugins are sandboxed WebAssembly. The host exposes only declared permissions and contribution kinds. Filesystem, process and arbitrary network access are not part of Plugin API 2. Safe Mode prevents all third-party startup. Certification states are `certified`, `compatible`, and `uncertified`; only evidence-backed status may be shown.

Use `reference-projects/projects/package-v49-extension-sdk` for a manifest, contribution fixture, denied-permission case, safe-mode case and contract-test controls.
