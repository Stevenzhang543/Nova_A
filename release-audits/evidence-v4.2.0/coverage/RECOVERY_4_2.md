# Nova_A 4.2 recovery guide

Recovery checkpoints are verified canonical project documents stored separately from manual saves. Nova_A records checkpoint reason, project identity, timestamp, checksum, and the manual-save checksum from which editing began. Invalid, oversized, or schema-invalid snapshots are counted and ignored.

On abnormal exit or an interrupted journal, the Recovery Browser lists valid checkpoints newest-first. Preview shows checksum, semantic scene/prefab/resource differences, and conflict state. The user must explicitly choose Restore, Discard, or Open as copy; Nova_A never silently picks between editor and disk versions. Open as copy assigns a new project/manifest UUID. Restore loads the checkpoint into the editor as unsaved work and never writes over the last manual file.

Safe mode disables unverified third-party packages. Read-only mode prevents creating checkpoints. The last manual save and transaction backup remain authoritative until a later verified manual transaction commits. To recover: duplicate the project folder, open Project Health → Recovery, preview the newest valid item, compare conflicts, open as copy when uncertain, validate, then Save As to a new destination.
