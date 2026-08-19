# Nova_A 4.0.0 release notes

Nova_A 4.0 is the production-stable 2D baseline. Project Format 2 schema 29, Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are locked for compatible 4.0.x patches.

## Upgrade and rollback

Every external project receives a compatibility preflight. Supported 3.x migration downloads the untouched source, records rollback, migrates in memory, validates/canonicalizes the complete result and replaces the editor session only after success. Future schemas stay read-only. Actual downgrade uses the backup and archived engine.

## Support, platforms and packages

Stable receives compatibility-preserving security, migration and defect patches. Beta is for feature-complete candidates; Development is unstable. Windows x64 editor/runtime and Web runtime are Tier 1; Linux/macOS are Experimental; mobile/console remain Unsupported. Verified packages compatible with 4.0 remain available. Experimental networking is optional and no longer a default template.

## Known issues and publication gates

No S0/S1 defect is recorded by the automated local suite. Signed tag/publisher signing, disposable-VM installer lifecycle, matching-host platform promotion and 1,000 aggregate wall-clock beta/automation hours remain explicit S2/external gates. Automatic updater integration is unavailable. See KNOWN_ISSUES_4_0.md and the evidence archive.

## Patch expectations

4.0.x patches preserve schema and public contracts, never silently discard data, and document migrations/security corrections. Upgrade, archived-engine, build/CI, API, performance, security, accessibility, troubleshooting and guided-game documentation ships with the release.
