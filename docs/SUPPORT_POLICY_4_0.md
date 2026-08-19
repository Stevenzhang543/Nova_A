# Nova_A 4.0 support and patch policy

## Channels

- **Stable:** production projects. 4.0.x accepts backward-compatible defect, security, migration, documentation, and platform-qualification corrections. Project schema 29, Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 stay compatible.
- **Beta:** feature-complete release candidates with documented S2 boundaries. Back up production work before opening it here.
- **Development:** continuous contributor snapshots. No production compatibility or migration promise is made.

Windows x86-64 editor/runtime and the Web runtime are Tier 1. Linux and macOS remain Experimental until matching-host build, signing, clean-machine, and reference matrices pass. Mobile and console are Unsupported/deferred. Experimental networking is an optional package and not a core 4.0 guarantee.

S0 data-loss/security emergencies and S1 production blockers receive immediate triage. Accepted S2 issues must have a workaround, owner, and patch target in the known-issues record. Stable patches do not add schema fields, remove supported APIs, silently change physics units, enable telemetry, or promote a platform without evidence.

The bundled known-issues feed is offline and versioned. Crash packages are opt-in, local files: the user reviews identifiers and paths and chooses if or where to send them.
