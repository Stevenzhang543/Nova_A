# Nova_A 4.7 Animation Import Contract

Animation import settings are versioned metadata attached to the destination animation asset. The destination UUID is preserved across reimport so controllers, timelines, nested clips and prefabs keep a stable dependency.

An import can specify a source animation, source and destination sample rates, property track mappings, compression tolerance, event preservation and the last import time. Reimport samples the source deterministically, applies only valid animatable-property mappings, reduces redundant linear keys within the configured tolerance, preserves or removes events according to policy, copies sprite frames, and writes a normalized version-4 clip.

Validation reports unparseable clips/controllers, missing entity targets, non-increasing key times, missing Script Studio event/method symbols, invalid audio or nested-animation references, missing controller clips, invalid blend parameters, unsafe unconditional self-transitions, and non-finite runtime samples. Asset rename and move operations retain UUID references; deletion continues through the dependency-aware project trash workflow.

Projects from earlier 4.x releases require no schema migration. Opening and saving upgrades animation documents and import metadata through their local normalizers. Keep a project backup before bulk reimport because compression deliberately changes key data.

