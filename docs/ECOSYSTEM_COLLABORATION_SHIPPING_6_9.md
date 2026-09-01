# Nova_A 6.9 ecosystem, collaboration, and shipping

Nova_A 6.9 completes the local-first path from a reviewed extension to a release candidate. Project Format 2/schema 29, Package Manifest 1, Plugin API 2, Build CLI 1, Rhai API 2, Visual Graph 1, Network Protocol 2, and Workspace document 3 remain frozen. Every new record is optional, bounded, canonical, and deterministic. No package, updater, deployment connector, or collaboration feature performs an implicit network operation.

## Registry publisher CLI

The publisher is `scripts/nova-package-publisher.mjs` (`pnpm package:publisher`). It has three local-only commands:

1. `pack --root DIR --manifest FILE --out FILE` walks one contained root, rejects symlinks, traversal, absolute paths, case-insensitive duplicates, hidden executables, more than 50,000 files, files above 256 MiB, and expanded content above 512 MiB. It sorts paths, uses store mode, consumes `SOURCE_DATE_EPOCH`, hashes each file, and writes a canonical `.nova-package` envelope.
2. `validate --archive FILE --json` recomputes every content, size, path, and canonical archive digest without executing package content.
3. `mirror ARCHIVE... --out DIR` creates a deterministic offline `registry.json`. It never downloads or publishes anything.

The manifest must declare engine/API compatibility, exact dependency digests, permissions, license, provenance, publisher, documentation, security reporting, and vulnerability policy. The CLI never requests, stores, or exports a private key. Sign canonical requests in reviewed external key infrastructure, then verify the public-key signature in Package Lab.

## Solver and sandbox diagnostics

The Package Manager uses one deterministic dependency solver. It visits sorted root packages and sorted dependency IDs, prefers the highest already-installed satisfying version, verifies the exact dependency digest, detects cycles, verifies engine/API compatibility, and runs the trust/revocation/vulnerability policy before writing `Packages.lock`. Every selected, reused, and blocked decision appears in Ecosystem Studio → Shipping. A blocked solve never replaces the current lock.

Package archives are data-only. JavaScript/WASM contributions remain bounded by Plugin API permissions. Native binaries cannot enter through the in-process browser; they require Native ABI 1 sidecar review, per-permission grants, and an explicit launch outside package installation.

## Trust, revocation, and vulnerability response

Stable installation requires a pinned registry, SHA-256 archive identity, a verified official or Ed25519 publisher signature, dependency hashes, license, provenance, and compatibility metadata. A security bulletin is accepted only when:

- its Ed25519 signature matches the public key supplied through the explicit import workflow;
- `signedBy` matches the SHA-256 fingerprint of that exact public key;
- its sequence is newer than the last accepted sequence;
- every revocation and advisory is well formed and bounded.

Revoked versions are disabled and quarantined immediately. Critical/High advisories block under the default policy; Low/Moderate advisories warn. The user can inspect the advisory, repair by updating or rolling back to a verified unaffected version, then rerun cache and solver verification. Nova_A never fetches advisory data by itself.

## Signed updater and rollback

The updater architecture is disabled by default. Opting in only enables signed-manifest staging; it does not contact the network. A staged manifest needs the selected channel, a newer semantic version, a monotonic anti-replay sequence, HTTPS artifact location, byte bound, SHA-256, Ed25519 signature, and matching key fingerprint. Staging returns a non-executable plan with `implicitNetworkOperation=false` and `explicitNetworkRequired=true`.

An operator/native installer must explicitly download the artifact, verify its digest, and perform atomic replacement. A mismatched digest cannot commit. The previous release identity is retained for rollback. Package updates use the same review/permission/hash policy and retain five verified rollback manifests.

## Change lists, ownership, and semantic merge

Team Workflow is still opt-in and local-first. Refresh computes semantic scene, asset, resource, settings, package, and project changes. A change list captures a named owner, deterministic fingerprint, selected semantic changes, and matching notes. CODEOWNERS-style rules mark a list ready only when its owner covers every governed path. Binary assets keep explicit advisory locks.

Importing another `.nova` creates a three-way plan from saved base, current project, and incoming project. Independent object properties, scenes, graph assets, settings, and project fields auto-merge. Same-property edits produce a conflict with exact semantic path and kind. The user chooses “Keep ours” or “Take theirs” for every conflict; application is disabled while any item is unresolved. The completed result passes through canonical project validation before loading. External merge tools remain optional and receive temporary base/ours/theirs files only after an explicit action.

## Release shipping

Build Delivery retains deterministic manifests, content hashes, cache keys, patch manifests, CycloneDX SBOM, provenance, secure Web headers, symbols, and crash-reporting guidance. Signing and notarization fields are hooks: Nova_A records commands but does not run external signing or access identities implicitly.

Matching-host jobs are explicit:

| Host | Target | Local status |
|---|---|---|
| Windows x64 | Windows editor/player, MSI, NSIS, portable | local-ready; publisher signature external |
| Ubuntu x64 | Linux player/package | pending matching-host evidence |
| macOS arm64 | macOS app/sign/notarize | pending matching-host evidence |

The release root contains exactly eleven artifacts: portable EXE, MSI, setup EXE, Web ZIP, source ZIP, reference-project ZIP, evidence ZIP, release notes, edit ledger, license, and SHA256SUMS (ten non-circular hashes).

## Clean-machine lifecycle

For a real release candidate, capture these stages on disposable machines rather than claiming local evidence:

1. Install MSI and setup variants as a non-developer user; record OS, architecture, disk use, warnings, and hash.
2. Launch editor, create/open/save/build the reference, and launch portable/Web games.
3. Upgrade from the previous signed release while preserving user projects/settings.
4. Run installer repair and verify binaries/resources/checksums are restored.
5. Uninstall and verify program files/shortcuts are removed while user projects remain.

Publisher signing, clean-machine lifecycle, second-machine byte reproduction, Linux/macOS matching-host builds, independent accessibility review, and a real 72-hour soak are external gates until actual evidence exists.

## Programmer audit

- Corpus: malformed manifests, traversal, absolute/duplicate paths, symlinks, archive bombs, hidden executables, digest mismatches, unknown permissions, dependency cycles, incompatible ranges, malicious signatures, stale/replayed bulletins and updates.
- Determinism: identical source and `SOURCE_DATE_EPOCH` produce identical package archive hashes; mirror/package/lock order is stable; clean-clone offline build uses the pinned lock.
- Security: Ed25519 message/fingerprint checks, revocation disable/quarantine, High/Critical policy, updater digest/sequence/rollback, no implicit fetch/process/deploy.
- Collaboration: independent edits auto-merge, same-property scene/graph conflicts remain unresolved, choice round-trips through canonical save/reopen, ownership rules and change-list fingerprints are stable.
- Shipping: SBOM/provenance/patch/symbol/crash outputs, ten checksum entries, matching-host CI matrix, Windows editor/player smoke, and honestly external lifecycle/signing gates.

## Normal-user audit

Install a reviewed offline package, update it, inspect permissions/solver, roll it back, then import a signed revocation fixture and confirm it is disabled. Create two edits to one real scene/graph, import the incoming project, resolve each named conflict, save, reopen, play, and build. Create an ownership-aware change list and release candidate. Inspect sizes, licenses, security URLs, SBOM, provenance, patch, symbols, and hashes. Finally run portable and Web references and record clean-machine install/upgrade/repair/uninstall externally.
