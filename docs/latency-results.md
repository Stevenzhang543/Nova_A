# Nova_A input, output and display latency results (26.41–26.43)

All numbers below were measured on one machine with the procedure described here (26.41: 17 October 2026; 26.42: 18 and 19 October 2026; 26.43: 19 October 2026). They are not a guarantee for other hardware. Nothing in this file is estimated: a missing measurement is written N/A.

## 26.43 exported Windows game (19 October 2026)

Same machine and method as the 26.42 exported Player below. The 26.43 development build (`.cache/_latency/build-d43b.cmd`, working tree with the desktop routing to the independent Player) was copied as `export43b/My Game.exe` next to the `game.nova-pak` taken from the 26.42 export of `LatencyTest.nova` (Platformer with light and the white marker, 60 Hz, debug profile). The game window was maximized (client 2560×1494), `--roi 1278 597`; the marker calibration (17.3 → 168.6) was identical in every run. Started with `NOVA_LATENCY_PROBE` by `launch-player43.cmd` or `h43-compare.cmd`; F3 and F4 were checked by hand and closed before measuring. SendInput → capture in ms, P50 / P95, 100 trials per edge, no timeouts:

| Run (19 Oct unless stated) | Key down | Key up |
| --- | --- | --- |
| 26.42 export, 18 Oct (`results42/player-*`) | 18.9 / 26.1 | 16.7 / 25.4 |
| 26.42 export, same session (`results43/export42-*`) | 18.3 / 25.6 | 19.0 / 25.6 |
| 26.43, compatibility (Vue) Player, before the desktop routing change (`results43-legacy/`) | 17.5 / 23.9 | 18.5 / 25.3 |
| **26.43, independent Player, run 1** (`results43/player43-*`) | **15.7 / 23.9** | **17.0 / 24.5** |
| **26.43, independent Player, run 2** (`results43/player43-run2-*`) | **17.9 / 25.7** | **17.3 / 25.3** |

The independent Player is not slower than the 26.42 Player; the differences between builds are inside the spread between two runs of the same build (2.2 ms at P50), so no improvement is claimed. The fixed 60 Hz step dominates this number.

Stage breakdown (handler, consumed, submit) and frame statistics: N/A. In this session the harness's loopback collector received no probe records from any build, including the 26.42 export that reported on 18 October (`probecheck/`, 10-trial check of both exports). The end-to-end numbers do not depend on the probe. The cause was not found in this round (the probe code and the native endpoint are unchanged since 26.42); it should be checked before the next stage-level comparison.

## 26.42 release build (19 October 2026)

The packaged portable executable, started from `releases/v26.42` (`.cache/_latency/launch-rel42-test.cmd`, with `NOVA_LATENCY_PROBE`), opened the same `LatencyTest.nova` through the upgrade check (26.40 → 26.42, in memory; the file was not rewritten). Window maximized, bottom panel open, editor Play, `--roi 1285 332` as for `d42`. This build includes everything in the development build below plus soft shadows, normal maps on the GPU, the fixed-step timer clock (not enabled in this older project) and the desynchronized-canvas switch (off). P50 / P95 in ms, 100 trials per edge, clock-mapping error 1.45–1.5 ms, 200 of 200 inputs matched to probe records.

| Stage | 26.42 `d42` (18 Oct), 60 Hz | **26.42 release (`rel42`), 60 Hz** |
| --- | --- | --- |
| SendInput → handler | 5.6 / 8.2 | 5.4 / 8.4 |
| handler → consumed | 8.5 / 12.3 | 6.3 / 12.4 |
| consumed → submit | 3.5 / 4.5 | 3.3 / 4.6 |
| submit → capture | 2.2 / 2.9 | 2.3 / 2.9 |
| **SendInput → capture, key down** | **19.5 / 26.0** | **18.5 / 26.0** |
| SendInput → capture, key up | 17.3 / 25.7 | 18.7 / 26.0 |

Frames, 60 s of movement and jumps (`rel42-frames`): 238.95 world submissions per second (11 of 15 780 frames deferred by fence credit), Runtime frame (simulation) mean 1.15 ms, CPU frame start → submission P50 1.9 ms, renderer GPU timer P50 0.045 ms (0.03 ms in `d42`; the scene's light now also runs the shadow-mask passes), submission gaps over 16.7 ms: 5 in 66 s.

The release build is within measurement noise of the development build: the end-to-end key-down P50 differs by 1 ms with a clock-mapping error of 1.5 ms, and P95 is identical. The Windows export from the release editor (`Build and run`, same project) started and responded to keyboard input; it was not measured again.

Raw records: `.cache/_latency/results42/rel42-*`, `h-rel42-*.log`; command files `launch-rel42-test.cmd`, `h42-rel42-key.cmd`, `h42-rel42-frames.cmd` (copies in the release evidence archive under `latency/`).

## 26.42 development build (18 October 2026)

Same machine, method and definitions as the 26.41 sections below; measured in a new session on 18 October 2026 with the development build `d42` (26.42 working tree including GPU lighting, P-A overlay skip and the Play-mode glass rules; built by `.cache/_latency/build-checks-26.42.cmd`). The scene is the same `LatencyTest.nova` (Platformer with its 2D point light and shadow casters, 60 Hz) opened through the normal upgrade check; the editor window was maximized, with the bottom panel open (the 26.41 runs had a different panel layout, so the capture region moved: `--roi 1285 332`). The 26.41 release could not be re-run in this session (its folder was not reachable from the harness), so the 26.41 column repeats the 17 October values. P50 / P95 in ms, key down, 100 trials each, clock-mapping error 1.5–1.6 ms.

| Stage | 26.41 release (17 Oct) | 26.42 `d42`, 60 Hz | 26.42 `d42`, 120 Hz (`LatencyTest-t120`) |
| --- | --- | --- | --- |
| SendInput → handler | — | 5.6 / 8.2 | 5.5 / 8.6 |
| handler → consumed | — | 8.5 / 12.3 | 3.3 / 4.5 |
| consumed → submit | — | 3.5 / 4.5 | 3.4 / 4.4 |
| handler → submit | 9.8 (P50) | 11.6 / 16.0 | 6.7 / 8.5 |
| submit → capture | — | 2.2 / 2.9 | 2.3 / 3.3 |
| **SendInput → capture (end to end)** | **23.1 (P50)** | **19.5 / 26.0** | **13.7 / 18.8** |

Frames, 60 s of movement and jumps (probe):

| | 26.41 release | 26.42 `d42`, 60 Hz | 26.42 `d42`, 120 Hz |
| --- | --- | --- | --- |
| World submissions per second (240 Hz display) | 233.4 | 239.0 | 237.6 |
| Frames deferred by fence credit | — | 17 of 16 029 | 22 of 15 701 |
| Runtime frame (simulation), mean ms | 1.2 | 1.14 | 1.55 |
| CPU frame start → submission, P50 ms | — | 1.9 | 3.0 |
| GPU timer (world pass, now including the light pass), P50 ms | — | 0.03 | 0.03 |

- With the light drawn by the WebGL2 renderer the lit scene reaches the desktop capture 2.2 ms (P50) after the submission. 26.41 measured 2.6 ms for the same scene *without* a light; the Canvas 2D light overlay was the reason the lit scene was slower. End to end the lit scene is now 19.5 ms P50, about the 18.5 ms the unlit scene measured in 26.41.
- At 120 Hz the wait for the next fixed step falls from 8.5 to 3.3 ms (P50) and end to end from 19.5 to 13.7 ms; the Runtime frame costs 0.4 ms more on average. New template projects use 120 Hz (P-B); existing projects keep their rate.
- "handler → submit" is higher at 60 Hz in this session than the 26.41 value because the 26.41 figure was measured with a different panel layout and session; the end-to-end figure, which does not depend on the probe, is the comparison to use.

P-C (character interpolation), physics-driven marker (`--marker character`: Kinematic body with CharacterBody2D moved by `move_character`), 60 Hz, P50 / P95:

| | Interpolate (`char-i60`) | None (`char-n60`) |
| --- | --- | --- |
| handler → consumed | 7.7 / 12.3 | 8.9 / 12.2 |
| submit → capture | 2.3 / 5.7 | 2.0 / 2.7 |
| SendInput → capture | 18.5 / 28.4 | 19.2 / 26.2 |

The difference between Interpolate and None is below the 3 ms decision threshold of the development manual (and within the clock-mapping error), so per-body interpolation modes were not implemented in 26.42.

Exported Windows Player (M-2). With the content-security-policy fix (edit ledger, P-E1) the same `LatencyTest.nova` exported for Windows from `d42` (Build Settings: Windows, Production qualified, x86_64, debug profile, game data packed into the executable) without the "Failed to fetch" audio error that blocked 26.41. The exported `My Game.exe` was started with `NOVA_LATENCY_PROBE` and measured the same way (`--image "My Game.exe" --roi 1278 597`, its own window maximized, the 60 Hz scene with the light):

| | Editor Play (`d42`) | Exported Player (`player`) |
| --- | --- | --- |
| SendInput → handler | 5.6 / 8.2 | 4.2 / 5.9 |
| handler → consumed | 8.5 / 12.3 | 9.1 / 14.1 |
| consumed → submit | 3.5 / 4.5 | 2.1 / 2.6 |
| submit → capture | 2.2 / 2.9 | 4.1 / 4.5 |
| **SendInput → capture** | **19.5 / 26.0** | **18.9 / 26.1** |
| World submissions per second | 239.0 | 239.8 |
| Runtime frame (simulation), mean ms | 1.14 | 0.80 |

The exported Player is not slower than editor Play end to end; its submit → capture stage is about 2 ms longer, which was not investigated further. The Player still runs the Vue-based `PlayerApp` (P-E2, a Vue-free Player host, was not done in this round). The jump sound was not checked by ear.

Not measured in this round: drag latency, the 26.41 release in the same session, the Web Player, PresentMon, photon latency.

Raw records: `.cache/_latency/results42/` (`<label>-<mode>-trials.json`, `-probe.jsonl`, `-joined.csv`, `-frames.csv`, `-summary.json`, `h-<label>-<mode>.log`), test projects `LatencyTest.nova`, `LatencyTest-t120.nova`, `LatencyTest-char-{Interpolate,None}-60.nova`, command files `h42-*.cmd`, `launch-d42-*.cmd`.

## What was measured

| Name | From | To | Clock |
| --- | --- | --- | --- |
| SendInput → handler | the harness calling `SendInput` (OS-injected input, not a physical key or mouse) | the app's DOM event handler runs (Runtime `InputManager` for keys, editor viewport for drags) | crosses clocks (QPC → page), ± mapping error |
| OS event timestamp → handler | the browser event's `timeStamp` | the handler | page clock |
| handler → consumed | the handler | the Runtime fixed step that consumed the edge (key), or the editor command that applied the drag | page clock |
| consumed → submit | consumption | the first WebGL2 world submission after it (`fenceSync` + `flush`) — a command submission, **not** a present | page clock |
| handler → submit (inputToSubmit) | the handler | that submission | page clock |
| submit → capture | that submission | the first GDI capture of the composed desktop that shows the change | crosses clocks, ± mapping error |
| SendInput → capture (end to end) | `SendInput` | the first capture that shows the change | QPC only |

"Capture" is a `BitBlt` (`SRCCOPY | CAPTUREBLT`) of a 12×12 (key) or 10×10 (drag) pixel region of the desktop composed by DWM, polled every 4.2 ms on average (P95 5.5 ms). It is a display-side measurement on the composed desktop, **not photon latency**: scan-out and panel response are not included, and no photodiode or high-speed camera was used. The capture adds up to one poll interval.

Frame figures come from the in-app probe: rAF callback intervals, world submissions (WebGL2 `flush`), frames the renderer skipped because two earlier frames were still on the GPU ("deferred by fence credit"), CPU time from frame start to submission, Runtime frame time and the WebGL2 `EXT_disjoint_timer_query_webgl2` timer around the world pass. System present statistics (PresentMon/ETW) are **N/A**: PresentMon needs an elevated session, which was not available unattended. Submissions per second are therefore app-side, not displayed frames.

Clock mapping: the probe makes round trips page → collector (QPC) → page about every 10 s; the round trip with the shortest duration gives the offset and its half round trip is the stated error (1.0–1.9 ms in these runs). Values on one clock carry no mapping error. An input record is accepted only if the handler time is not earlier than the send time minus that error.

## Conditions

- Windows 11 Pro 10.0.26200, AMD Ryzen 9 8945HX (16 cores / 32 threads), NVIDIA GeForce RTX 5060 Laptop GPU (driver 32.0.16.1664), internal panel 2560×1600 at 240 Hz.
- Windows display scaling 150 % (144 DPI), Balanced power plan, on AC power.
- Nova_A desktop (Tauri 2, Microsoft Edge WebView2 Runtime 143.0.3650.96), WebGL2 backend, editor window maximized (client 2560×1460 physical pixels), simulation and rendering on the main thread, `SendInput` on the same machine.
- Scene: `LatencyTest.nova` — the Platformer template (tile map, ground, platform, player, 2D point light with soft shadows, UI canvas) plus a white 3×3 marker whose `fixed_update` moves it on screen while `input_down("Jump")` (Space) is true. Fixed step 60 Hz unless stated. Key tests in editor Play; drag tests in editor Design view with the Select tool.
- Builds compared: **26.40** = the committed 26.40 source plus only the opt-in probe (`bprobe`), and the unmodified 26.40 executable for end-to-end only (`base`); **26.41** = the packaged release portable executable (`rel`). Development builds of 26.41 (`a3` = CPU work only, `a4` = with the lighting fix) and two scene variants are listed as diagnostics.
- Each key or drag run: 5 warm-up + 100 measured trials, down and up edges (or right and back moves) both recorded. Each frames run: 60 s of play with an A/D move and a Space jump every second. P99 is shown only where n ≥ 200.

## Results: 26.40 against 26.41

`base` = unmodified 26.40 executable (end to end only), `bprobe` = 26.40 source with only the probe added, `rel` = the 26.41 release portable executable. Each cell is mean / P50 / P95 (/ P99 where n ≥ 200) in milliseconds with the sample count.

#### key — down edge (mean / P50 / P95 [/ P99] ms)

| Stage | base | bprobe | rel |
| --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | N/A | 8.3 / 6.9 / 15.0 (n=100) | 5.8 / 5.6 / 8.5 (n=100) |
| OS event timestamp → handler | N/A | 5.5 / 4.2 / 11.8 (n=100) | 2.5 / 2.4 / 4.9 (n=100) |
| handler → Runtime fixed step consumed | N/A | 4.2 / 4.5 / 10.2 (n=100) | 6.4 / 5.6 / 11.7 (n=100) |
| consumed → first WebGL2 world submit (flush) | N/A | 11.3 / 10.6 / 16.4 (n=100) | 4.1 / 3.6 / 6.1 (n=100) |
| handler → submit (inputToSubmit) | N/A | 15.5 / 14.9 / 21.6 (n=100) | 10.5 / 9.8 / 16.4 (n=100) |
| submit → change seen in desktop capture (cross-clock) | N/A | 17.7 / 17.7 / 23.8 (n=100) | 6.6 / 6.7 / 9.2 (n=100) |
| SendInput → change seen in desktop capture (end to end) | 42.4 / 42.1 / 54.6 (n=100) | 41.4 / 41.4 / 51.3 (n=100) | 23.0 / 23.1 / 31.0 (n=100) |

#### key — up edge (mean / P50 / P95 [/ P99] ms)

| Stage | base | bprobe | rel |
| --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | N/A | 7.2 / 6.4 / 12.9 (n=100) | 5.4 / 5.3 / 8.5 (n=100) |
| OS event timestamp → handler | N/A | 4.6 / 3.6 / 10.1 (n=100) | 2.1 / 2.0 / 4.7 (n=100) |
| handler → Runtime fixed step consumed | N/A | 4.6 / 4.6 / 10.1 (n=100) | 6.3 / 6.8 / 11.8 (n=100) |
| consumed → first WebGL2 world submit (flush) | N/A | 11.0 / 10.3 / 15.8 (n=100) | 4.1 / 3.7 / 5.8 (n=100) |
| handler → submit (inputToSubmit) | N/A | 15.6 / 15.0 / 24.6 (n=100) | 10.4 / 11.0 / 15.5 (n=100) |
| submit → change seen in desktop capture (cross-clock) | N/A | 17.5 / 16.7 / 24.3 (n=100) | 6.7 / 6.6 / 8.7 (n=100) |
| SendInput → change seen in desktop capture (end to end) | 40.6 / 39.9 / 51.2 (n=100) | 40.3 / 40.1 / 50.9 (n=100) | 22.5 / 22.9 / 29.6 (n=100) |

Clock mapping error (± half the best round trip): base: N/A, bprobe: 1.00 ms, rel: 1.60 ms

#### drag — move-right edge (mean / P50 / P95 [/ P99] ms)

| Stage | base | bprobe | rel |
| --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | N/A | 3.4 / 3.0 / 8.5 (n=100) | 2.2 / 2.0 / 6.0 (n=100) |
| OS event timestamp → handler | N/A | 3.8 / 3.6 / 7.8 (n=100) | 2.8 / 3.1 / 4.3 (n=100) |
| handler → editor command applied | N/A | 0.1 / 0.1 / 0.2 (n=100) | 0.1 / 0.1 / 0.2 (n=100) |
| applied → first WebGL2 world submit (flush) | N/A | 4.1 / 2.8 / 12.0 (n=100) | 2.4 / 2.4 / 3.0 (n=100) |
| handler → submit (inputToSubmit) | N/A | 4.2 / 2.9 / 12.1 (n=100) | 2.5 / 2.4 / 3.1 (n=100) |
| submit → change seen in desktop capture (cross-clock) | N/A | 28.9 / 27.5 / 39.7 (n=100) | 10.6 / 11.0 / 15.5 (n=100) |
| SendInput → change seen in desktop capture (end to end) | N/A | 36.5 / 36.5 / 43.1 (n=100) | 15.3 / 15.1 / 18.7 (n=100) |

#### drag — move-back edge (mean / P50 / P95 [/ P99] ms)

| Stage | base | bprobe | rel |
| --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | N/A | 4.4 / 3.7 / 10.6 (n=100) | 1.8 / 1.3 / 6.2 (n=100) |
| OS event timestamp → handler | N/A | 3.4 / 3.5 / 7.8 (n=100) | 2.7 / 3.1 / 4.0 (n=100) |
| handler → editor command applied | N/A | 0.1 / 0.1 / 0.2 (n=100) | 0.1 / 0.1 / 0.2 (n=100) |
| applied → first WebGL2 world submit (flush) | N/A | 4.5 / 2.9 / 11.8 (n=100) | 2.4 / 2.4 / 2.9 (n=100) |
| handler → submit (inputToSubmit) | N/A | 4.6 / 3.0 / 11.9 (n=100) | 2.5 / 2.5 / 3.0 (n=100) |
| submit → change seen in desktop capture (cross-clock) | N/A | 27.4 / 25.6 / 39.1 (n=100) | 10.7 / 10.8 / 16.0 (n=100) |
| SendInput → change seen in desktop capture (end to end) | N/A | 36.4 / 36.6 / 43.1 (n=100) | 15.0 / 14.8 / 18.3 (n=100) |

Clock mapping error (± half the best round trip): base: N/A, bprobe: 1.20 ms, rel: 1.90 ms

#### Frames (play mode, real input every second)

| Metric | base | bprobe | rel |
| --- | --- | --- | --- |
| Recorded seconds | N/A | 67.0 | 67.0 |
| rAF callbacks | N/A | 7590 | 15843 |
| World submissions | N/A | 6570 | 15636 |
| Deferred by fence credit | N/A | 1020 (13 %) | 207 (1 %) |
| Submissions per second | N/A | 98.1 | 233.4 |
| rAF interval ms | N/A | 8.8 / 8.3 / 16.6 / 16.8 (n=7589) | 4.2 / 4.2 / 4.3 / 8.3 (n=15842) |
| Submission interval ms | N/A | 10.2 / 10.8 / 18.0 / 21.0 (n=6569) | 4.3 / 3.8 / 6.5 / 8.8 (n=15635) |
| CPU frame start → submit ms | N/A | 7.1 / 8.8 / 11.5 / 12.7 (n=6570) | 2.3 / 1.9 / 4.2 / 5.0 (n=15636) |
| Simulation (Runtime frame) ms | N/A | 5.4 / 7.3 / 10.1 / 11.0 (n=7590) | 1.2 / 0.7 / 2.9 / 3.3 (n=15843) |
| Render → submit ms | N/A | 1.2 / 1.1 / 1.6 / 2.4 (n=6570) | 1.1 / 1.1 / 1.5 / 2.1 (n=15636) |
| GPU timer (world pass) ms | N/A | 0.010 / 0.005 / 0.014 / 0.020 (n=7590) | 0.008 / 0.006 / 0.008 / 0.010 (n=15843) |
| Submission gaps > 8.3 / 16.7 / 33.3 ms | N/A | 4106 / 531 / 3 | 197 / 1 / 0 |

## Diagnostic runs

`new` = 26.41 development build with the lighting fix (same code as the release apart from the crash-recovery wait for a launched project); `new-nolight` = same build, the scene's 2D light disabled; `new-240hz` = same build, the project's fixed step raised from 60 Hz to 240 Hz. They isolate the lighting overlay and the fixed step and are not release defaults.

#### key — down edge (mean / P50 / P95 [/ P99] ms)

| Stage | bprobe | new | new-nolight | new-240hz | rel |
| --- | --- | --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | 8.3 / 6.9 / 15.0 (n=100) | 5.4 / 5.4 / 7.6 (n=100) | 5.4 / 5.1 / 8.3 (n=100) | 5.7 / 5.4 / 9.3 (n=100) | 5.8 / 5.6 / 8.5 (n=100) |
| OS event timestamp → handler | 5.5 / 4.2 / 11.8 (n=100) | 2.4 / 2.5 / 4.1 (n=100) | 2.3 / 1.9 / 5.1 (n=100) | 3.5 / 3.3 / 6.5 (n=100) | 2.5 / 2.4 / 4.9 (n=100) |
| handler → Runtime fixed step consumed | 4.2 / 4.5 / 10.2 (n=100) | 7.0 / 7.6 / 11.9 (n=100) | 6.9 / 6.0 / 12.3 (n=100) | 0.5 / 0.5 / 0.7 (n=100) | 6.4 / 5.6 / 11.7 (n=100) |
| consumed → first WebGL2 world submit (flush) | 11.3 / 10.6 / 16.4 (n=100) | 4.0 / 3.7 / 5.9 (n=100) | 3.6 / 3.4 / 4.8 (n=100) | 4.5 / 4.2 / 7.1 (n=100) | 4.1 / 3.6 / 6.1 (n=100) |
| handler → submit (inputToSubmit) | 15.5 / 14.9 / 21.6 (n=100) | 11.0 / 11.2 / 15.7 (n=100) | 10.5 / 9.5 / 16.0 (n=100) | 5.0 / 4.7 / 7.7 (n=100) | 10.5 / 9.8 / 16.4 (n=100) |
| submit → change seen in desktop capture (cross-clock) | 17.7 / 17.7 / 23.8 (n=100) | 7.0 / 6.9 / 9.9 (n=100) | 3.1 / 2.6 / 6.5 (n=100) | 7.6 / 7.7 / 9.7 (n=100) | 6.6 / 6.7 / 9.2 (n=100) |
| SendInput → change seen in desktop capture (end to end) | 41.4 / 41.4 / 51.3 (n=100) | 23.3 / 22.9 / 29.9 (n=100) | 18.9 / 18.5 / 26.7 (n=100) | 18.3 / 18.6 / 23.3 (n=100) | 23.0 / 23.1 / 31.0 (n=100) |

#### key — up edge (mean / P50 / P95 [/ P99] ms)

| Stage | bprobe | new | new-nolight | new-240hz | rel |
| --- | --- | --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | 7.2 / 6.4 / 12.9 (n=100) | 5.3 / 5.0 / 8.8 (n=100) | 4.8 / 4.8 / 6.6 (n=100) | 5.6 / 5.5 / 8.8 (n=100) | 5.4 / 5.3 / 8.5 (n=100) |
| OS event timestamp → handler | 4.6 / 3.6 / 10.1 (n=100) | 2.3 / 1.9 / 5.4 (n=100) | 1.8 / 1.7 / 3.4 (n=100) | 3.4 / 3.3 / 6.0 (n=100) | 2.1 / 2.0 / 4.7 (n=100) |
| handler → Runtime fixed step consumed | 4.6 / 4.6 / 10.1 (n=100) | 7.4 / 8.8 / 12.2 (n=100) | 7.3 / 8.2 / 12.6 (n=100) | 0.4 / 0.4 / 0.5 (n=100) | 6.3 / 6.8 / 11.8 (n=100) |
| consumed → first WebGL2 world submit (flush) | 11.0 / 10.3 / 15.8 (n=100) | 4.2 / 3.9 / 6.3 (n=100) | 3.6 / 3.4 / 4.8 (n=100) | 4.5 / 4.2 / 6.8 (n=100) | 4.1 / 3.7 / 5.8 (n=100) |
| handler → submit (inputToSubmit) | 15.6 / 15.0 / 24.6 (n=100) | 11.6 / 12.9 / 16.4 (n=100) | 10.9 / 11.5 / 16.2 (n=100) | 4.9 / 4.5 / 7.2 (n=100) | 10.4 / 11.0 / 15.5 (n=100) |
| submit → change seen in desktop capture (cross-clock) | 17.5 / 16.7 / 24.3 (n=100) | 7.0 / 6.9 / 9.7 (n=100) | 2.8 / 2.7 / 6.1 (n=100) | 7.9 / 8.0 / 9.8 (n=100) | 6.7 / 6.6 / 8.7 (n=100) |
| SendInput → change seen in desktop capture (end to end) | 40.3 / 40.1 / 50.9 (n=100) | 23.9 / 25.0 / 31.4 (n=100) | 18.5 / 18.7 / 25.2 (n=100) | 18.3 / 17.8 / 23.2 (n=100) | 22.5 / 22.9 / 29.6 (n=100) |

Clock mapping error (± half the best round trip): bprobe: 1.00 ms, new: 1.55 ms, new-nolight: 1.40 ms, new-240hz: 2.30 ms, rel: 1.60 ms

#### drag — move-right edge (mean / P50 / P95 [/ P99] ms)

| Stage | bprobe | new | new-nolight | new-240hz | rel |
| --- | --- | --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | 3.4 / 3.0 / 8.5 (n=100) | 2.4 / 2.1 / 6.0 (n=100) | N/A | N/A | 2.2 / 2.0 / 6.0 (n=100) |
| OS event timestamp → handler | 3.8 / 3.6 / 7.8 (n=100) | 2.8 / 3.2 / 4.3 (n=100) | N/A | N/A | 2.8 / 3.1 / 4.3 (n=100) |
| handler → editor command applied | 0.1 / 0.1 / 0.2 (n=100) | 0.1 / 0.1 / 0.2 (n=100) | N/A | N/A | 0.1 / 0.1 / 0.2 (n=100) |
| applied → first WebGL2 world submit (flush) | 4.1 / 2.8 / 12.0 (n=100) | 2.3 / 2.3 / 3.0 (n=100) | N/A | N/A | 2.4 / 2.4 / 3.0 (n=100) |
| handler → submit (inputToSubmit) | 4.2 / 2.9 / 12.1 (n=100) | 2.4 / 2.4 / 3.1 (n=100) | N/A | N/A | 2.5 / 2.4 / 3.1 (n=100) |
| submit → change seen in desktop capture (cross-clock) | 28.9 / 27.5 / 39.7 (n=100) | 10.5 / 10.8 / 16.3 (n=100) | N/A | N/A | 10.6 / 11.0 / 15.5 (n=100) |
| SendInput → change seen in desktop capture (end to end) | 36.5 / 36.5 / 43.1 (n=100) | 15.3 / 15.2 / 19.6 (n=100) | N/A | N/A | 15.3 / 15.1 / 18.7 (n=100) |

#### drag — move-back edge (mean / P50 / P95 [/ P99] ms)

| Stage | bprobe | new | new-nolight | new-240hz | rel |
| --- | --- | --- | --- | --- | --- |
| SendInput → app handler (cross-clock) | 4.4 / 3.7 / 10.6 (n=100) | 2.3 / 2.3 / 6.4 (n=100) | N/A | N/A | 1.8 / 1.3 / 6.2 (n=100) |
| OS event timestamp → handler | 3.4 / 3.5 / 7.8 (n=100) | 2.6 / 3.1 / 4.1 (n=100) | N/A | N/A | 2.7 / 3.1 / 4.0 (n=100) |
| handler → editor command applied | 0.1 / 0.1 / 0.2 (n=100) | 0.1 / 0.1 / 0.2 (n=100) | N/A | N/A | 0.1 / 0.1 / 0.2 (n=100) |
| applied → first WebGL2 world submit (flush) | 4.5 / 2.9 / 11.8 (n=100) | 2.3 / 2.4 / 2.9 (n=100) | N/A | N/A | 2.4 / 2.4 / 2.9 (n=100) |
| handler → submit (inputToSubmit) | 4.6 / 3.0 / 11.9 (n=100) | 2.4 / 2.4 / 2.9 (n=100) | N/A | N/A | 2.5 / 2.5 / 3.0 (n=100) |
| submit → change seen in desktop capture (cross-clock) | 27.4 / 25.6 / 39.1 (n=100) | 10.5 / 11.2 / 15.1 (n=100) | N/A | N/A | 10.7 / 10.8 / 16.0 (n=100) |
| SendInput → change seen in desktop capture (end to end) | 36.4 / 36.6 / 43.1 (n=100) | 15.3 / 15.4 / 18.5 (n=100) | N/A | N/A | 15.0 / 14.8 / 18.3 (n=100) |

Clock mapping error (± half the best round trip): bprobe: 1.20 ms, new: 1.85 ms, new-nolight: N/A, new-240hz: N/A, rel: 1.90 ms

#### Frames (play mode, real input every second)

| Metric | bprobe | new | new-nolight | new-240hz | rel |
| --- | --- | --- | --- | --- | --- |
| Recorded seconds | 67.0 | 67.0 | 67.0 | N/A | 67.0 |
| rAF callbacks | 7590 | 15828 | 16030 | N/A | 15843 |
| World submissions | 6570 | 15647 | 16018 | N/A | 15636 |
| Deferred by fence credit | 1020 (13 %) | 181 (1 %) | 12 (0 %) | N/A | 207 (1 %) |
| Submissions per second | 98.1 | 233.6 | 239.1 | N/A | 233.4 |
| rAF interval ms | 8.8 / 8.3 / 16.6 / 16.8 (n=7589) | 4.2 / 4.2 / 4.3 / 8.3 (n=15827) | 4.2 / 4.2 / 4.3 / 4.4 (n=16029) | N/A | 4.2 / 4.2 / 4.3 / 8.3 (n=15842) |
| Submission interval ms | 10.2 / 10.8 / 18.0 / 21.0 (n=6569) | 4.3 / 3.9 / 6.5 / 8.8 (n=15646) | 4.2 / 4.0 / 6.4 / 7.4 (n=16017) | N/A | 4.3 / 3.8 / 6.5 / 8.8 (n=15635) |
| CPU frame start → submit ms | 7.1 / 8.8 / 11.5 / 12.7 (n=6570) | 2.3 / 1.9 / 4.2 / 5.0 (n=15647) | 2.2 / 1.8 / 3.9 / 4.8 (n=16018) | N/A | 2.3 / 1.9 / 4.2 / 5.0 (n=15636) |
| Simulation (Runtime frame) ms | 5.4 / 7.3 / 10.1 / 11.0 (n=7590) | 1.2 / 0.7 / 2.9 / 3.4 (n=15828) | 1.2 / 0.7 / 2.8 / 3.3 (n=16030) | N/A | 1.2 / 0.7 / 2.9 / 3.3 (n=15843) |
| Render → submit ms | 1.2 / 1.1 / 1.6 / 2.4 (n=6570) | 1.1 / 1.1 / 1.5 / 2.1 (n=15647) | 1.1 / 1.0 / 1.4 / 1.9 (n=16018) | N/A | 1.1 / 1.1 / 1.5 / 2.1 (n=15636) |
| GPU timer (world pass) ms | 0.010 / 0.005 / 0.014 / 0.020 (n=7590) | 0.007 / 0.006 / 0.008 / 0.010 (n=15828) | 0.007 / 0.007 / 0.008 / 0.010 (n=16030) | N/A | 0.008 / 0.006 / 0.008 / 0.010 (n=15843) |
| Submission gaps > 8.3 / 16.7 / 33.3 ms | 4106 / 531 / 3 | 198 / 3 / 0 | 51 / 4 / 0 | N/A | 197 / 1 / 0 |

## Reading the results

- **End to end.** On the same scene, a key press reached the screen capture in 23.1 ms (P50) with 26.41 against 41.4 ms with 26.40 + probe and 42.1 ms with the unmodified 26.40 executable (P95 31.0 vs 51.3 / 54.6 ms). An editor drag fell from 36.5 to 15.1 ms (P50). The probe itself does not move the end-to-end figure (26.40 with and without it: 41.4 vs 42.1 ms P50).
- **Where 26.40 lost the time.** The 2D lighting overlay drew every shadow edge as a separately blurred full-canvas fill. The GPU work this caused capped the display pipeline at about 98 world submissions per second on the 240 Hz panel, deferred 13 % of frames at the fence credit limit and left each submitted frame waiting 17.7 ms (P50) before it appeared in the capture. With one fill per shadow caster the release submits 233 frames per second, defers 1 % and shows a frame 6.7 ms after submission. Without the light at all (diagnostic `new-nolight`) the figures are 239 per second and 2.6 ms, so the remaining lighting cost is about 4 ms of display-side delay.
- **CPU work alone was not enough.** The first 26.41 development build (plain-object play frames, batched coverage and profiler, no lighting change; `results-pilot/new-*`) cut the Runtime frame from 5.4 to 1.5 ms (mean) but still measured 41.7 ms end to end and 93 submissions per second: frames were produced earlier and then waited longer behind the GPU-bound overlay. Both changes were needed.
- **Runtime frame.** Simulation (Runtime frame) time fell from 5.4 ms mean / 7.3 ms P50 to 1.2 / 0.7 ms; CPU time from frame start to the world submission from 7.1 to 2.3 ms mean.
- **Input handling.** The handler now runs 2.4 ms (P50) after the OS event time stamp instead of 4.2 ms, because the main thread is free more often.
- **Fixed step.** With the project's 60 Hz fixed step a key waits on average about half a step for the next fixed update (handler → consumed 5.6 ms P50, up to about 12 ms). The same scene at a 240 Hz fixed step (`new-240hz`, a project setting, not an engine default) measured 18.6 ms end to end (P50) and 4.7 ms handler → submit.
- **GPU timer.** `EXT_disjoint_timer_query_webgl2` is available in this WebView2 and reports 5–8 µs for the WebGL2 world pass of this scene. The lighting overlay is drawn with Canvas 2D on a separate canvas and is not covered by that timer, so the timer does not show the cost that dominated 26.40; it is reported as measured, not as total GPU time. The per-frame value is the last completed sample.
- **Not measured.** System present statistics (PresentMon/ETW, needs elevation), photon latency (no photodiode or camera), the exported Player (the Windows export of the generated test project was blocked by a build validation error reporting that its audio asset could not be fetched during Play; the test project, not a shipped template, was the likely cause, and this was not investigated further), other machines, refresh rates, Linux and the Web build.

## Raw records

In the release evidence archive under `latency/` (and in `.cache/_latency/` on the build machine):

- `results/<label>-<mode>-trials.json` — harness log and every trial (QPC send and capture times, capture polls, calibration levels and region).
- `results/<label>-<mode>-probe.jsonl` — every batch the app posted (clock syncs, input records, frame records).
- `results/<label>-<mode>-joined.csv`, `-frames.csv`, `-summary.json` — the joined per-trial stages, per-frame records and the summary used for the tables.
- `results/h-<label>-<mode>.log` — harness console output.
- `results-pilot/` — the first runs of the day, kept for reference: they used the end of `SendInput` as the send time and a wider matching window, and one run picked a wrong capture region automatically (`*-badroi*`); none of them is used in the tables.
- `sysinfo.txt` (machine summary, user paths removed), `LatencyTest*.nova`, the build identities with SHA-256 (`builds.txt`), the command files used for each run (`harness-commands/`) and the scripts that produced everything (`scripts/latency/` in the source).

## Reproduce

On Windows with Python 3 and NumPy:

```
set NOVA_LATENCY_PROBE=http://127.0.0.1:8765
start "" Nova_A-v26.41-windows-x64-portable.exe LatencyTest.nova
rem Play, click the status bar once, then:
python scripts\latency\nova_latency_harness.py key    --image Nova_A-v26.41-windows-x64-portable.exe --out results --label rel --trials 100 --key SPACE --roi <x> <y>
python scripts\latency\nova_latency_harness.py frames --image Nova_A-v26.41-windows-x64-portable.exe --out results --label rel --seconds 60
rem Stop, then with the marker visible in Design view:
python scripts\latency\nova_latency_harness.py drag   --image Nova_A-v26.41-windows-x64-portable.exe --out results --label rel --trials 100 --at <x> <y> --dx 220
python scripts\latency\analyze_latency.py results\rel-key
python scripts\latency\report_latency.py results bprobe,rel
```

`--roi` and `--at` are physical screen pixels inside the marker; without `--roi` the harness searches for the region that changes, which can pick an unrelated changing element.
