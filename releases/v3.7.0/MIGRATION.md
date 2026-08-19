# Schema 27 migration

Schema 27 is additive. It inserts explicit texture/audio/font import profiles, quality/pixel/particle rendering defaults and AudioSource voice-policy defaults. Schema 26's exact default stroke tuple (width 1, opacity 100, dark default color) becomes width 0.04; a different width, color or opacity is treated as intentional and preserved. Unknown fields and all existing scene/assets/packages remain round-trippable. Use the automatic backup/preview/rollback flow before saving a migrated project in place.
