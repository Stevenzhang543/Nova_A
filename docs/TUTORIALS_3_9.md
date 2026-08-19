# Nova_A 3.9 role-based guides

These guides use only repository-owned tools and source projects, so they work offline.

## Designer: edit and review safely

1. Open `reference-projects/projects/source-control-workflow/project.nova`.
2. Change a scene object, a prefab, and one Project Setting.
3. Open **Team** to inspect structured Scene, Prefab, Resource, Settings and `Packages.lock` changes.
4. Use **Compare** before **Reload incoming**. A reload is transactional and remains undoable through the project backup.
5. Generate `.gitignore`; generated import/cache/build output stays local while authoritative assets and the deterministic lockfile remain shared.

## Programmer: validate and test headlessly

1. Run `pnpm nova version --jsonl`.
2. Run `pnpm nova validate --project reference-projects/projects/headless-networking/project.nova --jsonl`.
3. Run `pnpm nova test --project reference-projects/projects/headless-networking/project.nova --jsonl`.
4. Treat Experimental networking as an optional package gate. Its RPC, replication, prediction, headless and diagnostics contracts do not change core-runtime stability.
5. Add `pnpm validate`, `pnpm test:headless`, `cargo test --workspace --all-targets`, and `pnpm build` to CI.

## Package author: validate before publishing

1. Copy `templates/package-authoring`.
2. Give the package a reverse-domain ID, SemVer, engine/API ranges, one entry-point type, permissions, dependency hashes, an archive SHA-256, publisher identity, and a registry-verifiable signature.
3. Run the included test, then `pnpm package:validate -- --manifest templates/package-authoring/manifest.json --jsonl`.
4. Install from a non-Stable development registry for iteration. Stable accepts only the exact verified registry manifest; modified archives are quarantined.
5. Review permission changes explicitly. Use verified rollback if an update regresses.

## Build engineer: reproducible release

1. Open the `build-automation` reference and choose a built-in build preset.
2. Run a clean build, a repeated incremental build, then cache validation.
3. Review the size report, dependency report, included/excluded assets, symbols, version metadata, manifest asset and build history.
4. Qualify Windows x64 and Web against `docs/PLATFORM_SUPPORT_3_9.md`. Do not promote Experimental targets without their clean-machine matrix.
5. Run the complete audit, production build, browser qualification and native packaging; package with `scripts/package-release.ps1`.

## Release/support engineer

1. Open **Help → Studio Status** and review migration, known issues, tasks, package state and platform tiers.
2. Select diagnostic privacy fields, acknowledge the review, and download the local bundle. Nova_A never uploads it automatically.
3. Verify `SHA256SUMS.txt`, SBOM, third-party notices, provenance, package-security results and the signed source tag.
4. Record external gates—publisher signing, clean VMs and long-duration runs—as pending unless evidence actually exists.
