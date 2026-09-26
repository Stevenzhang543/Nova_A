# Nova_A 26.29 platform prerequisites and delivery

## Actual scope

Only this Windows computer was available. Linux, macOS, Android toolchains/devices, oldest-supported Windows machines and independently clean machines were not available. An iPhone was offered but has not been exercised in this task. A recipe or metadata entry is not target qualification. Existing platform matrix evidence dates remain historical; they are not relabeled as a new independent 26.29 certification.

### GUI, build CLI and native physics command

| Entry | Host/runtime requirements | Actual boundary |
| --- | --- | --- |
| Desktop editor / normal game player | Platform system WebView, window system and working graphics environment | Full editor/player |
| Build Settings `headless-server` game export | Same desktop WebView prerequisites | Rendering disabled inside the player; not a windowless service |
| `node scripts/nova-cli.mjs` | Pinned Node, repository/tooling and available player template | Validation, packaging/export and script tooling; not a game server |
| `cargo run --release -p nova_headless -- --stdio` | Build: Rust toolchain; execution: compiled native executable and OS | Bounded physics JSONL stdio; no WebView, project loader, Rhai script host or network listener |
| Static editor / Web game | ES2022 + WebAssembly browser, HTTP(S) hosting | No editor backend needed; networking is optional and explicit |

The native command identifies its boundary through `--version` and a JSONL `hello` request such as `{"id":1,"command":{"op":"hello"}}`. Its protocol and runtime verification belong to the native-command release evidence. Linux/macOS builds of it are not claimed here.

## Windows launch diagnostics

The existing x86-64 binary baseline names Windows 10 1809 (build 17763); that historical metadata is not evidence that the oldest system was tested. Use a maintained Windows release and current Evergreen WebView2. Current Microsoft policy and OS support must be checked for deployment; Windows 7/8 are not promised by reducing metadata. Microsoft's runtime OS policy follows Edge. [Microsoft supported operating systems](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-supported-operating-systems).

Run before launching the GUI when startup reports a missing runtime:

```powershell
powershell -NoProfile -File scripts/check-windows-prerequisites.ps1
```

This read-only script reads the Windows build, architecture and per-user/machine WebView2 registrations. Exit 0 means prerequisites were detected; exit 2 requires attention. It never downloads/installs software, changes environment variables or writes the registry. It prints the official runtime download address and explains that Edge browser installation alone does not prove WebView2 Runtime installation. It does not inspect a separately deployed fixed-version runtime or prove GPU/driver/audio compatibility. A GUI cannot show its own diagnostic before its missing WebView can start; this external preflight addresses that boundary.

This host reported Windows build 26200, AMD64 and WebView2 143.0.3650.96. Actual missing-runtime/old-machine reproduction remains unavailable. A test runs this actual script with isolated registry-read mocks to execute the missing-runtime and old-OS failure branches; this is simulation, not a failing physical machine.

### Installer options

- Portable editor/player EXEs do not embed Evergreen WebView2. Provide the prerequisite script and official installation instructions.
- The existing Tauri default installer route uses its WebView2 bootstrapper strategy. Bootstrapper delivery is smaller but needs network access when the runtime is absent. Do not assume it repairs every managed-machine policy problem.
- Tauri also supports an offline installer or fixed-version runtime configuration. These increase the delivery size and require redistribution/update planning. They have not been produced or clean-machine-qualified for this release, so no offline-runtime installer claim is made.
- Low-end settings reduce visual workload. They do not remove the WebView, CPU or OS requirements.

[Tauri Windows installer strategies](https://v2.tauri.app/distribute/windows-installer/) and [WebView versions](https://v2.tauri.app/reference/webview-versions/).

## Build prerequisites and matching-host recipes

Game export reuses a compiled player template; exporting from the desktop editor does not require Rust or platform SDK installation. Compiling Nova_A itself requires the build tools below. Android remains separately gated by live JDK/SDK/NDK/template detection.

All recipes use `.node-version` (currently 22.22.2), `pnpm@10.30.0`, locked dependencies, Rust compatible with the manifests and `wasm-pack`. Install those tools before the commands. Tauri's build command invokes the repository `pnpm build`, including the Web/WASM pipeline. [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

### Linux x86-64, Ubuntu 22.04 recipe

```sh
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev fonts-dejavu-core patchelf
rustup target add x86_64-unknown-linux-gnu
pnpm install --frozen-lockfile
pnpm exec tauri build --target x86_64-unknown-linux-gnu
```

Candidate bundles: `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/`. Choose the oldest supported build distribution that supplies WebKitGTK 4.1 to avoid inventing older glibc compatibility. Verify generated package dependencies and graphics/audio/input on the intended distribution. [Tauri Debian packaging](https://v2.tauri.app/distribute/debian/).

### macOS matching architecture recipe

```sh
xcode-select --install
pnpm install --frozen-lockfile
rustup target add aarch64-apple-darwin
pnpm exec tauri build --target aarch64-apple-darwin
```

On Intel use `x86_64-apple-darwin` for both target commands. Candidate bundles are under `src-tauri/target/<target>/release/bundle/`. WKWebView is supplied by macOS. Existing macOS 12 baseline is not hardware acceptance; test deployment OS, architecture, fonts, audio, input, signing and notarization on real Macs. Do not relabel a Windows binary as a Mac app.

`.github/workflows/platform-recipes.yml` provides manually dispatched matching-host candidates for Linux x64, macOS ARM64 and macOS Intel. Artifact names explicitly say `unqualified-desktop-candidate`; missing bundle outputs fail the job. No workflow was run from this Windows session. Runner labels are based on [GitHub's hosted-runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). CI runner availability can change and must be checked when scheduling.

## Static Web, PWA and service boundaries

Deploy the prepared Web editor directory contents at the desired URL path, retaining relative assets. Do not launch via `file://`. Configure `.wasm` as `application/wasm`, JavaScript/CSS with correct MIME types, and avoid rewriting missing asset URLs to HTML. HTTPS (or localhost) is needed for secure browser/PWA installation features. This release does not register a service worker and does not support offline reload. Mobile use is landscape; browser/platform device acceptance is separate from Chromium desktop tests.

Build Settings Web export downloads a ZIP with `index.html` and game resources; serve extracted contents through HTTP(S). Editing, local save/import and offline games do not need a backend. An already loaded tab may retain resources in memory, but lazy panels and reload can require the server. PWA installation is not offline-shell caching or a backup. iPhone Add to Home Screen is Web/PWA delivery, not an iOS native binary or App Store release.

Optional multiplayer/authentication/lobby/relay features require explicit compatible services. Configure HTTPS/WSS, server-side Origin/CORS policy where applicable, permissions and authentication. A static host does not become a relay or native UDP server. Disabling networking must leave local editing and games usable. Web/PWA actual delivery tests and optional-service negative checks belong to the release's web/runtime owner; these notes do not assert they were executed by the platform module test.

## Changed paths and checks

- `src/runtime/platformSupport.ts`: corrected Web editor and ARM browser metadata; unknown targets now fail closed instead of borrowing Android; matching-host CI targets can be selected only on their detected native host. No untested target is promoted.
- `src/runtime/platformPrerequisites29.ts`: pure EN/DE/ZH explanations selected by current target, architecture, native availability and runtime mode; no installer or network action.
- `src/components/BuildSettingsPanel.vue`: reactive readable prerequisite card, raw detection detail and explicit refresh; matching-host target choices update after detection.
- `src/runtime/platformGapRegister.ts`: distinguishes the separate native physics command from the WebView game player and keeps complete game/server parity outside the claim; links new matching-host recipes.
- `scripts/check-windows-prerequisites.ps1`: external read-only startup preflight.
- `.github/workflows/platform-recipes.yml`: unqualified, manual matching-host candidate jobs.
- `scripts/verify-v26.29-platform.mjs`: actual-module target/fallback/host/three-language checks, actual Windows probe and simulated absent-runtime/old-OS failure checks; hashes checked inputs.
- `docs/PLATFORM_26_29.md`: this platform boundary and recipe documentation.

Run `node scripts/verify-v26.29-platform.mjs --qualification-release=26.29`. Report: `release-audits/v26.29-platform.json` with engine identity, timestamp, named checks, actual Windows results and explicit simulated/external boundaries. This focused test does not duplicate unrelated rendering, media or asset matrices.

### Targeted browser and qualification additions

- `scripts/verify-v26.29-platform-layout.mjs`: actual EN/DE/ZH UI settings changes, normal and 200% scale, new prerequisite text visibility and real refresh-button reachability (six development checks passed). The first attempt incorrectly expected HTML `zh` instead of the correct `zh-CN`; its failure report was retained and all six checks passed after correcting the test.
- `scripts/verify-v26.29-static-host-user.mjs`: actual root/nested static URLs, online PWA manifest/icon fetches and no service-worker registration; downloaded project moved to a Unicode/space directory, reopened and saved; actual Web ZIP with exact asset/source checks, native/WASM script result comparison and nested exported-player startup (four development checks passed). These are development results until the frozen candidate runs its formal gates.
- `scripts/prepare-release-26.29.mjs`: version-specific 13-gate plan; explicit world/network/platform/native-physics focused checks and eight omitted unrelated matrices. Native physics report is separately archived rather than conflated with the WebView player.
- `scripts/qualify-v26.29-scoped.mjs`: executes fresh directed module, process and browser checks, preserving report identities; retained world and real-UDP process fixtures receive `--qualification-release=26.29`.
- `scripts/verify-v26.29-release-inputs.mjs`: requires platform/world/network/native-command documentation and the separate native report schema before long release work.
- `docs/WEB_HOSTING_26_29.md`: clarifies optional services, online-only PWA behavior and what actual static-host checks prove.

The corrected prerequisite card also distinguishes an actual desktop probe failure from a browser without native packaging; a failed desktop probe does not falsely say the user is in a browser. No GUI/backend capability is inferred from the old navigation-platform hint.

A subsequent real streaming-export screenshot exposed a readability defect that simple clipping tests missed: the new prerequisite content inherited the artifact card's 34px icon column. The card now explicitly uses the whole available width. The targeted layout verifier additionally requires a useful measured content width, so one-word-per-line wrapping cannot pass just because it is technically unclipped. After rebuilding, all six strengthened development checks passed; each measured the full content column and exercised refresh. The frozen candidate still runs the same strengthened formal gate.
