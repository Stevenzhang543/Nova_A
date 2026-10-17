# Nova_A 5.x deprecation policy

A public Stable API is deprecated before removal. Diagnostics name the replacement, compatibility period, and intended removal line. Deprecated data remains readable for the promised migration window, but removed authoring options do not appear in new templates or default creation UI. Rhai API v1 is the baseline example: imported v1 scripts remain inspectable and migratable, while new scripts and project settings use API v2 and cannot select v1.

Internal capabilities have no compatibility promise. Experimental capabilities are opt-in and documented; Beta workflows are end-to-end but may still change; Stable requires authoring, runtime, serialization, migration, documentation, tests, and supported-tier evidence. A label or button cannot claim Stable based only on visible UI. Removal must preserve project safety: unsupported content is reported, not silently discarded.
