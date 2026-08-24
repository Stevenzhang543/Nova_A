# Nova_A 4.2 external-change handling

The project watcher polls the selected file handle, tracks size/time, validates incoming content, and suppresses the checksum of Nova_A's own committed save. Valid external changes are compared against both the manual baseline and current editor state. More than 100 semantic resource changes are classified as a large update; source-control branch switches have their own classification.

Nova_A never auto-merges conflicting authored data. The conflict dialog offers Compare, Reload/Keep disk, or Keep editor. Keep disk validates and loads the incoming project, resets undo at an explicit external-reload boundary, and establishes a new manual baseline. Keep editor preserves current work, marks it dirty, and requires the next save to make an explicit disk choice. Invalid external content stays unloaded with an actionable error.

File-system Access support is used where available; constrained browser hosts cannot promise native directory watching and expose that limitation. Desktop/native folder transactions retain project locks and journals; source control remains the recommended authority for multi-user merge history.
