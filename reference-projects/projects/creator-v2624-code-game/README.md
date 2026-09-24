# Nova 26.24 Coin Trail — code

Public release **26.24** · Engine **26.24.0** · Project Format 2/schema 29.

1. In Script convert the linked Rhai file to structural nodes, drag a declaration and arrange the graph. **Expected:** The completed drag pins the declaration; normal arrangement preserves it and explicit rearrangement including pins may move it. Undo restores geometry and pin state.

2. Rename a scoped binding, reorder function parameters and change a literal; return to code, undo/redo, save, reopen and export. **Expected:** Source comments and binding scope survive. Signature order has real call semantics; unsafe cross-module renames are rejected before mutation.

3. Choose Chinese or German, enter const broken; and try switching to graph; expand original diagnostic details, then repair the draft. **Expected:** Localized explanation is shown with the unchanged original message. Invalid conversion preserves the exact draft.

4. Open New, cancel a named draft, reopen it; use More to locate migration and recovery. **Expected:** All40 templates and the draft remain accessible.

5. Play, inspect script diagnostics and exported state; download the Web ZIP and serve beneath a nested path. **Expected:** Compatible state and gameplay remain equivalent; hosted files require no editor application backend.

6. Enter an invalid numeric expression, attempt Save, then press Escape and save again. **Expected:** The invalid draft remains visible and blocks the first save; Escape restores the saved value.

7. Drag an inspector slider for more than two seconds, release it and undo once. **Expected:** One Undo restores the pre-drag value. Separate fields remain separate history entries.

8. Import a short WAV in Audio mixer, add a loop region, edit an endpoint past the other endpoint, then correct it. **Expected:** The invalid draft does not remove the loop region; the corrected value persists through save/reopen.

9. In Settings choose Automatic or Above controls labels, enlarge text to 200%, and focus a long dropdown value. **Expected:** Labels stack and the full selected value appears in a wrapping tooltip without changing project data.

10. Edit Player X and Y rapidly, then undo twice, redo, save/reopen and export. **Expected:** Each field is independently undoable; saved and exported positions agree.

11. Play the game with WASD/arrow keys; collect six checkpoints in order and press R to restart. **Expected:** Movement, checkpoint progression and restart work in the editor and exported player.

12. Change speed in the matching Code, Blocks or Mixed workflow, undo/redo, save/reopen and export Web. **Expected:** Supported graph/code conversion and the authored speed remain equivalent in the exported game.

13. Open Rendering → Quality. Compare Auto/MSAA4 and resolution scales1/1.5; keep all animations and effects enabled. **Expected:** Actual pixel/sample counters explain the device result. Higher scale increases backing pixels within bounds; no gameplay or animation system is removed.

See docs/QUALIFICATION_LESSON_26_24.en.md (also .de.md and .zh.md). Only source-bound executed reports qualify behavior; external platform and independent audits remain separately pending.
