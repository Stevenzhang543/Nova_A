# Nova_A 26.06 output and template reliability contract

Nova_A 26.06 keeps Build CLI 1, Project Format 2/schema 29, the `.nova`/`.json` authoring formats, Web folder output, and native single-file/player-plus-pack output. This release does not silently invent export-template IDs. Interactive Build Settings and the headless CLI use the same six-entry Export Template 1 registry and the catalog verifier fails if those mirrors drift.

## Registered template behavior

| Target tuple | Stable template | Local status on Windows |
|---|---|---|
| Web / x86_64 / game | `web-es2022-v1` | bundled |
| Windows / x86_64 / game | `windows-x64-v1` | bundled |
| Windows / x86_64 / headless server | `windows-headless-x64-v1` | bundled |
| Linux / x86_64 / game or server | `linux-x64-experimental-v1` | matching-host external |
| macOS / x86_64 or aarch64 / game | `macos-universal-experimental-v1` | matching-host external |
| Android / aarch64 / game | `android-aarch64-gated-v1` | optional SDK/template gate |

Changing target, architecture, or runtime mode immediately selects a compatible registered template. An unknown custom ID is preserved and reported as `EXPORT_TEMPLATE_NOT_REGISTERED`; it is never replaced silently. Only known historic synthesized aliases migrate, and the build report records `templateMigratedFrom`.

## Validation and output boundaries

- Scene order is normalized without losing scenes. Missing scene UUIDs and a missing startup scene stop before packaging with the exact offending IDs and a repair action.
- Package paths reject traversal, absolute paths, empty segments, and case-insensitive duplicates.
- A missing disk asset names the asset and resolved path and instructs the creator to reimport, repair, or embed it.
- Every launcher template must pass schema, static Rhai, WASM Rhai, accessibility, Build Settings, deterministic NovaPak create/parse/recreate, Web output, and Windows portable structural packaging checks.
- An unchanged second build must keep the same build ID and produce cache hits. `clean` rewrites current outputs, removes only stale files named by the preceding valid build report, and reports `rewrite-current-remove-stale-report-owned-preserve-untracked`. It never recursively clears the destination and deliberately preserves unrelated creator files.
- Release reports retain target, architecture, runtime, profile, stable template ID/version, build ID, files, provenance, SBOM, dependency/size/deployment reports, and an empty diagnostics array on success.
- A headless structural Windows fixture proves package/footer assembly but does **not** claim that a signed production player launched. Signed player launch, matching-host Linux/macOS, Android SDK/device, and browser-matrix evidence remain external gates.

Run `pnpm verify:templates` and `pnpm verify:v26.06:output`. `release-audits/template-catalog-verification.json` covers catalog/package integrity; `release-audits/v26.06-template-output.json` covers all twenty supported templates across Web and Windows portable packaging. Build the real release player before `pnpm release:v26.06`.

## Release qualification order

Run the release gates from the repository root in this order. Use `pnpm run audit` exactly; plain `pnpm audit` invokes the package-registry vulnerability command instead of Nova_A's project audit.

```powershell
pnpm references:v26.06
pnpm manual:v26.06
pnpm inventory:v26.06
pnpm run audit
cargo fmt --all -- --check
cargo test --workspace --all-targets
pnpm build
pnpm tauri build
pnpm qualify:v26.06:layout
pnpm benchmark:v26.06
pnpm stability:v26.06
pnpm verify:v26.06:windows
pnpm evidence:v26.06
pnpm release:v26.06
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release-package.ps1 -Version 26.06 -MachineVersion 26.6.0
```

Generation comes first so the manual, inventory, and reference are the files actually audited. The Web build must precede browser qualification; the native build must precede Windows smoke; all reports and both builds must precede evidence assembly; evidence must precede exact-artifact packaging. Any nonzero command blocks the release. Do not reuse an earlier-version report to satisfy a 26.06 gate.

## Source-snapshot packaging

The release packager accepts a clean Git commit, a dirty Git working-tree snapshot, or a reviewed filesystem source snapshot. A clean checkout records `git-commit`; a dirty checkout records the base commit plus `git-working-tree` so packaged uncommitted edits are never represented as that commit alone. A source snapshot records `sourceCommit: unavailable-source-snapshot` and `sourceState: filesystem-snapshot`; it never fabricates a commit. Generated folders, dependencies, repository metadata, private-key extensions, nested staging output, and release evidence are excluded from the source archive.

The release root is still exactly eleven artifacts: portable EXE, MSI, setup EXE, Web ZIP, source ZIP, reference-project ZIP, evidence ZIP, release notes, edit ledger, license, and `SHA256SUMS.txt`. The checksum manifest contains exactly ten non-circular entries. `package-release.ps1` invokes `verify-release-package.ps1` before returning, so the exact artifact set, checksums, evidence, reference project, Web archive and portable product version are all release-blocking.
