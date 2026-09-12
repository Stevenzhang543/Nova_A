# Nova 26.21 Output Quality Workshop

Public release **26.21** · Engine **26.21.0** · Project Format 2/schema 29.

1. In Settings choose Automatic or Above controls labels, enlarge text to 200%, and focus a long dropdown value. **Expected:** Labels stack and the full selected value appears in a wrapping tooltip without changing project data.

2. Edit Player X and Y rapidly, then undo twice, redo, save/reopen and export. **Expected:** Each field is independently undoable; saved and exported positions agree.

3. Play the game with WASD/arrow keys; collect six checkpoints in order and press R to restart. **Expected:** Movement, checkpoint progression and restart work in the editor and exported player.

4. Change speed in the matching Code, Blocks or Mixed workflow, undo/redo, save/reopen and export Web. **Expected:** Supported graph/code conversion and the authored speed remain equivalent in the exported game.

5. Open Rendering → Quality. Compare Auto/MSAA4 and resolution scales1/1.5; keep all animations and effects enabled. **Expected:** Actual pixel/sample counters explain the device result. Higher scale increases backing pixels within bounds; no gameplay or animation system is removed.

6. Change the editor palette through Settings; switch light/dark and reopen. **Expected:** Editor colors persist independently of game colors and saved project rendering settings.

See docs/QUALIFICATION_LESSON_26_21.en.md (also .de.md and .zh.md). Only source-bound executed reports qualify behavior; external platform and independent audits remain separately pending.
