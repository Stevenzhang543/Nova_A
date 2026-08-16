# Nova_A 2.7.0 — UI, Audio, Localization, and Accessibility

Nova_A 2.7.0 adds the presentation systems needed for polished menus, HUDs, international releases, accessible input, and production audio mixes. Existing world, physics, animation, scripting, package, and rendering behavior remains available.

## Fatal error fixed

- **Help > Manual** no longer creates a Tauri webview or sends `http://tauri.localhost/manual/index.html` to the external URL opener. Tauri correctly rejected that internal HTTP URL and the rejection was reported as Fatal.
- The bundled manual now opens in a same-origin, full-screen Nova_A overlay with loading, reload, and close controls. Closing returns to the unchanged editor.
- The obsolete `nova-manual` window capability was removed. The opener capability remains restricted to the Nova_A GitHub page.

## Responsive UI and themes

- RectTransform applies anchors, fixed/fill/content sizing, min/max sizes, aspect constraints, safe-area-aware Canvas geometry, and width breakpoints.
- Panel provides horizontal, vertical, grid and wrapped layout, padding/gaps, clipping, rounded masks, wheel scrolling, content bounds, scrollbar visibility, and wheel speed.
- Selected UI subtrees can be saved as reusable UI prefabs.
- `.nova-theme` assets support parent inheritance, variables, normal/hovered/pressed/disabled/focused states, live preview, style classes, and per-control overrides.
- Game UI renders localized text, RTL flow/alignment, font fallback, theme states, clips and focus rings in both editor and player paths.

## Runtime accessibility and input

- Tab/Shift+Tab, arrows, D-pad, Enter, Space, and gamepad activation provide complete runtime focus navigation with explicit UUID links and spatial fallback.
- UI controls export bounded role/label/description metadata to a Game-view accessibility DOM tree where the platform supports screen readers.
- Buttons can capture the next keyboard or gamepad button and update a named Input Map binding.
- Runtime focus, screen-reader, gamepad, announcement and reduced-motion settings are persisted independently from editor accessibility preferences.

## Localization

- Localization resources support locale tables, string/plural/select values, variables, number/date formatting, source/preview locale, fallback chains, pseudolocalization, font fallback and RTL metadata.
- Text and Checkbox components resolve localization keys live while keeping authored fallback text.
- Player packages include only the source locale plus selected build locales.

## Audio

- The mixer graph supports bounded custom buses, parent routing, sends, gain, mute, solo, Low/High Pass, Compressor, Delay, Reverb, wet/dry processing, delay feedback, meters, snapshots and ducking.
- Master and per-bus voice limits, priority ordering and active/streaming/buffered/limited diagnostics keep long sessions bounded.
- AudioSource supports custom buses, streaming override and Linear/Inverse/Exponential/Custom spatial attenuation.
- Audio assets expose decoded waveform preview, loop markers, streaming choice, target peak and calculated normalization gain. Loop marker edits apply to existing owned audio elements.
- Legacy Master/Music/SFX/UI gains migrate without overwriting new mixer edits or multiplying gain twice.

## Persistence and editor integration

- Nova_A Project Format 2 advances to Schema 20 / engine 2.7.0. Migration adds safe default presentation and mixer settings to older supported projects.
- Rust validation bounds mixer buses/effects/sends/voices and presentation locale/accessibility data. Unknown fields remain preserved.
- The Presentation panel is available in the bottom drawer, Interface workspace and Command Palette, with English, German and Chinese UI.
- The bundled HTML and all three Markdown manuals document the complete v2.7 workflow and audit requirements.

## Release contents

- Portable Windows x64 executable
- Windows x64 MSI installer
- Windows x64 NSIS setup executable
- Web release ZIP
- Complete source ZIP
- Release notes, MIT license, and SHA-256 checksums

Windows community binaries are unsigned. macOS and Linux native bundles must be produced on their target operating systems; the web archive is portable to a modern WebAssembly-capable browser.

## Verification gates

- Rust format check, strict Clippy and every workspace/all-target test
- Vue/TypeScript type-check
- Manual, editor, scripting, rendering, animation, v2.5, v2.6 and v2.7 connectivity audits
- Optimized Rust-to-WASM and Vite production build
- Browser smoke checks at compact and desktop viewport sizes, including manual open/close and Presentation layout
- Tauri production build producing portable EXE, MSI and NSIS bundles
- Release archive/checksum verification

## Completed verification results

- `pnpm check` and the complete `pnpm run audit` suite passed, including the manual, editor shell, Script Studio, rendering, animation, v2.5, v2.6, and v2.7 audits.
- `pnpm audit --audit-level high` reported no known vulnerabilities after the transitive Nano ID security override was advanced to 3.3.18.
- `cargo fmt --all -- --check` and strict workspace/all-target Clippy passed.
- All 102 Rust workspace/all-target tests passed.
- The optimized Rust-to-WASM/Vite build passed and emitted the bundled manual with the player/editor assets.
- Browser smoke tests passed at 900 x 600 and 1440 x 900, including project creation, Interface/Presentation navigation, every Presentation tab, manual open/reload/close, Play, Pause/step controls, Stop, and zero browser warning/error logs during the run.
- The Tauri production build emitted the portable executable, MSI, and NSIS installer. Packaging printed Tauri's non-fatal `__TAURI_BUNDLE_TYPE variable not found` updater warning; Nova_A 2.7.0 does not advertise an in-app updater, and the standalone release files were created and verified normally.
- The portable executable, MSI, NSIS installer, web ZIP, source ZIP, release notes, and license are covered by `SHA256SUMS.txt`.
