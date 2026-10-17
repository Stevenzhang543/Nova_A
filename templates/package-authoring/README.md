# Nova_A package authoring template

1. Choose exactly one entry-point type: editor, build, importer, runtime, or template.
2. Declare semantic package and engine/API compatibility ranges.
3. Declare every capability permission and lock every dependency to its archive SHA-256.
4. Build a deterministic archive, replace sha256, and obtain a registry signature.
5. Run pnpm package:validate -- --manifest templates/package-authoring/manifest.json --jsonl.
6. Test install, offline lock resolution, permission change, rollback, quarantine, and safe mode before publishing.

Stable refuses an unverified archive. Preview may be used only in an isolated authoring project and does not confer trust.
