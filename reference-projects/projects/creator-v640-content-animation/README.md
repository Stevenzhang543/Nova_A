# Nova_A 6.4.0 content and animation audit

Engine **6.4.0** · Project Format 2 · schema 29

Open **project.nova**. The Mouse Knockout game remains playable and exports as **Content Motion Knockout**. In Assets, select **Hero Audit.atlas** and inspect Overview and Slices: two stable frames, 0.5/0.75 pivots, the idle tag, 100 ms timing and collider points must appear. Reorder the source-frame object in an external copy, reimport it, and confirm the stable frame IDs remain. Submit malformed metadata and confirm Nova_A retains the last valid artifact; repair a moved source through the normal source selector.

Select **Shared Surface** and create an override, or inspect **Ice Override**. Change only friction and confirm the resolved preview inherits density/restitution from the parent. Save/reload and run Project Health. Create a parent cycle temporarily and confirm Build blocks it; undo immediately.

In Animation, open **Hero Rig**, choose Root/Hand, inspect the skin-weight heat view, and run bounded Auto weights. Confirm the Hand rotation constraint remains. Enable onion skin, inspect curves, select the root-motion clip and confirm delta (3,4), distance 5. Use retarget preview against another rig and review missing aliases before playback.

Repeat the contextual controls in English, German and Chinese at 100–200% UI scale. Then Play, Build & Run, and confirm the original game behavior and exported visuals are unchanged. Publisher signing, independent clean-machine/hardware/accessibility certification, matching-host non-Windows builds and a real-duration soak remain external gates.
