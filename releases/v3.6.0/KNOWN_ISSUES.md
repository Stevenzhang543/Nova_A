# Nova_A 3.6.0 known issues

No S0 or S1 issue is open in the automated v3.6 qualification.

- **S2 — native screen readers:** names, roles, states, values, focus, and live-region hooks are complete for the Tier-1 DOM/ARIA path. Native operating-system bridges still require qualification and adapters per target platform.
- **S2 — external release engineering:** the Windows host produces the included local artifacts. Clean Linux/macOS installer runs, code signing/notarization, and a 24-hour wall-clock soak require their matching external systems and are not represented as passed.
- **S3 — optional Tauri updater marker:** Tauri 2.9.6 warns that `__TAURI_BUNDLE_TYPE` is absent while patching the MSI/NSIS binaries. Nova_A 3.6 does not enable the updater plugin; portable, MSI, and NSIS builds complete and normal installation is unaffected. Requalify this marker before adding automatic updates.
