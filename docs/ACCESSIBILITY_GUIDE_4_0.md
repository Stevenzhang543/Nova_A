# Nova_A 4.0 accessibility guide

The editor supports keyboard navigation, visible focus, remappable shortcuts, interface scaling, high contrast, reduced motion, three locales, pseudolocalization/RTL qualification hooks, semantic labels, and minimum target/text audits. Workspaces must remain usable at supported window sizes and 100–200% UI scaling without clipped actions.

Game UI authors should set semantic role/name/description, focus order and reading order; support keyboard/gamepad/touch; retain visible focus; avoid color-only meaning; meet contrast and target sizes; provide reduced-motion behavior, text scaling, captions or text alternatives, safe areas, RTL, font fallbacks, and locale-aware plural/number/date formatting.

Run keyboard-only, focus-loop, contrast, 200% scaling, reduced-motion, screen-reader-hook, English/German/Chinese, pseudolocalization, and RTL checks before release. Automated warnings assist review but do not replace testing with users and target assistive technology.
