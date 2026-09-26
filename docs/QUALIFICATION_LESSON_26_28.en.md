## 26.28 — Animation, audio and localized game UI

Engine: **26.28.0** · Project Format 2/schema 29. Open the creator-v2628-animated-menu reference: its timeline owns title animation, music and localized captions; buttons use explicit @timeline actions. Existing games, default animation and quality settings remain supported.

In Animate, select the saved asset, expand the bottom panel and select a track or curve key. Edit the key value or music clip gain, Save the asset draft, then preview, pause and seek. Stop preview restores authored scene state. Undo/redo is an authoring operation; changing the preview playhead does not bake a new key. Inspect long binding paths before retargeting. Save Project, reopen the downloaded file and verify the edited key, caption and gain.

Nested timeline blend-in and blend-out weights must multiply the child animation/audio contribution. Seek and reverse use the same bounded local-time evaluation. Keep frame rate and audio sample rate distinct: presentation frames do not replace the integer audio sample clock. A mixer edit is authored project data; preview transport and temporary listening controls must not silently rewrite it.

In UI localization, choose the project language and edit its translation table. Editor language is a separate setting. Use source-language fallback for missing translations and keep user identifiers unchanged. Game text and accessibility descriptions should update together. Browser shaping and installed/bundled fonts determine glyph coverage; this is not a replacement for a complete independent text engine.

Open a modal while another button has focus: keyboard/controller activation must move into the eligible modal scope. Disabled or hidden controls must not remain actionable. Multiple connected pads must not cause an idle pad to reset a held direction. Native text input retains composition until commit; Escape, arrow keys and Enter during composition belong to the IME. Check RTL slider direction with both keyboard and touch.

Build Web, download its ZIP, serve it over HTTP(S), and test only the exported player: play/pause/skip/resume the cutscene, enter Unicode text and check captions. Automated PCM/DOM tests validate semantics; listening quality, real controllers/mobile IME candidate windows and assistive-technology acceptance require actual devices. Unrelated renderer and template matrices are not repeated in this release.
