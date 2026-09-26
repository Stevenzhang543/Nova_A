# Contributing to Nova_A

## Setup

Fork [Stevenzhang543/Nova_A](https://github.com/Stevenzhang543/Nova_A), then clone
your fork and create a branch:

```sh
git clone https://github.com/YOUR_USERNAME/Nova_A.git
cd Nova_A
git remote add upstream https://github.com/Stevenzhang543/Nova_A.git
git switch -c fix/short-description
```

Install Node.js, rustup and the [native build dependencies](README.md#operating-system-prerequisites).
Use these versions:

| Tool | Version |
| --- | --- |
| Node.js | 22.22.2 |
| pnpm | 10.30.0 |
| Rust | 1.92.0 |
| wasm-pack | 0.14.0 |

From the repository root:

```sh
corepack enable
corepack prepare pnpm@10.30.0 --activate
rustup show active-toolchain
cargo install wasm-pack --version 0.14.0 --locked
pnpm install --frozen-lockfile
pnpm build:wasm:dev
pnpm check
```

`rustup show active-toolchain` installs the version and components listed in
`rust-toolchain.toml`. Skip the wasm-pack install if 0.14.0 is already installed.

Build WASM before running `pnpm check`: the generated bindings in `nova_core/pkg/`
are not checked in. Rebuild them after changing Rust exports.

Use `pnpm dev` for the Web editor or `pnpm tauri dev` for the desktop app.

## Code layout

| Area | Starting point |
| --- | --- |
| Editor UI and state | `src/components/`, `src/layout/`, `src/store/` |
| Project operations | `src/editor/`, `src/projects/` |
| Gameplay, assets and networking | `src/runtime/` |
| Rendering and visual scripting | `src/renderer/`, `src/visual/` |
| Rust engine, scripting and project format | `crates/` |
| WASM bindings | `crates/nova_wasm/`, `nova_core/` |
| Native physics command | `crates/nova_headless/` |
| Desktop backend | `src-tauri/` (separate Cargo workspace) |
| Examples and test fixtures | `reference-projects/`, `tests/fixtures/` |

## Checks

To run the development checks:

```sh
cargo test --locked --workspace --all-targets
cargo clippy --locked --workspace --all-targets -- -D warnings
pnpm build:wasm:dev
pnpm check
pnpm audit:manual
pnpm test:native-headless
pnpm build
cargo check --locked --manifest-path src-tauri/Cargo.toml
```

For a change to one Rust crate, start with `cargo test --locked -p CRATE_NAME`.
For editor changes, try the affected controls and save/reopen a project. Check
English, German and Chinese when changing UI text or layout.

`pnpm test:native-headless` builds the native physics command and tests its JSONL
protocol on the current machine. It supports `CARGO_TARGET_DIR`. Use
`CARGO_NET_OFFLINE=true` if the Cargo dependencies are already cached.

PRs run `ci.yml` and `nova-validation.yml`. The release matrix runs on tags or
manual dispatch. `pnpm audit` needs generated release reports; the native release
script also checks for windows and child processes on Windows. See the
[README](README.md#native-release-bundle) for the release steps.

## Submit a pull request

Describe the bug or change and the tests you ran. Include a regression test for
bug fixes, and screenshots if the UI changed. Leave generated files and caches
out of the commit.

Use an email linked to your GitHub account so the commit is credited to you.
GitHub's noreply address works too.

```sh
git diff --check
git add PATHS_YOU_CHANGED
git commit -m "fix: describe the concrete change"
git push -u origin fix/short-description
```

Open a PR from your branch to `Stevenzhang543/Nova_A:main`.
