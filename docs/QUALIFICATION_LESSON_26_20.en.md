# Nova_A 26.20 — create, tune, compare and ship

This lesson extends the complete English manual and the 40 starter walkthroughs. Engine26.20.0 retains Project Format2/schema29, Rhai API2, Graph1, Plugin API2 and Network Protocol2. A successful local release does not certify every platform or every possible program.

## Choose an editor palette

Open Manage → Project & safety → Settings → Appearance. Color palette offers Cloud Blue, Meadow Cream, Blush Berry, Midnight Blue and Night Garden. The first three are light; the last two are dark. Choosing one applies it immediately. Dark/Light switches restore the last selected palette in that mode. Native keyboard arrow selection applies each visited option; use the mode buttons to return to your previous mode choice. Close and reopen the app to check persistence.

The six supplied roles remain exact semantic tokens: background, surface, primary, secondary, accent and main text. Supporting borders, muted text, hover and selection colors are derived from them. Dark text links use a lighter derived primary for readability. High contrast remains an explicit override. Editor palettes never recolor game materials or runtime UI themes. Reduce motion, animation durations and existing effects remain available.

## Build the same game in Code, Blocks and Mixed

Open the matching creator-v2620-code-game, creator-v2620-blocks-game or creator-v2620-mixed-game reference. In Play, use WASD/arrow keys to collect six checkpoints in order; R restarts. Stop before editing. Open CheckpointGame.rhai in Script and find the movement-speed value. In Code change that value; in Blocks open its linked graph and edit the corresponding literal; in Mixed make one change in each representation. Save the script, switch representation and confirm the value remains. Typed graph support and source-backed ranges remain explicitly different; do not erase unsupported source to force a visual conversion.

Select Checkpoint1 in Design and move X. The script queries the checkpoint entity's current world position, so the pickup target moves with it. Undo and Redo the move. Save the project, reopen it, repeat Play, export Web through Manage → Build Settings and repeat movement, pickup and restart. A changed Inspector value alone is not proof of exported behavior.

## Tune resolution and anti-aliasing without cutting features

Open Manage → Rendering → Quality. Keep your scene's animation, lighting, particles, audio, timeline, UI and post-processing settings enabled. Resolution scale1 uses the existing device-density limits;1.5 or2 increases backing pixels for supersampling, subject to device and allocation bounds. Scale0.5 is an explicit user option. It is never silently selected by this release. The separate existing adaptive-quality/profile controls retain their existing opt-in behavior.

Auto uses the normal framebuffer anti-aliasing and adds bounded multisampling when post-processing needs an offscreen surface. Auto does not add offscreen smoothing when pixel snapping is enabled. MSAA2/4/8 requests explicit samples; actual support may be lower. Off disables requested WebGL anti-aliasing. Actual backing / MSAA samples shows the rendered dimensions and sample count; a request is not a guarantee. Canvas2D uses browser smoothing and does not report GPU sample counts. Existing nearest texture filtering and pixel-perfect controls remain available for pixel art.

Higher resolution and MSAA cost GPU memory and time. The optional multisample color target plus its resolve texture is bounded to256MiB; sample count falls back to supported values within that budget, while the logical viewport is preserved. General surfaces remain bounded to8192 pixels per dimension and16,777,216 backing pixels. Device capability checks can impose a lower limit. Changing resolution must not pan the editor camera. Apply one change, Undo/Redo, save/reopen and inspect the same setting and output in the exported game.

## Preserve animation and compare evidence

Open creator-v2620-animated-menu. Play the menu and use its input/checkbox controls while watching the title fade and timeline behavior. Repeat at two resolution scales and in the Web export. Existing asset, animation, controller, rig, timeline, audio and UI chapters explain their full workflows. This reference preserves those authored assets; the release does not remove them to improve a benchmark.

For performance comparisons use the same project, camera, number of entities, resolution, effects, build, device and warm-up. Record CPU frame time, available GPU time, draw calls and actual pixels alongside FPS. The optimized batch algorithm preserves packet ordering and vertex/index uploads; steady-size batches reuse CPU/GPU storage. Index-heavy batches may split into extra draws to bound memory. Isolated batching timings are not total engine FPS. Read the fresh performance reports and their hardware/scope before comparing results.

## Diagnose, recover and export

If WebGL is unavailable, read the visible fallback reason and validate Canvas2D output. If MSAA is lower than requested, check actual sample counts and output size before reducing anything. If labels appear clipped, raise the panel size, scroll its own content, or maximize it; report palette, language, scale and panel name. If a shader fails, inspect the named material diagnostic and retained fallback. If a script cannot convert structurally, retain the source-backed range and fix the reported syntax/coverage boundary.

Use Project Health before export. Browser-native export being Blocked is correct: native export requires the desktop host. Build logs and repair actions identify prerequisites. Save before external editing; review file conflicts through Team, choose local/incoming/base, apply once and verify Undo/Redo. A stale preview must be refreshed. Package permissions require review; disabling/uninstalling a package unloads its plugin. Signed-update staging records review/operator actions and does not install binaries.

For a clean/moved checkout install pinned Node22.22.2, pnpm10.30.0, Rust1.92.0 with rustfmt/clippy/wasm32, and Windows native prerequisites. Offline work requires populated caches. After moving the source, explicitly repair pnpm links offline; compile native metadata into a fresh target directory because paths can be absolute. Do not remove authored assets to repair a cache.

## Release acceptance

Run all declared local gates against frozen source, verify the exact11 release files and payload checksums, then use the packaged manuals/references/evidence. Historical releases remain immutable. Complete beginner/expert observation, assistive technology, low-end/mobile input, Linux/macOS/Android, production signing/disposable installer lifecycle, independent security and real-duration soak on their actual environments before claiming those outcomes. Only this Windows computer is locally available.
