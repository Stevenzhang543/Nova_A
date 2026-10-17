# Animation, audio and cinematics in Nova_A 5.6

Nova_A 5.6 keeps Project Format 2/schema 29 and upgrades animation-controller and timeline asset documents additively when they are opened. Existing controller v2 and timeline v1 files receive safe v3/v2 defaults in memory and are only rewritten when the user saves the asset.

## Animator workflow

1. Open **Animation**, create or select an Animator Controller, then add Float/Integer parameters before configuring a blend tree.
2. A **1D** tree interpolates the two clips surrounding the X parameter threshold. A **2D** tree calculates deterministic inverse-distance weights from X/Y positions and blends the nearest four children. Enable synchronized timing to sample every child at the same normalized point even when clip lengths differ.
3. Layers can override or add sampled values. A mask limits a layer to selected properties. A synchronized layer can copy another layer's clock; zero-weight layers do no sampling work.
4. State motion options include a normalized cycle offset, an optional speed parameter, X/Y mirroring and root-motion Apply/Ignore. Ignore prevents owner Transform tracks from moving the object but leaves child-target and visual tracks active.
5. Transitions can start at an exit time and crossfade for a bounded duration. **Normalized Time** carries the source phase into the destination. **Marker** aligns matching named markers. Destination offset adds a normalized phase. Trigger conditions are consumed exactly once.
6. Events and command tracks are globally sorted by crossed time. At the same time, authored events run first, followed by command-track and command order. Loop traversal preserves that order even when one fixed step crosses multiple cycles.
7. Command tracks connect Animation to Method, Audio, direct nested Animation, Timeline, Visual Graph signal and Custom signal behavior. Missing referenced assets are reported by Animation validation.
8. To bake gameplay motion, select the relevant Animator/controller, start simulation, press **Record runtime to clip**, perform the motion, then stop recording. Transform, Sprite opacity and UI opacity are sampled at the selected frame rate, reduced without changing the curve beyond the configured tolerance, and saved under `Assets/Animations/Recordings` or back to the selected clip.

## Cinematic timeline workflow

1. Create a Timeline, add tracks, and place clips. All clips persist offset, playback rate, blend-in/out, target, payload, locale, safe-area and skip metadata.
2. **Nested Timeline** clips sample another timeline using their local offset and rate. Recursion is cycle-protected and bounded to eight levels.
3. **Marker** controls identify chapters and synchronization points. Assign Skip and Resume markers. A TimelinePlayer can skip to the configured/following marker and resume at the configured marker or last unskipped position.
4. **Audio** tracks start an AudioSource at the clip offset. Moving a paused TimelinePlayer playhead seeks the bound source without starting an extra voice.
5. **Camera** tracks activate a Camera2D target. Blend-in/out interpolates world position, rotation, orthographic size, zoom and background color from the previous camera.
6. **Subtitle** tracks draw a localized, screen-reader-announced caption overlay. TitleSafe uses the central 80%, ActionSafe 90%, and FullFrame 96%. The cinematic validator warns about empty, overly long or too-fast captions.
7. **Branch** clips jump to their marker when their optional JSON condition matches a TimelinePlayer variable, for example `{"variable":"rescued","equals":true}`.
8. Runtime diagnostics show processed clip count, nested depth, update time and a warning when a sequence exceeds the review budget. Validation catches missing targets/assets/markers, camera targets without Camera2D, overlapping blends and subtitle reading risks.

## Waveform and mixer workflow

1. Open **Audio**, choose an imported clip, then click or drag its waveform. Arrow keys nudge the cursor by 10 ms. Drag a range and press **Loop region** to save a named region; choose one as the active loop. Legacy loop start/end remain supported.
2. Preview starts at the waveform cursor. Normalize/target peak and streaming remain import settings. Runtime playback uses the active named loop, bounded by trim markers.
3. Buses retain voice limits, ordered effects, sends and automation. Ducking rules expose trigger/target bus, reduction, attack, release and enabled state.
4. Capture named mixer snapshots, edit their master gain and choose a crossfade duration. Runtime gain nodes transition without discontinuous jumps.
5. Diagnostics report momentary and session-integrated loudness estimates, true peak, crest factor, clipping, latency, underruns, device changes and recovery count. LUFS values are runtime estimates for debugging, not a substitute for a certified broadcast loudness meter.
6. **Recover audio** resumes a suspended context and reselects the requested output. A `devicechange` automatically refreshes devices and executes the same recovery path; failures include a concrete recovery action.

## Qualification boundaries

The deterministic verifier checks migration defaults, 1D/2D authoring data, event ordering across loops, crossfade/synchronization markers, nested/branch/subtitle normalization, loop regions, mixer snapshots/ducking/loudness fields and a 10,000-clip timeline estimate. The browser matrix covers English, German and Chinese at 1024×640, 1366×768, 1920×1080 and 2560×1440/high DPI. Publisher signing, independent devices, real device disconnect/reconnect, matching-host non-Windows builds and wall-clock soak remain external gates and are not claimed by local automation.
