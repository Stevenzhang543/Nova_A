# Nova_A 3.6.0 deprecations

- Fixed-position game UI that ignores anchors, scale, DPI, and safe areas remains loadable but is deprecated for new work.
- Unstructured localization strings in scene components remain loadable; structured table keys are the supported reusable workflow.
- Input bindings without explicit device identity and response metadata normalize safely but should be reviewed in Input Map.
- Accessibility toggles that affect only editor CSS are not treated as game accessibility. Runtime game preferences now live in UI → Accessibility.
- The former separate Presentation dock is no longer an exposed workspace. Its features were moved, not deleted: UI/theme/localization/UI audio/accessibility are in UI; project mixing is in Audio.
