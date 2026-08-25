# Nova_A 4.8 particle systems

Add `ParticleEmitter2D` to an entity, then use the Inspector for emission rate, bursts, shapes, initial velocity, gravity, drag, lifetime, size/color curves, gradients, sorting, material, preview, subemitter, and maximum count. **Manage → Rendering → Particles** can create a reusable `.nova-particle` asset from the first scene emitter and apply that asset back to an emitter.

Collision supports `None`, `Bounce`, and `Stop`, restitution, and a physics-layer mask. World-space particles test same-layer collider geometry; local-space particles stay attached to their emitter. Particle collisions are visual/runtime effects and do not create rigid bodies. Subemitters are bounded by the project and per-emitter budgets.

The global particle count and update time appear in Rendering and Profiler captures. Project Health warns when the live-count or update-time budget is exceeded. Reduce emission rate, lifetime, collision use, or per-emitter maximum before increasing a production budget.
