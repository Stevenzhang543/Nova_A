# Nova_A 5.0 accessibility baseline

The editor and runtime UI use rounded Nunito Sans, Noto Sans SC fallback, and JetBrains Mono only for code. Text must not be raster-scaled. Controls require accessible names, visible focus, keyboard operation, logical reading order, adequate target size, and no keyboard trap. Layout qualification covers English, German, Chinese, LTR/RTL preview, reduced motion, 100–200% DPI, 1366×768 through 4K, and dark/light/high-contrast tokens.

Build and Project Health report missing accessible names, focus problems, minimum target failures, localization overflow, and critical contrast. Warnings link to stable help. Runtime UI authors should provide semantic role/name/value/state, captions where needed, focus neighbors, automatic input prompts, safe-area behavior, text scaling, and reduced-motion alternatives. Experimental or custom content is not exempt from the audit when included in a Stable build.
