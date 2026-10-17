# Nova_A26.17 complete physics/world field binding manual

This inventory is generated from the actual TypeScript class/interface declarations, including the common component envelope, nested materials/children/effects, connections, profiles and query options. It is a source/binding map, not a claim that every possible numeric combination is valid. Runtime, format and real-user evidence remain separately identified.

All current project data uses Project Format2/schema29. `store/physics.ts` serializes/hydrates authored component data; the actual WASM migration and NovaPak roundtrip suites compare complete saved values and public enums. Removed components and the explicitly observed fields below do not become authoring commands. Inspector/World Studio edits use history and draft bounds; after Play, retained World synchronization updates configuration without resetting unrelated velocity, handles or sleep state. Connection Save is explicitly a rebuild/rearm operation.

## RigidBody2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/world/World.ts` → `crates/nova_physics/src/world/persistent.rs`.

Dynamic bodies integrate forces. Static/kinematic/Animation-owned bodies deliberately do not integrate dynamic forces; automatic mass/inertia and manual overrides are mutually conditional.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `bodyType` | Dynamic, Kinematic or Static ownership of integration. | Authored input or explicitly initialized reference metadata. |
| `massMode` | Choose geometry/density-derived automatic mass versus manual mass. | Authored input or explicitly initialized reference metadata. |
| `density` | kg/m²; used by automatic 2D mass. | Authored input or explicitly initialized reference metadata. |
| `mass` | kg; evaluated manually or from geometry and effective density. | Authored input or explicitly initialized reference metadata. |
| `autoInertia` | Choose automatic native inertia versus authored inertia. | Authored input or explicitly initialized reference metadata. |
| `inertia` | kg·m²; evaluated automatically unless disabled. | Authored input or explicitly initialized reference metadata. |
| `gravityScale` | Dimensionless multiplier. | Authored input or explicitly initialized reference metadata. |
| `localGravity` | Additional gravity acceleration in m/s². | Authored input or explicitly initialized reference metadata. |
| `velocity` | m/s. | Authored input or explicitly initialized reference metadata. |
| `acceleration` | m/s². | Authored input or explicitly initialized reference metadata. |
| `angularVelocity` | rad/s. | Authored input or explicitly initialized reference metadata. |
| `linearDamping` | s⁻¹ damping coefficient. | Authored input or explicitly initialized reference metadata. |
| `angularDamping` | s⁻¹ damping coefficient. | Authored input or explicitly initialized reference metadata. |
| `force` | Newtons; continuous authored force. | Authored input or explicitly initialized reference metadata. |
| `torque` | N·m; continuous authored torque. | Authored input or explicitly initialized reference metadata. |
| `continuousCollision` | Discrete or continuous collision mode. | Authored input or explicitly initialized reference metadata. |
| `sleepingAllowed` | Allow native sleeping; disabling wakes eligible bodies. | Authored input or explicitly initialized reference metadata. |
| `sleeping` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `sleepTimer` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `freezeRotation` | Suppress rotation integration. | Authored input or explicitly initialized reference metadata. |
| `transformOwnership` | Physics integrates; Animation commands a kinematic transform without changing the authored body type. | Authored input or explicitly initialized reference metadata. |
| `contactCount` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `contactNormal` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `penetrationDepth` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |

## Collider2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/physicsGeometry.ts` → `src/world/World.ts` → `crates/nova_physics/src/query/filtered.rs`.

The primary shape uses its model-specific geometry. Additional enabled children compose the same owner; each child retains sensor, layer, mask and one-way rules. Concave/chain dynamic restrictions and static boundaries are validated.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `offset` | Local meters. | Authored input or explicitly initialized reference metadata. |
| `rotation` | Radians internally. Main collider Inspector converts degrees; child rotation remains radians. | Authored input or explicitly initialized reference metadata. |
| `size` | Full width/height in meters; positive geometry. | Authored input or explicitly initialized reference metadata. |
| `radiusX` | Primary ellipse horizontal radius in meters. | Authored input or explicitly initialized reference metadata. |
| `radiusY` | Primary ellipse vertical radius in meters. | Authored input or explicitly initialized reference metadata. |
| `vertices` | Ordered local vertices in meters; finite bounded polygon/chain geometry. | Authored input or explicitly initialized reference metadata. |
| `shapeModel` | Primary collider model selector; model-specific dimensions are authoritative. | Authored input or explicitly initialized reference metadata. |
| `shapes` | Ordered additional child descriptors; finite bounded compound geometry is rebuilt on actual edits. | Authored input or explicitly initialized reference metadata. |
| `sensor` | Overlap/event/query participation without solid contact response. | Authored input or explicitly initialized reference metadata. |
| `physicsLayer` | Physics layer index0–31. | Authored input or explicitly initialized reference metadata. |
| `collisionMask` | Unsigned32-bit membership mask, intersected with the collision matrix. | Authored input or explicitly initialized reference metadata. |
| `oneWay` | Enable directional surface filtering. | Authored input or explicitly initialized reference metadata. |
| `oneWayNormal` | Local normal direction, transformed with signed world scale. | Authored input or explicitly initialized reference metadata. |
| `materialAsset` | Saved material asset reference; resolved into effective coefficients without overwriting inline authoring values. | Authored input or explicitly initialized reference metadata. |
| `material` | Inline coefficient document; a valid linked material overrides effective runtime values. | Authored input or explicitly initialized reference metadata. |

## Joint2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/world/Connection.ts` → `src/world/World.ts` → `crates/nova_physics/src/world/persistent.rs`.

The selected joint kind determines distance/axis/angular limit/motor semantics. References initialize once. Broken component constraints stay broken until disable/re-enable, removal or a session reset; disabled owners create no constraint.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `targetEntityUuid` | Resolve a stable enabled target; missing/invalid targets follow the consumer diagnostic/path status. | Authored input or explicitly initialized reference metadata. |
| `anchor` | Local meters on the source body. | Authored input or explicitly initialized reference metadata. |
| `connectedAnchor` | Local meters on the target body. | Authored input or explicitly initialized reference metadata. |
| `collideConnected` | Allow contacts between attached endpoints. | Authored input or explicitly initialized reference metadata. |
| `distance` | Meters for distance/spring/rope constraints; explicit authored value is retained on first Play. | Authored input or explicitly initialized reference metadata. |
| `stiffness` | Constraint spring stiffness; active for compatible joint/rope types. | Authored input or explicitly initialized reference metadata. |
| `damping` | Constraint damping; active for compatible types. | Authored input or explicitly initialized reference metadata. |
| `axis` | Local direction; normalized by constraint preparation. | Authored input or explicitly initialized reference metadata. |
| `limitsEnabled` | Enable limits for the selected compatible joint kind. | Authored input or explicitly initialized reference metadata. |
| `lowerLimit` | Meters for prismatic or radians for angular limit modes. | Authored input or explicitly initialized reference metadata. |
| `upperLimit` | Meters for prismatic or radians for angular limit modes. | Authored input or explicitly initialized reference metadata. |
| `motorEnabled` | Enable motor for compatible joint kinds. | Authored input or explicitly initialized reference metadata. |
| `motorSpeed` | rad/s for angular motors; m/s for linear motors. | Authored input or explicitly initialized reference metadata. |
| `maxMotorForce` | Motor force/torque cap for the selected joint type. | Authored input or explicitly initialized reference metadata. |
| `breakForce` | Newtons; positive threshold. Legacy0 means unlimited. | Authored input or explicitly initialized reference metadata. |
| `breakTorque` | N·m; positive threshold. Legacy0 means unlimited. | Authored input or explicitly initialized reference metadata. |
| `referenceOffset` | Initialized relative position reference; captured once unless explicitly reset. | Authored input or explicitly initialized reference metadata. |
| `referenceAngle` | Initialized relative rotation reference. | Authored input or explicitly initialized reference metadata. |
| `initialized` | Reference initialization guard; explicit distance is not overwritten. | Authored input or explicitly initialized reference metadata. |

## CharacterBody2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/worldGameplay.ts` → `crates/nova_physics/src/query/mod.rs`.

Kinematic box-character motion uses a conservative envelope including solid child offsets/rotations. It encloses compound gaps. Requested movement is integrated once; solver velocity is zeroed afterward. Floor/slope values describe observations, not extra forces.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `maxSlopeAngle` | Degrees; accepted floor slope. | Authored input or explicitly initialized reference metadata. |
| `stepHeight` | Meters; ceiling-checked step-up distance. | Authored input or explicitly initialized reference metadata. |
| `floorSnap` | Meters; downward contact/snap reach. | Authored input or explicitly initialized reference metadata. |
| `safeMargin` | Meters; positive collision margin. | Authored input or explicitly initialized reference metadata. |
| `maxSlides` | Bounded integer slide iterations. | Authored input or explicitly initialized reference metadata. |
| `coyoteTime` | Seconds since floor contact during which jumping is allowed. | Authored input or explicitly initialized reference metadata. |
| `applyPlatformVelocity` | Carry valid moving-floor motion; stale floors are refreshed first. | Authored input or explicitly initialized reference metadata. |
| `collisionMask` | Unsigned32-bit membership mask, intersected with the collision matrix. | Authored input or explicitly initialized reference metadata. |
| `requestedMotion` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `motionVelocity` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `onFloor` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `onWall` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `onCeiling` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `floorNormal` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `wallNormal` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `ceilingNormal` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `platformVelocity` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `secondsSinceFloor` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |

## Area2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/worldGameplay.ts`.

Box or enclosing-circle overlap generates stable enter/exit events even without an effector. Parent scale and target monitorable state participate. This is an overlap area, not a rigid collider.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `shape` | Box or circle area/obstacle geometry selector. | Authored input or explicitly initialized reference metadata. |
| `size` | Full width/height in meters; positive geometry. | Authored input or explicitly initialized reference metadata. |
| `radius` | Meters; positive for a physical shape. | Authored input or explicitly initialized reference metadata. |
| `collisionMask` | Unsigned32-bit membership mask, intersected with the collision matrix. | Authored input or explicitly initialized reference metadata. |
| `monitorable` | Whether this entity can be observed by an area. | Authored input or explicitly initialized reference metadata. |

## AreaEffector2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/worldGameplay.ts`.

Requires Area2D. Enabled effects apply in priority/UUID order to eligible occupants. Gravity/wind acceleration scale with mass; drag uses velocity; buoyancy is the retained simplified relative-density acceleration, not displaced-volume fluid simulation. Damage emits a signal for gameplay to handle.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `priority` | Stable effect ordering priority. | Authored input or explicitly initialized reference metadata. |
| `effectors` | Ordered enabled effect descriptors; evaluated by Area2D occupancy and stable priority. | Authored input or explicitly initialized reference metadata. |

## NavigationRegion2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/navigation2d.ts` → `src/runtime/navigationGeometry.ts`.

Navigation source, world transform, geometry, masks, clearance and authored costs enter cache identity. TileMap always uses a captured grid. Polygon mode uses bounded continuous-clearance visibility search. Grid algorithm choice selects AStar, cached FlowField or hierarchical search/fallback. Unchanged cached paths reuse artifacts.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `polygon` | Ordered local navigation boundary vertices in meters; transformed by the owner. | Authored input or explicitly initialized reference metadata. |
| `cellSize` | Meters per grid cell; positive, bounded grid capacity. | Authored input or explicitly initialized reference metadata. |
| `navigationMode` | Grid or polygon path representation. | Authored input or explicitly initialized reference metadata. |
| `algorithm` | Grid search selection; polygon mode uses its own visibility search. | Authored input or explicitly initialized reference metadata. |
| `allowDiagonal` | Permit diagonal grid edges subject to continuous clearance. | Authored input or explicitly initialized reference metadata. |
| `dynamic` | Allow dynamic rebake, or obstacle motion prediction depending on the component. | Authored input or explicitly initialized reference metadata. |
| `rebakeInterval` | Seconds between eligible dynamic rebakes. | Authored input or explicitly initialized reference metadata. |
| `navigationLayer` | Navigation layer identifier1–32. | Authored input or explicitly initialized reference metadata. |
| `navigationMask` | Unsigned32-bit navigation membership mask. | Authored input or explicitly initialized reference metadata. |
| `traversalCost` | Positive dimensionless region traversal multiplier. | Authored input or explicitly initialized reference metadata. |
| `source` | Manual bounds, SceneGeometry or TileMap source policy. | Authored input or explicitly initialized reference metadata. |
| `sourceEntityUuid` | TileMap source owner; inactive for other source modes. | Authored input or explicitly initialized reference metadata. |
| `agentRadius` | Meters of clearance added while baking/querying. | Authored input or explicitly initialized reference metadata. |
| `clusterSize` | Hierarchical grid cluster width in cells; irrelevant in ordinary AStar/FlowField/polygon modes. | Authored input or explicitly initialized reference metadata. |
| `links` | Each id/start/end/bidirectional/cost/enabled field participates in directed weighted links. Coordinates are world meters; cost is positive. | Authored input or explicitly initialized reference metadata. |
| `costAreas` | id/name identify the authored area; enabled/layer/shape/center/size/radius select geometry and multiplier affects traversal. | Authored input or explicitly initialized reference metadata. |
| `bakedRevision` | Persisted invalidation marker; a saved number is not a portable baked artifact. | Authored input or explicitly initialized reference metadata. |

## NavigationObstacle2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/navigation2d.ts`.

Shape/size/radius and world scale affect clearance and avoidance. Only dynamic obstacles contribute authored predicted velocity; navigation layers filter participation.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `shape` | Box or circle area/obstacle geometry selector. | Authored input or explicitly initialized reference metadata. |
| `size` | Full width/height in meters; positive geometry. | Authored input or explicitly initialized reference metadata. |
| `radius` | Meters; positive for a physical shape. | Authored input or explicitly initialized reference metadata. |
| `dynamic` | Allow dynamic rebake, or obstacle motion prediction depending on the component. | Authored input or explicitly initialized reference metadata. |
| `navigationLayer` | Navigation layer identifier1–32. | Authored input or explicitly initialized reference metadata. |
| `avoidanceVelocity` | m/s prediction; zero prediction when dynamic is false. | Authored input or explicitly initialized reference metadata. |

## NavigationAgent2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/navigation2d.ts`.

A live target UUID takes precedence over the authored position. Disabled/stale region paths stop before a deferred repath. Acceleration zero preserves velocity. Avoidance and smoothing are opt-in, bounded operations.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `targetPosition` | World meters in the current origin frame. | Authored input or explicitly initialized reference metadata. |
| `targetEntityUuid` | Resolve a stable enabled target; missing/invalid targets follow the consumer diagnostic/path status. | Authored input or explicitly initialized reference metadata. |
| `speed` | m/s. | Authored input or explicitly initialized reference metadata. |
| `acceleration` | m/s². | Authored input or explicitly initialized reference metadata. |
| `radius` | Meters; positive for a physical shape. | Authored input or explicitly initialized reference metadata. |
| `stoppingDistance` | Meters to target. | Authored input or explicitly initialized reference metadata. |
| `avoidance` | Enable bounded local neighbor avoidance. | Authored input or explicitly initialized reference metadata. |
| `avoidanceRadius` | Meters used to select avoidance neighbors. | Authored input or explicitly initialized reference metadata. |
| `pathSmoothing` | Enable clearance-checked path simplification. | Authored input or explicitly initialized reference metadata. |
| `repathInterval` | Seconds between eligible agent repaths. | Authored input or explicitly initialized reference metadata. |
| `navigationLayer` | Navigation layer identifier1–32. | Authored input or explicitly initialized reference metadata. |
| `navigationMask` | Unsigned32-bit navigation membership mask. | Authored input or explicitly initialized reference metadata. |
| `avoidancePriority` | Dimensionless relative right-of-way weight. | Authored input or explicitly initialized reference metadata. |
| `maximumAvoidanceNeighbors` | Bounded maximum neighbors used per agent. | Authored input or explicitly initialized reference metadata. |
| `path` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `pathIndex` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `velocity` | m/s. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `pathStatus` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |

## BehaviorTree2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/aiTools.ts`.

Requires the enabled AI package and valid saved behavior asset. Overrides initialize on source/override revisions; runtime blackboard writes survive ticks. Wait state belongs to the entity lifetime. Signals retain generations until deferred agents consume once.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `treeAsset` | Saved behavior-tree asset reference. | Authored input or explicitly initialized reference metadata. |
| `tickRate` | Hz; physics1–1000 or AI component clamp. | Authored input or explicitly initialized reference metadata. |
| `currentNode` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `blackboardOverrides` | Initial primitive values; source/override edits refresh runtime initialization. | Authored input or explicitly initialized reference metadata. |

## StateMachine2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/aiTools.ts`.

Requires enabled AI package and valid machine asset. Current state is a runtime observation. Transitions use bounded stable-order ticks and one-time broadcast generations.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `machineAsset` | Saved state-machine asset reference. | Authored input or explicitly initialized reference metadata. |
| `currentState` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |

## WorldChunk2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/worldStreaming.ts` → `src/runtime/runtimeSceneStreaming.ts`.

An enabled chunk controls actual owned membership and external scene leases. Active, prefetched, released and failed/cancelled states differ. Initial authored child enable flags are retained. Failed/cancelled work needs explicit retry; changed source/dependency/budget is revalidated.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `size` | Full width/height in meters; positive geometry. | Authored input or explicitly initialized reference metadata. |
| `loadDistance` | Meters from chunk bounds for activation. | Authored input or explicitly initialized reference metadata. |
| `unloadDistance` | Meters for release hysteresis. | Authored input or explicitly initialized reference metadata. |
| `preloadPriority` | Stable admission ordering priority. | Authored input or explicitly initialized reference metadata. |
| `memoryEstimateMb` | Authored MiB estimate used for admission; not a measured resident heap value. | Authored input or explicitly initialized reference metadata. |
| `sceneUuid` | Scene document leased and installed by this chunk. | Authored input or explicitly initialized reference metadata. |
| `initiallyLoaded` | Initial membership policy; subsequent distance/budget policy still applies. | Authored input or explicitly initialized reference metadata. |
| `ownership` | Authored chunk ownership key. | Authored input or explicitly initialized reference metadata. |
| `dependencies` | Chunk UUID dependency list; missing nodes/cycles report explicit failures. | Authored input or explicitly initialized reference metadata. |
| `prefetchDistance` | Meters for detached preparation. | Authored input or explicitly initialized reference metadata. |
| `cachePolicy` | Release, Retain or LRU policy for inactive prepared data. | Authored input or explicitly initialized reference metadata. |
| `saveStateKey` | Bounded handoff key for streamed state. | Authored input or explicitly initialized reference metadata. |

## Portal2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/worldGameplay.ts` → `src/runtime/runtimeSceneTransition.ts`.

Enabled portals detect player/character entry, issue one scene request per tick and resolve arrival after commit. Destination UUID or name is honored; missing target reports PORTAL_TARGET_MISSING. Preload retains a detached scene lease. Toggle preload or repair its source after a failed preload.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `targetSceneUuid` | Requested destination scene document. | Authored input or explicitly initialized reference metadata. |
| `targetPortal` | Destination entity UUID/name; resolved after scene commit. | Authored input or explicitly initialized reference metadata. |
| `triggerRadius` | Meters from the portal center. | Authored input or explicitly initialized reference metadata. |
| `preload` | Prepare/release detached destination data through a retained scene lease. | Authored input or explicitly initialized reference metadata. |

## PlatformController2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/gameplayComponents.ts`.

Requires CharacterBody2D and actual input actions. Produces requested horizontal/jump motion; the character query supplies floor/coyote state. Input focus and Pause still govern execution.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `moveAction` | Input action name; resolved by the input map. | Authored input or explicitly initialized reference metadata. |
| `jumpAction` | Jump input action name. | Authored input or explicitly initialized reference metadata. |
| `speed` | m/s. | Authored input or explicitly initialized reference metadata. |
| `acceleration` | m/s². | Authored input or explicitly initialized reference metadata. |
| `airControl` | Dimensionless horizontal control multiplier while airborne. | Authored input or explicitly initialized reference metadata. |
| `jumpImpulse` | Desired jump speed in m/s in the platform controller. | Authored input or explicitly initialized reference metadata. |
| `maximumFallSpeed` | m/s downward clamp. | Authored input or explicitly initialized reference metadata. |

## TopDownController2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/gameplayComponents.ts`.

Requires CharacterBody2D. Actual input action produces collision-safe planar requested motion, with optional facing rotation.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `moveAction` | Input action name; resolved by the input map. | Authored input or explicitly initialized reference metadata. |
| `speed` | m/s. | Authored input or explicitly initialized reference metadata. |
| `acceleration` | m/s². | Authored input or explicitly initialized reference metadata. |
| `rotateToMovement` | Rotate facing toward the movement direction. | Authored input or explicitly initialized reference metadata. |

## Component2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/physicsProduction.ts` → `src/world/World.ts`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `uuid` | Stable external identity; preserved across edits, save/reopen, streaming and export. | Authored input or explicitly initialized reference metadata. |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `enabled` | Authored activation flag; disabled state retains saved values but suppresses runtime participation. | Authored input or explicitly initialized reference metadata. |
| `removed` | Component tombstone used by authoring/lifecycle; removed components do not run. | Tombstone / removal state. |

## PhysicsMaterial2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/physicsProduction.ts` → `src/world/World.ts`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `restitution` | Dimensionless bounce coefficient0–1. | Authored input or explicitly initialized reference metadata. |
| `restitutionThreshold` | m/s relative speed threshold for bounce. | Authored input or explicitly initialized reference metadata. |
| `staticFriction` | Nonnegative dimensionless friction coefficient. | Authored input or explicitly initialized reference metadata. |
| `dynamicFriction` | Nonnegative dimensionless friction coefficient. | Authored input or explicitly initialized reference metadata. |
| `density` | kg/m²; used by automatic 2D mass. | Authored input or explicitly initialized reference metadata. |
| `frictionCombine` | Effective friction combine policy. | Authored input or explicitly initialized reference metadata. |
| `restitutionCombine` | Effective restitution combine policy. | Authored input or explicitly initialized reference metadata. |

## AreaEffect2D

Declaration: `src/world/components.ts`. Evaluator/validation path: `src/runtime/physicsProduction.ts` → `src/world/World.ts`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `id` | Local numeric/runtime or nested authored identity; UUID is the stable scene identity. | Authored input or explicitly initialized reference metadata. |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `enabled` | Authored activation flag; disabled state retains saved values but suppresses runtime participation. | Authored input or explicitly initialized reference metadata. |
| `direction` | Direction vector; normalized for gravity/wind. | Authored input or explicitly initialized reference metadata. |
| `strength` | Gravity/wind acceleration in m/s²; signal strength for Signal. | Authored input or explicitly initialized reference metadata. |
| `drag` | Velocity-proportional force coefficient in kg/s. | Authored input or explicitly initialized reference metadata. |
| `fluidDensity` | Retained relative buoyancy coefficient, multiplied by mass and9.80665; not a volume-density solver. | Authored input or explicitly initialized reference metadata. |
| `damagePerSecond` | Game damage units/s emitted as area.damage. | Authored input or explicitly initialized reference metadata. |
| `signal` | Signal event name emitted to gameplay. | Authored input or explicitly initialized reference metadata. |

## Connection

Declaration: `src/world/Connection.ts`. Evaluator/validation path: `src/world/Connection.ts` → `src/world/World.ts` → `crates/nova_physics/src/world/persistent.rs`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `id` | Local numeric/runtime or nested authored identity; UUID is the stable scene identity. | Authored input or explicitly initialized reference metadata. |
| `uuid` | Stable external identity; preserved across edits, save/reopen, streaming and export. | Authored input or explicitly initialized reference metadata. |
| `name` | Authored display name; not a physics force. | Authored input or explicitly initialized reference metadata. |
| `componentType` | Connection solver dispatch kind. | Authored input or explicitly initialized reference metadata. |
| `enabled` | Authored activation flag; disabled state retains saved values but suppresses runtime participation. | Authored input or explicitly initialized reference metadata. |
| `style` | Straight, curved or manual connection route. | Authored input or explicitly initialized reference metadata. |
| `anchors` | Ordered endpoint anchors; serialized records store stable entityUuid references. | Authored input or explicitly initialized reference metadata. |
| `restLengths` | Authored segment rest lengths in meters; Save/rebuild recomputes the route explicitly. | Authored input or explicitly initialized reference metadata. |
| `manualSegments` | Normalized route points; active for manual routes. | Authored input or explicitly initialized reference metadata. |
| `curvature` | Curved-route presentation parameter; active for curved routes. | Authored input or explicitly initialized reference metadata. |
| `stretchable` | Allow bounded rope extension. | Authored input or explicitly initialized reference metadata. |
| `bendable` | Allow rope bending. | Authored input or explicitly initialized reference metadata. |
| `stiffness` | Constraint spring stiffness; active for compatible joint/rope types. | Authored input or explicitly initialized reference metadata. |
| `damping` | Constraint damping; active for compatible types. | Authored input or explicitly initialized reference metadata. |
| `maxStretchRatio` | Dimensionless extension ratio;1 means no extension. | Authored input or explicitly initialized reference metadata. |
| `bendingToleranceMass` | Legacy mass-equivalent bend failure threshold; converted using gravity convention. | Authored input or explicitly initialized reference metadata. |
| `stretchingToleranceMass` | Legacy mass-equivalent stretch failure threshold; converted using gravity convention. | Authored input or explicitly initialized reference metadata. |
| `collisionEnabled` | Enable point-based rope collision evaluation. | Authored input or explicitly initialized reference metadata. |
| `collisionRadius` | Rope collision radius in meters. | Authored input or explicitly initialized reference metadata. |
| `linearDensity` | Rope line mass in kg/m. | Authored input or explicitly initialized reference metadata. |
| `segmentCount` | Legacy label: selects3–32 simulated rope points. Explicit Save/rebuild creates nodes. | Authored input or explicitly initialized reference metadata. |
| `ropeNodes` | Physical point positions in meters and velocities in m/s; retained in saved connections and shifted with origin. | Authored input or explicitly initialized reference metadata. |
| `breakLink` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `binding` | Compound-style bound relative-transform relationship. | Authored input or explicitly initialized reference metadata. |
| `bindOffset` | Relative bound-body position in meters. | Authored input or explicitly initialized reference metadata. |
| `bindAngle` | Relative bound-body angle in radians. | Authored input or explicitly initialized reference metadata. |
| `breakState` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `tension` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `strain` | Read-only runtime state produced by the named evaluator. | Observed state; component observations are omitted from authored serialization, connection observations can be retained as saved state. |
| `jointAxis` | Local joint direction. | Authored input or explicitly initialized reference metadata. |
| `limitsEnabled` | Enable limits for the selected compatible joint kind. | Authored input or explicitly initialized reference metadata. |
| `lowerLimit` | Meters for prismatic or radians for angular limit modes. | Authored input or explicitly initialized reference metadata. |
| `upperLimit` | Meters for prismatic or radians for angular limit modes. | Authored input or explicitly initialized reference metadata. |
| `collideConnected` | Allow contacts between attached endpoints. | Authored input or explicitly initialized reference metadata. |
| `motorEnabled` | Enable motor for compatible joint kinds. | Authored input or explicitly initialized reference metadata. |
| `motorSpeed` | rad/s for angular motors; m/s for linear motors. | Authored input or explicitly initialized reference metadata. |
| `maxMotorForce` | Motor force/torque cap for the selected joint type. | Authored input or explicitly initialized reference metadata. |
| `breakForce` | Newtons; positive threshold. Legacy0 means unlimited. | Authored input or explicitly initialized reference metadata. |
| `breakTorque` | N·m; positive threshold. Legacy0 means unlimited. | Authored input or explicitly initialized reference metadata. |

## ConnectionAnchor

Declaration: `src/world/Connection.ts`. Evaluator/validation path: `src/world/Connection.ts` → `src/world/World.ts` → `crates/nova_physics/src/world/persistent.rs`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `entityId` | Runtime endpoint ID; serialized anchors resolve by entityUuid. | Authored input or explicitly initialized reference metadata. |
| `mode` | Anchor interpretation: center, surface, vertex, side or local. | Authored input or explicitly initialized reference metadata. |
| `localPoint` | Local anchor coordinates in meters. | Authored input or explicitly initialized reference metadata. |
| `index` | Selected vertex/side index for that anchor mode. | Authored input or explicitly initialized reference metadata. |
| `sideT` | Normalized position along a selected side. | Authored input or explicitly initialized reference metadata. |

## RopeNode

Declaration: `src/world/Connection.ts`. Evaluator/validation path: `src/world/Connection.ts` → `src/world/World.ts` → `crates/nova_physics/src/world/persistent.rs`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `position` | World meters in the current origin frame. | Authored input or explicitly initialized reference metadata. |
| `velocity` | m/s. | Authored input or explicitly initialized reference metadata. |

## ColliderShapeDescriptor2D

Declaration: `src/runtime/physicsProduction.ts`. Evaluator/validation path: `src/runtime/physicsProduction.ts` → `src/world/World.ts`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `id` | Local numeric/runtime or nested authored identity; UUID is the stable scene identity. | Authored input or explicitly initialized reference metadata. |
| `kind` | Validated component/shape/effect dispatch discriminator. | Authored input or explicitly initialized reference metadata. |
| `offset` | Local meters. | Authored input or explicitly initialized reference metadata. |
| `rotation` | Radians internally. Main collider Inspector converts degrees; child rotation remains radians. | Authored input or explicitly initialized reference metadata. |
| `size` | Full width/height in meters; positive geometry. | Authored input or explicitly initialized reference metadata. |
| `radius` | Legacy compatibility metadata; child size (full width/height) is authoritative. | Authored input or explicitly initialized reference metadata. |
| `points` | Ordered local child vertices in meters. | Authored input or explicitly initialized reference metadata. |
| `enabled` | Authored activation flag; disabled state retains saved values but suppresses runtime participation. | Authored input or explicitly initialized reference metadata. |
| `sensor` | Overlap/event/query participation without solid contact response. | Authored input or explicitly initialized reference metadata. |
| `physicsLayer` | Physics layer index0–31. | Authored input or explicitly initialized reference metadata. |
| `collisionMask` | Unsigned32-bit membership mask, intersected with the collision matrix. | Authored input or explicitly initialized reference metadata. |
| `oneWay` | Enable directional surface filtering. | Authored input or explicitly initialized reference metadata. |
| `oneWayNormal` | Local normal direction, transformed with signed world scale. | Authored input or explicitly initialized reference metadata. |

## PhysicsSimulationProfile2D

Declaration: `src/runtime/physicsProduction.ts`. Evaluator/validation path: `src/runtime/physicsProduction.ts` → `src/world/World.ts`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `id` | Local numeric/runtime or nested authored identity; UUID is the stable scene identity. | Authored input or explicitly initialized reference metadata. |
| `name` | Authored display name; not a physics force. | Authored input or explicitly initialized reference metadata. |
| `tickRate` | Hz; physics1–1000 or AI component clamp. | Authored input or explicitly initialized reference metadata. |
| `maxCatchUpSteps` | Integer1–240 fixed steps per frame. | Authored input or explicitly initialized reference metadata. |
| `minimumSubsteps` | Integer1–128 minimum native substeps. | Authored input or explicitly initialized reference metadata. |
| `velocityIterations` | Integer1–128 velocity solver passes. | Authored input or explicitly initialized reference metadata. |
| `positionIterations` | Integer1–128 position correction passes, independent of velocity passes. | Authored input or explicitly initialized reference metadata. |
| `interpolation` | Interpolate presentation or show current physics directly. | Authored input or explicitly initialized reference metadata. |
| `droppedTimePolicy` | Drop, PreserveBacklog or SlowMotion policy for unprocessed fixed-step time. | Authored input or explicitly initialized reference metadata. |
| `sleepLinearThreshold` | m/s sleeping threshold. | Authored input or explicitly initialized reference metadata. |
| `sleepAngularThreshold` | rad/s sleeping threshold. | Authored input or explicitly initialized reference metadata. |
| `timeToSleep` | Seconds below sleep thresholds. | Authored input or explicitly initialized reference metadata. |
| `physicsBudgetMs` | Observed/planned physics frame budget in milliseconds; not a hard portable time guarantee. | Authored input or explicitly initialized reference metadata. |

## PhysicsQueryOptions2D

Declaration: `src/runtime/physicsProduction.ts`. Evaluator/validation path: `src/runtime/physics2d.ts` → `src/world/World.ts` → `crates/nova_physics/src/query/filtered.rs`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `layerMask` | Unsigned32-bit query membership mask. | Authored input or explicitly initialized reference metadata. |
| `includeSensors` | Include sensor children in filtered queries. | Authored input or explicitly initialized reference metadata. |
| `excludeEntityUuids` | At most1024 UUID exclusions / expanded native body exclusions. | Authored input or explicitly initialized reference metadata. |
| `maximumResults` | Bounded requested query result count;4096 native-match saturation fails explicitly before public owner grouping. | Authored input or explicitly initialized reference metadata. |
| `sort` | Stable distance or UUID ordering after filtering and owner grouping. | Authored input or explicitly initialized reference metadata. |

## PhysicsLayerDefinition

Declaration: `src/runtime/physicsProduction.ts`. Evaluator/validation path: `src/runtime/physicsProduction.ts` → `src/world/World.ts`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `id` | Local numeric/runtime or nested authored identity; UUID is the stable scene identity. | Authored input or explicitly initialized reference metadata. |
| `name` | Authored display name; not a physics force. | Authored input or explicitly initialized reference metadata. |
| `description` | Authoring description. | Authored input or explicitly initialized reference metadata. |
| `color` | Authoring layer color. | Authored input or explicitly initialized reference metadata. |

## PhysicsMaterialAsset2D

Declaration: `src/runtime/physicsProduction.ts`. Evaluator/validation path: `src/runtime/physicsProduction.ts` → `src/world/World.ts`.

Nested fields follow the owning component/profile/query policy. Metadata is named explicitly; model-specific settings are active only in the indicated mode.

| Field | Meaning, units and conditions | Persistence role |
| --- | --- | --- |
| `format` | Document format discriminator; validated before loading. | Authored input or explicitly initialized reference metadata. |
| `version` | Document schema discriminator; not engine version. | Authored input or explicitly initialized reference metadata. |
| `name` | Authored display name; not a physics force. | Authored input or explicitly initialized reference metadata. |
| `density` | kg/m²; used by automatic 2D mass. | Authored input or explicitly initialized reference metadata. |
| `staticFriction` | Nonnegative dimensionless friction coefficient. | Authored input or explicitly initialized reference metadata. |
| `dynamicFriction` | Nonnegative dimensionless friction coefficient. | Authored input or explicitly initialized reference metadata. |
| `restitution` | Dimensionless bounce coefficient0–1. | Authored input or explicitly initialized reference metadata. |
| `restitutionThreshold` | m/s relative speed threshold for bounce. | Authored input or explicitly initialized reference metadata. |
| `frictionCombine` | Effective friction combine policy. | Authored input or explicitly initialized reference metadata. |
| `restitutionCombine` | Effective restitution combine policy. | Authored input or explicitly initialized reference metadata. |

## Cross-cutting bounds and qualification

Filtered queries reject malformed numbers/geometry, unknown JSON fields, excess exclusions and4096-match saturation. Child filtering happens before nearest selection and owner deduplication; TileMap solver bodies resolve to their scene owner. Exact ellipse nearest uses a bounded80-step solve. Character sweeps use continuous polygon/ellipse contact calculations; compound character gaps are conservatively enclosed.

Navigation caps one grid at262144cells, cache storage at4194304cells/64grids, scene geometry at4096pieces, polygon visibility at512nodes and off-mesh links at128. Cancellation/stale input publishes no partial bake. Flow fields cache four goals. AI caps a tree at4096nodes, frame evaluation at65536nodes, recorded traces at256, active tracked agents at10000 and ticked agents at2048; deferred signals retain bounded generations for1024distinct names. Streaming caps cached scene/entity membership and validates complete identity before commit. Handoffs cap a single entry at32MiB and total storage at128MiB; invalid imports preserve previous values. Cloth remains a body/connection lattice, without a fabric/self-collision feature claim.

Programmer evidence: native workspace tests (analytical forces/inertia, CCD, stacking, joints, sleep and events), queries, bindings, navigation, streaming/portal/origin and complete-field world-roundtrip suites. Real-user evidence: platformer/navigation/puzzle authoring, cancellation/origin/rope operations, exact downloaded player runs and1134layout surfaces (21surfaces ×3locales ×3text scales ×2themes ×3viewports). Those are acceptance requirements; only fresh passing reports qualify a frozen release. Timings identify host/workload and are not universal performance guarantees.
