# UI v4.7 Multilingual RTL

Engine **5.3.0**, Project Format 2, schema 29.

Required packages: none.

Target platforms: Windows x64 and Web.

## Purpose

English, German, Chinese, Arabic/RTL, pseudolocalization, plural, emoji, combining marks and font fallback.

## Test procedure

1. Open `project.nova` and switch to **UI**.
2. Follow `test-controls.json`.
3. Compare editor and exported Windows/web behavior with `expected-output.json`.
4. Confirm Project Health has no blocking Animation, UI, Localization, or Accessibility issue.

## Known limitations

This deterministic fixture is release evidence, not bundled game content. Screen-reader speech availability depends on the host webview.
