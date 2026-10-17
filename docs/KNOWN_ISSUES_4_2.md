# Nova_A 4.2 known issues and publication gates

No local Severity 0 or Severity 1 data-integrity failure may be present in a v4.2 package. The following are truthful external gates, not passed claims:

- 24 continuous wall-clock hours of edit/save/play/stop/autosave on named release hardware.
- Five clean reproducible builds and independent artifact comparison.
- Disposable clean-machine MSI/NSIS install, repair, upgrade, rollback, uninstall, and project-preservation checks.
- Publisher signing, malware scanning, and independent security review. The current build host's Windows Defender product is disabled, so no host malware-scan pass is claimed.
- Physical mixed-monitor DPI, assistive-technology, visual-diff, Firefox, and non-Windows Experimental target review.

Browser download saves cannot provide native folder-level atomic replacement or persistent file watching; the editor labels those platform limits while still validating, journaling, and checksumming the portable document. Local recovery storage is bounded, so very large projects require native folder backup/source control. Project Format remains schema 29; schemas earlier than 5 and later than 29 are deliberately blocked by the guaranteed migration path.
