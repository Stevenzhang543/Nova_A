# Nova_A 4.0 build and CI guide

Install the locked Node/pnpm toolchain and Rust 1.88 or newer, run `pnpm install --frozen-lockfile`, then `cargo test --workspace --all-targets`, `pnpm check`, and `pnpm audit`. Build WASM/frontend with `pnpm build`; build the host desktop package with `pnpm tauri build`.

The stable CLI is `validate`, `import`, `test`, `build`, `export`, `package`, and `version`. Add `--jsonl` for one bounded JSON record per line and CI-safe exit codes. A typical release gate is:

```powershell
pnpm nova validate --project project.nova --jsonl
pnpm nova test --project project.nova --jsonl
pnpm nova export --project project.nova --target web --profile release --output Builds/Game --cache validate --jsonl
```

Use clean or validate-cache mode for release candidates. Commit authoritative assets, settings, scenes, prefabs, scripts, and `Packages.lock`; ignore `.nova/cache`, `.nova/imported`, build caches, diagnostics, and machine-local settings. Signing identities and output paths stay user-local. Publish only after checksums, provenance, SBOM, Tier-1 reference, installer/portable/web, rollback, and clean-machine gates complete.
