# Nova_A 26.19 implementation tracker

Baseline: v26.18 candidate5, digest 97c295f509211e43514844ef48a12f7fa19d40b278e47d452637cc19a1758537 (2244 authored files). Prior uncommitted work and published releases are preserved.

- [x] Read roadmap; inspect previous completion, source and release state.
- [x] Implement bounded identity-aware semantic merge, reorder/insertion/deletion choices and stale-preview rejection.
- [x] Make package candidate installation/update/removal/rollback transactional; bind plugin lifetime and permission revocation to disposal.
- [x] Harden signed-update review cancellation, base/replay validation and explicit operator-recovery limits.
- [x] Repair file watcher ownership and full-sync LSP transport ordering/bounds.
- [x] Pin verified Node/pnpm/Rust requirements and author clean/moved offline build checks.
- [x] Improve localized readiness, conflict and package layouts; author actual-user and full changed-layout matrices.
- [x] Add six separate references and complete EN/DE/ZH lessons and field/action inventory.
- [ ] Final frozen-source qualification: all 21 common gates plus 26.19 focus and authoring bundles.
- [ ] Package and independently verify exactly 11 release files and prior-release preservation.

The final two items are deliberately not certified inside the source being frozen. Their machine-verifiable completion belongs in release-audits/v26.19-COMPLETION.json and the packaged executed-gates and package-verification reports. Updating this tracker after freezing would invalidate the source identity.

## External acceptance still pending

Matching Linux/macOS hosts, actual Android toolchain/device, production signing and disposable installation/update/uninstallation cannot be qualified on the supplied environment. The user confirmed that only this Windows computer is available; an offered iPhone 12 is not an Android target. Native GUI automation initialization failed locally, so no native file-picker/external-editor GUI or native installer clicking is claimed. Real stdio LSP, controlled file I/O, browser user actions and native build/process evidence retain their distinct scopes. Independent assistive-technology, security, public-network and long-duration soak audits remain separately owned external checks.
