# Nova_A 4.1 known issues and external gates

No known Severity 0 or Severity 1 defect is accepted by the local v4.1 automated release suite. The following claims remain deliberately pending until their named environment or person supplies evidence:

- Publisher signing and a signed protected source tag; local working-tree artifacts are unsigned.
- Five independent clean builds from the same pinned source and lockfiles.
- Clean disposable Windows install/repair/update/rollback/uninstall; Linux/macOS matching-host builds remain Experimental.
- Physical multi-monitor moves at 100/125/150/175/200% and hardware-dependent text/GPU review.
- 24 continuous wall-clock hours across editor, player, and build workflows.
- Human approval of intentional visual-baseline diffs and independent release-lead sign-off.

These are publication gates, not silently reported passes. The evidence manifest records them as `pending-external-gate` with remediation and ownership. Networking/world streaming remain Experimental; workspace docking is Beta while its stable fallback/reset path remains available.
