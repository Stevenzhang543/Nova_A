# Nova 26.22 Output Quality Workshop

Public release **26.22** · Engine **26.22.0** · Project Format 2/schema 29.

1. Enter an invalid numeric expression, attempt Save, then press Escape and save again. **Expected:** The invalid draft remains visible and blocks the first save; Escape restores the saved value.

2. Drag an inspector slider for more than two seconds, release it and undo once. **Expected:** One Undo restores the pre-drag value. Separate fields remain separate history entries.

3. Import a short WAV in Audio mixer, add a loop region, edit an endpoint past the other endpoint, then correct it. **Expected:** The invalid draft does not remove the loop region; the corrected value persists through save/reopen.

4. In Settings choose Automatic or Above controls labels, enlarge text to 200%, and focus a long dropdown value. **Expected:** Labels stack and the full selected value appears in a wrapping tooltip without changing project data.

5. Edit Player X and Y rapidly, then undo twice, redo, save/reopen and export. **Expected:** Each field is independently undoable; saved and exported positions agree.

6. Play the game with WASD/arrow keys; collect six checkpoints in order and press R to restart. **Expected:** Movement, checkpoint progression and restart work in the editor and exported player.

7. Change speed in the matching Code, Blocks or Mixed workflow, undo/redo, save/reopen and export Web. **Expected:** Supported graph/code conversion and the authored speed remain equivalent in the exported game.

8. Open Rendering → Quality. Compare Auto/MSAA4 and resolution scales1/1.5; keep all animations and effects enabled. **Expected:** Actual pixel/sample counters explain the device result. Higher scale increases backing pixels within bounds; no gameplay or animation system is removed.

9. Change the editor palette through Settings; switch light/dark and reopen. **Expected:** Editor colors persist independently of game colors and saved project rendering settings.

See docs/QUALIFICATION_LESSON_26_22.en.md (also .de.md and .zh.md). Only source-bound executed reports qualify behavior; external platform and independent audits remain separately pending.
