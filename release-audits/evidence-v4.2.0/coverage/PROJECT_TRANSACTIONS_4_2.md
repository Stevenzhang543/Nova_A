# Nova_A 4.2 project transactions

All stable project mutations are classified as scene, asset, script, animation, UI, settings, packages, build, or project scope. Manual save serializes one logical affected-file manifest containing checksums and byte counts, then uses this state machine:

1. `preflight`: validate canonical source, destination permission, portable path, cancellation, and available rollback space.
2. `prepared`: persist write-ahead journal, transaction UUID, previous manual checksum, affected files, and verified recovery intent.
3. `writing`: write same-directory temporary files; generated cache output remains separate.
4. `verifying`: re-read/check lengths and checksums.
5. `committing`: replace targets atomically. Native folder commits preserve backups and roll already-replaced files back on failure.
6. `committed`: record the verified last-known-good source and clear matching dirty scopes.

Cancellation is honored only at safe boundaries. Failures are classified as cancelled, validation, disk-full, permission-denied, file-in-use, long/unsafe path, network, antivirus-delay, conflict, read-only, or unknown. A failed transaction retains its journal and recovery source; it never promotes temporary content to the last manual save.

Browser single-file save applies the same validation/journal/checksum contract to `project.nova`; a browser download cannot provide operating-system atomic replacement and is identified as such. Tauri folder writes use the native `commit_project_transaction` command and same-directory rename/backup semantics. Self-authored watcher events are suppressed by committed checksum.
