# Nova_A 26.10 independent usability protocol

Automated clicks can find dead controls; they cannot show that a person understands the editor. Independent observation therefore remains `deferred-external` until participants outside the implementation team complete the protocol.

## Participants and environments

Recruit at minimum three beginners who have not used Nova_A and three experienced 2D-engine users. Include keyboard-first and assistive-technology users when available; do not infer native accessibility from DOM metadata. Record prior experience without collecting unnecessary personal data.

Use the unchanged release candidate across English, German and Chinese, light/dark/high contrast, 100–200% UI scale, reduced motion on/off, pointer, keyboard and gamepad/touch where appropriate. Include the minimum supported viewport and a published low-end machine in the external matrix.

## Beginner tasks

Participants use only the bundled manual and visible UI:

1. Create a project from a suitable template and explain where project data will be stored.
2. Add and transform objects, configure collision layers, save, close and reopen.
3. Build a small playable behavior in Visual Graph, run it, find one validation error and repair it.
4. Switch to Rhai, identify the generated equivalent, make a supported edit and verify the graph remains semantically synchronized.
5. Add UI with score/instructions/completion feedback, configure input, audio and accessibility metadata.
6. Preview, debug a fault, use Undo or Recovery, and confirm the repaired state survives reload.
7. Export and run a standalone game, then locate build diagnostics without developer assistance.

Observe navigation errors, terminology confusion, hidden controls, scrolling/search burden, accidental destructive action, recovery success and whether expected output matches the participant's explanation.

## Expert keyboard-first tasks

1. Import or migrate a historical project after inspecting preview, semantic diff and rollback.
2. Use command palette, shortcuts, workspace switching, hierarchy multi-select/reparent and Inspector multi-edit without pointer dependency.
3. Create equivalent behavior through Rhai, blocks and mixed authoring; compare code/graph/event identities and resolve an unsupported-source Code block without data loss.
4. Profile a representative scene, change an editor performance profile and prove exported gameplay/visual parity.
5. Diagnose physics, renderer, audio and network state from the monitors; reproduce and repair a package/plugin failure.
6. Run deterministic tests, build Web and Windows outputs, verify provenance/checksums and recover from a locked or invalid output path.

## Layout and control observations

For every visited panel record clipping, overlap, offscreen popovers/dialogs, truncated labels without accessible expansion, incorrect focus order, missing accessible names, insufficient hit targets, document-level scrolling, lost selection, delayed input feedback and animation that obscures state. Repeat critical paths with long/pseudo-localized labels and 200% scale.

The automated absolute-control audit remains a separate gate: every stable control ID must be executed with an asserted effect and restored, disabled with an exact reason, exercised in a disposable mock, or classified as genuinely external. “Source-bound” or “context-reviewed” is not an executed user path.

## Evidence and acceptance

Store task start/end, completion, assistance, errors, recovery, route taken, locale/theme/scale/input, anonymized notes, screenshots/video consent status and participant verdict. Do not rewrite failed observations into passes. Severity 0/1 findings block release; Severity 2 needs an owner, workaround and target.

The correct local claim before observation is: “the protocol and automated checks exist; independent beginner/expert and native assistive-technology evidence is pending.”
