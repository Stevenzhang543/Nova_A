# Nova_A 26.41

Engine 26.41.0. Project format 2 / schema 29 is unchanged; 26.38–26.40 projects open with only the engine-version stamp updated.

## Latency and frame rate

Measured on the build machine (Windows 11 Pro 26200, Ryzen 9 8945HX, GeForce RTX 5060 Laptop GPU, 2560×1600 at 240 Hz, WebView2, WebGL2 backend, editor maximized) with OS-injected input and desktop capture. Full method, conditions, every stage and the raw records: `docs/latency-results.md` and the release evidence archive (`latency/`). "Display" below is the change seen in a GDI capture of the composed desktop, not photons; no photodiode or high-speed camera was used.

| Platformer scene with the 2D light (P50 ms unless noted) | 26.40 | 26.41 |
| --- | --- | --- |
| Key press → handler → first WebGL2 submit (inputToSubmit) | 14.9 | 9.8 |
| Key press (SendInput) → change in desktop capture | 41.4 (unmodified 26.40: 42.1) | 23.1 |
| Editor drag (pointer move) → change in desktop capture | 36.5 | 15.1 |
| World submissions per second (240 Hz display, 60 s) | 98.1 | 233.4 |
| Runtime frame (simulation) CPU time, mean ms | 5.4 | 1.2 |

- Playing frames no longer go through Vue's reactivity: the Runtime reads and writes the plain world objects and the hierarchy and Inspector are refreshed at 10 Hz (and exactly on pause and stop).
- The 2D lighting overlay drew every shadow edge as its own blurred fill; it is now one fill per shadow caster. This was the main reason the display ran at about 100 updates per second on a 240 Hz screen.
- Script coverage and profiler samples are batched; breakpoint analysis is cached; idle editing no longer re-renders the Inspector every frame.
- With a 60 Hz fixed step an input waits on average about half a step for the next fixed update; raising the project's tick rate to 240 Hz measured 18.6 ms P50 end to end on the same scene.

## Editor interface

Direction taken from Apple's current guidance (Liquid Glass for the control layer only, concentric shapes, restrained type scale, brief interruptible motion, Reduce Transparency/Increase Contrast fallbacks); no Apple fonts, icons or assets are bundled.

- The scene tabs, scene tools and layer selector float over the canvas as glass capsules instead of an opaque header row; the canvas gains that height.
- Menus and popovers are legible again (a mostly opaque material with blur instead of a see-through tint).
- Rulers follow the theme, with larger labels and calmer tick spacing.
- Inspector: Transform comes first; rarely used object settings are collapsed below the components; Connections opens only when there are connections; collapsed sections point their chevron sideways (it pointed up); object ownership uses the same disclosure style.
- Settings: grouped rows with every switch, menu and slider on one trailing column; the search field is no longer repeated as a label; sliders show their value once.
- Create object: category chips wrap instead of being cut off at the dialog edge.
- Assets: the toolbar stays on one row in narrower docks.
- Notifications: the history opens from the status bar; the pill no longer floats over the Inspector.
- During Play the Inspector shows the running values again and Stop restores the authored ones.

## Desktop

- A `.nova` file passed on the command line (Open With) opens through the normal open checks, after any crash-recovery prompt.
- Closing the window releases the editor's project lease; the next session no longer reports the project as locked by itself.
- `NOVA_LATENCY_PROBE=http://127.0.0.1:<port>` turns on the measurement probe (loopback only; off by default).

## Verification

Recorded in the release evidence archive (`checks/`, `container/`, `screenshots/`, `latency/`):

- On Windows, against this source and build: `vue-tsc --noEmit` and the node typecheck pass; `cargo fmt --check`, `cargo clippy --workspace --all-targets -D warnings` and `cargo test --workspace` (198 tests) pass; `verify-2640-editor-workflow` 7/7 and the new `verify-2641-editor-ui` 6/6 pass with real pointer and keyboard input in Edge.
- The same two browser tests pass in headless Chromium on Linux. Four older engine verifiers fail there exactly as they do on the committed 26.40 tree (they need a second Runtime for the editor world, the editor audio adapter, a newer `WorldCanvas` scope or a historical baseline folder); they were not changed.
- The release portable executable was started from `releases/v26.41`: the launcher shows 26.41; a project passed on the command line opened through the upgrade check; an object was dragged with the Select tool (100 measured drags); Play, keyboard input (200 measured edges plus 60 s of movement and jumps) and Stop worked; Settings and Build Settings opened.
- The UI was used on the Windows build in the light Blush Berry palette (Chinese) and checked in dark and light themes in the browser build.

## Limits

- Latency figures come from one Windows laptop at 240 Hz. "Display" is the change in a capture of the composed desktop; photon latency, PresentMon present statistics (needs elevation) and other machines and refresh rates were not measured. Submissions per second are app-side WebGL2 submissions, not presented frames.
- The exported Player was not measured: the Windows export of the generated latency test project was blocked by a validation error reporting that its audio asset could not be fetched during Play. Audio playback was therefore not verified by ear in this round.
- The WebGL2 GPU timer covers only the world pass; the Canvas 2D lighting overlay, which dominated 26.40, is outside it.
- Installers (MSI, NSIS) were built and version-checked but not installed. Linux desktop packages, macOS and mobile devices are not part of this release.
- The Player still depends on editor modules (`WorldCanvas`, editor stores).
- Pre-existing Rust warning: unused `declared_decoded_bytes` in `src-tauri/src/runtime_pak_preflight.rs`.
- The user's release-detail image was not available; the release follows the existing eleven-file contract (as for 26.38–26.40) and its image rules were not checked.
- Nothing was committed, staged or tagged; the source archive is built from the working tree.
