# Nova_A 26.22 — transaction and property workshop

Development acceptance guide. The examples target engine 26.22.0, Project Format 2/schema 29; a generated example is not a qualified release.

## Open a reference

Open `creator-v2622-code-game`, `creator-v2622-blocks-game` or `creator-v2622-mixed-game`. Move with WASD/arrows, collect checkpoints and press R to restart. Keep all animations and rendering effects enabled. The output-quality, animated-menu and headless-authority references retain their earlier workflows.

## Edit and undo

Select Player. Edit X and then Y rapidly. Undo once: only Y returns. Undo again: X returns. Redo twice. Drag a numeric slider for more than two seconds, release and undo once. Repeat in a different scene. Save immediately after entering a valid expression such as `120+3`, reopen and inspect the saved value.

Select two objects with different positions. Confirm that a mixed value is identified. Enter a shared value and check both objects. Apply and revert a prefab override, then undo each action. A previously reviewed external merge must be reviewed again if intervening edits make its source stale.

## Correct a rejected draft

Enter `1/0` or a value beyond a field's stated bounds. The draft remains visible with an explanation, while the saved value stays unchanged. Save and playback should wait for correction. Press Escape to restore the saved value, or enter a valid value. Switching an entity or resource must not apply the old draft to the new selection. An unlimited joint limit uses its explicit Unlimited control; a large finite limit remains finite.

## Import settings and audio

Import a short WAV file. Open Audio mixer, choose the asset and add a loop region. Editing its start beyond its end must show a rejected draft and keep the region. Correct it, edit the end, then undo twice; each endpoint should return separately. Drag master gain for more than two seconds and undo once. Repeat numeric editing in asset pixels-per-unit and pivot fields, then save/reopen.

Codec, quality and platform compression choices currently retain import intent; the importer does not transcode the source into those formats. Saved-setting equality is not an audible or visual quality measurement. Playback gain, filtering, loop behavior and exported rendering require their own executed checks.

## Read the controls and verify output

At 100%, 150% and 200% UI scale, narrow and maximize the Inspector and asset/audio panels. Numeric controls should retain at least six readable digit positions; paired fields wrap. Test keyboard stepping and focus, labels, mixed/default/override information and destination resource. Repeat in English, German and Chinese and all five palettes. Report any conditional panel not exercised.

Save, close and reopen. Export Web and repeat the game/menu interaction and changed properties. Compare actual behavior as well as serialized values. Verify prior release checksums before creating the eleven new files under `releases/v26.22`.

## Evidence and limits

Follow `IMPLEMENTATION_TRACKER_26_22.md` for completed checks and `GAP_REGISTER_26_22.md` for unsupported effects. The lifecycle matrix records named dispositions and explicit evidence limits; classification is not a universal field pass. Development reports cannot qualify a frozen release. Independent users, assistive technology, other operating systems, signing, device audio and long-duration soak remain separate external checks.

Project Save, export, Play and single-step stop when a studio has unsaved asset changes. Save that asset in its own editor, or explicitly reload/discard its draft, then retry. Numeric drafts are validated first. The dedicated animation asset preview still supports auditioning an unsaved clip. Unlinking a script from a graph removes the real link marker while preserving source code, string contents and other comments.
