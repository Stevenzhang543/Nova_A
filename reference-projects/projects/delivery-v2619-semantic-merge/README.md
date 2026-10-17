# Nova 26.19 Collaboration Workshop

Public release **26.19** · Engine **26.19.0** · Project Format 2/schema 29.

1. Play and use WASD or arrow keys to collect all six checkpoints in order; press R to restart. **Expected:** Score increases once per checkpoint, completion appears after six, and R resets the route.

2. Edit movement speed in the matching Code, Blocks or Mixed workflow; Undo/Redo, save/reopen, then export Web. **Expected:** The same authored change affects the running editor and exported game; graph conversion preserves supported code.

3. Open Manage → Build Settings; choose Web, then Windows. **Expected:** Web is available in the browser; desktop export requires the actual desktop host. Diagnostics give the missing prerequisite before export.

4. Open this project, select Checkpoint 1 and change Transform position X from -6 to -4. In Manage → Build Settings → Team enable the optional workflow and import incoming.nova. **Expected:** The three-way preview shows base -6, local -4 and incoming -2 for the same identity.

5. Choose the incoming value, apply, Undo, Redo, save/reopen and export Web. **Expected:** X changes to -2, Undo restores -4, Redo restores -2, and save/export retain the merged value. Independent edits survive.

6. Edit again while reviewing a conflict and try to apply the old preview. **Expected:** The stale preview is rejected. Reimport the incoming file to review the latest local document.

See docs/DELIVERY_LESSON_26_19.en.md (also .de.md and .zh.md). Current qualification results live in the source-bound release evidence; matching-host/mobile/signing/disposable installer checks remain separate.
