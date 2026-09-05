# Produce an animated menu and a synchronized cutscene

This task joins animation, audio and interface authoring in one saved project. Start with UI Showcase or the current animated-menu reference. Use a disposable copy, keep the original imported media, and save the project before changing the sequence. The reference's expected-output and test-controls files describe its exact authored actions; qualification reports identify the actions actually observed.

## Build and inspect the menu

In Interface, select the menu Canvas and its RectTransform children. Choose the intended reference size and scaling, then inspect anchors, minimum/maximum sizes, safe area, clipping, scrolling and text overflow in the actual preview. A Fixed layout deliberately ignores responsive breakpoints. Negative padding/margins are clamped with a diagnostic; use signed position/anchor offsets for intentional overlap. A parent hidden or clipped by a modal must not leave an active child in the keyboard order. Set useful accessibility names, focusability and reading order. Component-source metadata does not instantiate another UI subtree; use a prefab for linked reusable content.

Open the theme document, set a parent only when inheritance is intended, and override individual tokens or styles. A child should retain only its explicit changes: changing a parent later must still affect inherited values. Spacing tokens affect styles that reference them; they do not silently replace every Panel gap. Save a valid draft, switch away and return, then verify an intentionally invalid draft survives without modifying saved runtime values. Resolve a changed-source conflict explicitly. Duplicate locale ownership and invalid style values are refused.

Use localization keys for visible text and supported label/placeholder bindings. Add EN/DE/ZH values and a fallback locale, then exercise long translations and font fallback. Imported font coverage depends on the font file. CSV retains string and variant cells; PO supports ordinary multiline strings and Nova variant metadata. Indexed gettext plurals require the lossless CSV route. Recheck build inclusion diagnostics: selected tables, their fallback chain and fonts must survive the package. Enter mixed Chinese/Latin text with IME, select and replace part of it, then Tab through controls. Composition Enter must commit text without activating a game action. Editor controls must not feed gameplay shortcuts.

## Author motion with explicit draft ownership

Select a target scene object and open Animation. Choose or create a clip. Add numeric property tracks, target objects, key times and values. Select a key to edit tangent mode, interpolation and easing; use Dope/Curve views for timing and shape. Resize Asset structure and Properties so track names, lanes and fields remain readable; Reset pane sizes restores defaults. Sprite frames use their own durations. Command tracks and markers are discrete side effects: inspect their target and payload separately from continuous value tracks.

Record edits into draft adds keys to the unsaved clip. It does not save on every property change. Save explicitly; malformed or non-finite values must remain in the draft with an exact field diagnostic. A recording is bounded to100 tracks and10,000 keys per track. A capacity refusal must not half-write a new track. Switching assets/workspaces and Save/Discard/Cancel project departure retain the six supported document kinds: clip, controller, mask, rig, skin and timeline.

Save first, then select Preview saved asset. This starts an owned Play session using the actual runtime evaluator. Pause or change Evaluated runtime time to inspect a pose. Seeking suppresses commands crossed by the jump. Stop preview and restore scene returns authored values; a later external Play session cannot be adopted or stopped by an old preview owner. Runtime recording captures evaluated poses into an unsaved draft after restoration, so Stop cannot erase a newly recorded asset. Save that draft and reopen it.

## Controllers, rigs and root motion

Create controller parameters, states and transitions. Check source/destination, conditions, exit time, blend duration, destination offset, interruption and marker/normalized synchronization. Test a transition at its exact boundary and while another transition is active. Layer masks, additive weights,1D/2D blend children and synchronized timing use the same evaluator as Play. A zero-weight layer still advances its clock; it does not contribute a pose. Trigger lifetime must not cause a later unrelated transition.

For rigs, verify bone parent/rest transforms and skin weights before animation. Exercise IK, constraints, retargeted rest-relative motion and mirrored binds on the intended objects. Invalid indices/cycles and excessive work must produce a diagnosis. Root-motion Apply retains absolute authored root position/rotation sampling. Ignore suppresses root position/rotation while retaining scale. Accumulated movement is an explicit animationRootMotionDelta/applyAnimationRootMotion API choice; existing scenes do not silently become delta-driven. Test a complete loop and a backward seek, especially when gameplay also moves the object. Curve splitting may bake to bounded linear keys at1e-6 sampled tolerance; it can refuse excessive work instead of claiming exact symbolic equality.

## Put sound and captions on the timeline

Create timeline tracks and bind the intended scene objects/assets. Set clip start, duration, source offset, playback rate and gain envelope; verify every visibility, animation, audio, nested timeline, command and subtitle track used by the sequence. Place captions over their intended intervals and wire Skip through the reference's visible action to the actual timeline target. Seeking must reconstruct the current subtitle/pose without firing every skipped command. Overlapping audio clips need independent voices; nested rates must reach audio as well as animation.

In Audio, select the clip and Mixer audition bus. Inspect Output bus, sends and supported low/high-pass, compressor, delay and reverb fields. Audition uses a separate instance of the game mixer; stopping it must not stop unrelated game audio. Loop/trim and waveform edits remain explicit undoable operations. Meter labels are RMS/sample-peak estimates, not BS.1770 loudness or oversampled true peak. Watch Transport clock, sample position and real voice status while pausing/seeking the timeline.

The shared media clock follows evaluated fixed simulation steps. Pause freezes transport; paused single-step evaluates the pose/sample position while sound remains paused. Buffered signed rates are bounded; streaming uses browser media transport and unsupported rates pause with a diagnostic. Use Stream for media exceeding the decoded cache budget. Decode limits are64MiB resident PCM,32MiB per clip and16 pending decodes; device latency and streaming recovery require matching hardware tests.

## Finish and audit the exact project

Play the complete menu and cutscene, start music, observe caption boundaries, pause/resume, seek backward and forward, loop, reach the end and Skip. Stop and repeat: listeners, voices, previews and native text bridges must be disposed. Check narrow panes, both themes, all three languages and100/150/200% UI scale. Test touch press/cancel, keyboard navigation and IME separately.

Save, reload the application and use Open to select the downloaded project. Repeat the exact sequence. Build its Web output, serve the extracted complete ZIP over HTTP, and repeat in the exported player. Use the actual qualified Windows build for native export checks. Confirm locale/font/audio dependencies, captions, focus and Skip survive. Retain failing cases and downloaded artifacts with hashes. Fixed-frame/sample and package tests are programmer evidence; physical sound quality, screen readers, low-end hardware and long-duration soak need their own observations.


## Bind the reference actions and preserve the saved result

Select a menu Button, open Timeline action in its Inspector, and choose Play, Pause, Skip or Resume. These explicit @timeline:play/pause/skip/resume values use the nearest enabled TimelinePlayer on the button or a parent. Put the shared player on the menu Canvas; no Script2D or embedded target UUID is needed. Choosing Custom callback restores the prior script callback. The reference uses a30-second sequence, an Arrival marker at20seconds and an Introduction marker at0seconds. Pause retains the current position; Skip honors unskippable clips; Resume starts at the configured marker.

Caption values such as {caption.intro} resolve the clip locale first, then its owner Canvas preview locale, then the project preview locale. Include each table and its fallback fonts. Export discovery includes explicit clip locales and refuses more than64MiB of timeline source text instead of silently omitting dependencies.

The real menu audit edits the title-opacity key from25 to35, music gain from0.65 to0.5 and the Chinese introduction caption, then saves, reopens and runs the downloaded Web ZIP. The generated reference remains a reproducible starting point; the evidence download is the separately observed edited project. Browser recovery copies are optional: a full recovery cache must not prevent an external save. Inspect the Task log if a recovery copy was unavailable, and retain the downloaded project file.
