# Nova 26.28 Animated Menu

Public release **26.28** · Engine **26.28.0** · Project Format 2/schema 29.

This deterministic reference extends the UI Showcase without changing any of the40 library entries. Four buttons use explicit @timeline actions and their nearest ancestor TimelinePlayer. The30-second sequence contains a title-opacity animation, generated PCM music and English/German/Chinese captions; Skip selects20seconds and Resume selects0seconds.

1. Select a cutscene Button in the Inspector and choose its Timeline action. **Expected:** Nearest owner resolves to Responsive Canvas; no Script2D is required.

2. Play the game, enter a player name with IME, then activate Play, Pause, Skip and Resume. **Expected:** The title fades, music plays, Pause retains position, Skip shows Arrival and Resume returns to Introduction.

3. Edit a caption translation and switch the project preview locale. **Expected:** Menu labels and captions resolve the selected language; English fallback remains available.

4. Edit the actual timeline and animation assets; save both drafts, save the project and reopen it. **Expected:** Only saved values reach the reopened runtime and no retained draft is silently lost.

5. Build Web and launch only the downloaded archive. **Expected:** The exact edited sequence, menu actions, music, captions and input work in the standalone player.

See the26.28 animation/audio/interface lesson. Generation is a programmer fixture; the separately captured user report records only actions actually performed.
