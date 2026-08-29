# Particle graphs, events and fallback in Nova_A 5.5

## Create and apply a particle graph

Add a `ParticleEmitter2D`, select it, then open **Rendering → Particles**. **Asset from emitter** captures the emitter into a version-2 particle-system asset. Arrange the bounded Spawn, Shape, Velocity, Force, Color, Size, Rotation, Collision, Events, Sub-emitter, Trail and Renderer modules. Disabled modules keep their authored data but do not affect output. **Save asset** persists the graph; **Apply asset** intentionally copies its values to the selected emitter and stores the asset reference. Merely opening a legacy particle asset never changes the scene object.

Spawn controls rate, burst, lifetime and maximum count. Shape and Velocity choose initial distribution. Force changes velocity each fixed update. Color/Size use the emitter's normalized lifetime gradients and curves. Collision can stop or bounce against eligible objects. Events publish a bounded diagnostic timeline for collision, death and sub-emission. Sub-emitter identifies another emitter UUID and a bounded count. Trail stores a bounded point history and renders connected tapered segments. Renderer chooses material and blend mode.

## CPU/GPU behavior

Particle simulation is deterministic on the CPU. Under WebGL2, compatible particles are submitted through the GPU-batched renderer; Canvas2D draws the same simulated particles through its compatibility path. Collision, events and sub-emitters always retain CPU simulation. The backend card states the effective path and never calls a Canvas2D draw a GPU draw. Project and emitter budgets cap particle counts, module operations and trail vertices.

## Curves, collisions and events

Edit lifetime color, opacity and size curves on the emitter Inspector. Values are sampled from normalized age `0…1`. World-space particles collide using layer/mask rules and restitution; local-space trails are transformed with their owner. Death can start a sub-emitter at the expired particle position. The event timeline is diagnostic and bounded to 128 recent items so a burst cannot grow editor memory indefinitely.

## Verification workflow

Use the v5.5 particle reference, play for the supplied control interval, and compare Canvas2D/WebGL2 screenshots. Confirm finite counts, no fatal console entry, trail continuity, collision/death/sub-emitter events, and a visible fallback explanation. For production, capture the busiest effect, check the particle update budget, then inspect overdraw and draw-call recommendations before increasing maximum count or trail length.

