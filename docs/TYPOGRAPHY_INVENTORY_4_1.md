# Nova_A 4.1 typography inventory

| Surface | Family/role | Notes |
| --- | --- | --- |
| Launcher, menus, workspaces, panels, Inspector, settings | Nunito Sans Variable UI | Noto Sans SC Variable is the controlled CJK fallback. |
| Chinese labels and mixed glyph runs | Noto Sans SC Variable fallback | Loaded locally; no operating-system substitution is required for Simplified Chinese. |
| Script Studio source, Console source locations, hashes, paths, physics telemetry | JetBrains Mono Variable | Noto Sans SC fallback remains available inside mixed code/comments. |
| Canvas text measurement | JetBrains Mono or Nunito/Noto according to component role | Measurement and paint use the same declared family to prevent drift. |
| Game-authored font assets | Project-selected font plus declared project fallbacks | Independent from editor UI preferences. |

The three variable families are imported once in `src/main.ts`, transformed by Vite into local WOFF2 assets, and included in both web and Tauri distributions. `font-display: swap` is supplied by Fontsource. There is no remote font request.

## Size and weight policy

- 11 px is the caption/metadata floor at 100% scale; editable content and primary controls use at least 12–13 px.
- Scale is 100–200%; compact density only reduces padding and control height.
- Body 400, controls/labels 600, headings 650–700 through the variable axis. Synthetic bold/italic is not requested by the editor token system.
- Line height is declared by role. Ellipsis is allowed only when the complete value is available through a title or copyable detail pane.

## Audit notes

Historical component CSS still contains local dimensions for layout and authored previews. v4.1 centralizes the stable editor roles and families; future cleanup must not rewrite game-authored font sizes. The browser matrix covers English, German, Simplified Chinese, long paths, numbers, punctuation, hashes, and script comments.
