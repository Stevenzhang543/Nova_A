//! Central ownership of Nova_A's persisted project format and migrations.

use std::collections::{BTreeMap, HashMap};
use std::fmt;

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

pub const CURRENT_FORMAT_VERSION: u32 = 7;
pub const CURRENT_ENGINE_VERSION: &str = "1.3.0";

fn default_true() -> bool {
    true
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub format_version: u32,
    pub engine_version: String,
    #[serde(default)]
    pub active_scene_uuid: String,
    #[serde(default)]
    pub scenes: Vec<SceneFile>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneFile {
    pub uuid: String,
    #[serde(default)]
    pub name: String,
    #[serde(default = "default_true")]
    pub loaded: bool,
    #[serde(default)]
    pub entities: Vec<EntityFile>,
    #[serde(default)]
    pub connections: Vec<ConnectionFile>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityFile {
    pub uuid: String,
    #[serde(default)]
    pub name: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub components: Vec<ComponentFile>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentFile {
    pub uuid: String,
    pub kind: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub removed: bool,
    #[serde(default)]
    pub data: Value,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionFile {
    pub uuid: String,
    #[serde(default)]
    pub anchors: Vec<Value>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetReference {
    pub uuid: String,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub asset_type: String,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FormatError(pub String);

impl fmt::Display for FormatError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl std::error::Error for FormatError {}

pub fn migrate_project_str(source: &str) -> Result<String, FormatError> {
    let value: Value = serde_json::from_str(source)
        .map_err(|error| FormatError(format!("invalid project JSON: {error}")))?;
    let migrated = migrate_project_value(value)?;
    serde_json::to_string_pretty(&migrated)
        .map_err(|error| FormatError(format!("could not serialize project: {error}")))
}

pub fn migrate_project_value(value: Value) -> Result<ProjectFile, FormatError> {
    let mut root = match value {
        Value::Array(entities) => {
            Map::from_iter([(String::from("entities"), Value::Array(entities))])
        }
        Value::Object(root) => root,
        _ => {
            return Err(FormatError(
                "project root must be an object or entity array".into(),
            ))
        }
    };
    let source_version = root
        .get("formatVersion")
        .and_then(Value::as_u64)
        .unwrap_or(1) as u32;
    if source_version > CURRENT_FORMAT_VERSION {
        return Err(FormatError(format!("project format {source_version} is newer than supported format {CURRENT_FORMAT_VERSION}")));
    }
    if !root.get("scenes").is_some_and(Value::is_array) {
        let assets = root.remove("assets");
        root.remove("formatVersion");
        root.remove("engineVersion");
        root.remove("activeSceneUuid");
        let mut scene = std::mem::take(&mut root);
        let scene_uuid = deterministic_uuid("nova-a-scene:main");
        scene.insert("uuid".into(), Value::String(scene_uuid.clone()));
        scene.insert("name".into(), Value::String("Main Scene".into()));
        scene.insert("loaded".into(), Value::Bool(true));
        root.insert("activeSceneUuid".into(), Value::String(scene_uuid));
        root.insert("scenes".into(), Value::Array(vec![Value::Object(scene)]));
        if let Some(assets) = assets {
            root.insert("assets".into(), assets);
        }
    }

    let requested_active_scene = root
        .get("activeSceneUuid")
        .and_then(Value::as_str)
        .map(str::to_owned);
    let scenes = root
        .get_mut("scenes")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| FormatError("project scenes must be an array".into()))?;
    if scenes.is_empty() {
        return Err(FormatError(
            "project must contain at least one scene".into(),
        ));
    }
    for (scene_index, scene) in scenes.iter_mut().enumerate() {
        let scene = scene
            .as_object_mut()
            .ok_or_else(|| FormatError("every scene must be an object".into()))?;
        if !scene
            .get("uuid")
            .and_then(Value::as_str)
            .is_some_and(is_uuid)
        {
            scene.insert(
                "uuid".into(),
                Value::String(deterministic_uuid(&format!("nova-a-scene:{scene_index}"))),
            );
        }
        scene
            .entry("name")
            .or_insert_with(|| json!(format!("Scene {}", scene_index + 1)));
        scene.entry("loaded").or_insert(Value::Bool(true));
        migrate_legacy_identities(scene)?;
        migrate_legacy_components(scene)?;
    }

    let active_is_valid = requested_active_scene.as_deref().is_some_and(|active| {
        scenes
            .iter()
            .any(|scene| scene.get("uuid").and_then(Value::as_str) == Some(active))
    });
    if !active_is_valid {
        let active = scenes[0]["uuid"].clone();
        root.insert("activeSceneUuid".into(), active);
    }
    root.insert("formatVersion".into(), json!(CURRENT_FORMAT_VERSION));
    root.insert("engineVersion".into(), json!(CURRENT_ENGINE_VERSION));
    let project: ProjectFile = serde_json::from_value(Value::Object(root))
        .map_err(|error| FormatError(format!("project schema is invalid: {error}")))?;
    validate_project(&project)?;
    Ok(project)
}

pub fn validate_project(project: &ProjectFile) -> Result<(), FormatError> {
    if project.format_version != CURRENT_FORMAT_VERSION {
        return Err(FormatError(format!(
            "expected format {}, received {}",
            CURRENT_FORMAT_VERSION, project.format_version
        )));
    }
    if project.scenes.is_empty() {
        return Err(FormatError(
            "project must contain at least one scene".into(),
        ));
    }
    let mut identities = std::collections::HashSet::new();
    let mut scene_ids = std::collections::HashSet::new();
    for scene in &project.scenes {
        if !is_uuid(&scene.uuid) || !scene_ids.insert(scene.uuid.as_str()) {
            return Err(FormatError(format!(
                "invalid or duplicate scene UUID: {}",
                scene.uuid
            )));
        }
        let entity_ids: std::collections::HashSet<&str> = scene
            .entities
            .iter()
            .map(|entity| entity.uuid.as_str())
            .collect();
        let mut parents = HashMap::<&str, &str>::new();
        for entity in &scene.entities {
            if !is_uuid(&entity.uuid) || !identities.insert(entity.uuid.as_str()) {
                return Err(FormatError(format!(
                    "invalid or duplicate entity UUID: {}",
                    entity.uuid
                )));
            }
            let mut component_kinds = std::collections::HashSet::new();
            for component in &entity.components {
                if !is_uuid(&component.uuid) || !identities.insert(component.uuid.as_str()) {
                    return Err(FormatError(format!(
                        "invalid or duplicate component UUID: {}",
                        component.uuid
                    )));
                }
                if !component_kinds.insert(component.kind.as_str()) {
                    return Err(FormatError(format!(
                        "entity {} contains duplicate component kind {}",
                        entity.uuid, component.kind
                    )));
                }
                if component.kind == "Transform2D" {
                    if let Some(parent) = component.data.get("parentUuid").and_then(Value::as_str) {
                        if !entity_ids.contains(parent) {
                            return Err(FormatError(format!(
                                "entity {} refers to missing parent {}",
                                entity.uuid, parent
                            )));
                        }
                        parents.insert(entity.uuid.as_str(), parent);
                    }
                }
            }
            if !component_kinds.contains("Transform2D") {
                return Err(FormatError(format!(
                    "entity {} is missing mandatory Transform2D",
                    entity.uuid
                )));
            }
        }
        for connection in &scene.connections {
            if !is_uuid(&connection.uuid) || !identities.insert(connection.uuid.as_str()) {
                return Err(FormatError(format!(
                    "invalid or duplicate connection UUID: {}",
                    connection.uuid
                )));
            }
            for anchor in &connection.anchors {
                if let Some(entity_uuid) = anchor.get("entityUuid").and_then(Value::as_str) {
                    if !entity_ids.contains(entity_uuid) {
                        return Err(FormatError(format!(
                            "connection {} refers to missing entity {}",
                            connection.uuid, entity_uuid
                        )));
                    }
                }
            }
        }
        for entity_uuid in &entity_ids {
            let mut visited = std::collections::HashSet::new();
            let mut current = Some(*entity_uuid);
            while let Some(uuid) = current {
                if !visited.insert(uuid) {
                    return Err(FormatError(format!(
                        "parent cycle detected at entity {uuid}"
                    )));
                }
                current = parents.get(uuid).copied();
            }
        }
    }
    if !scene_ids.contains(project.active_scene_uuid.as_str()) {
        return Err(FormatError(
            "activeSceneUuid does not identify a saved scene".into(),
        ));
    }
    Ok(())
}

fn migrate_legacy_identities(root: &mut Map<String, Value>) -> Result<(), FormatError> {
    let entities = root
        .entry("entities")
        .or_insert_with(|| Value::Array(Vec::new()));
    let Value::Array(entities) = entities else {
        return Err(FormatError("project must contain an entities array".into()));
    };
    let mut id_to_uuid = HashMap::new();
    let mut used_uuids = std::collections::HashSet::new();
    for (index, entity) in entities.iter_mut().enumerate() {
        let Value::Object(entity) = entity else {
            return Err(FormatError("every entity must be an object".into()));
        };
        let legacy_id = entity
            .get("id")
            .map(identity_key)
            .unwrap_or_else(|| index.to_string());
        let mut uuid = entity
            .get("uuid")
            .and_then(Value::as_str)
            .filter(|value| is_uuid(value))
            .map(str::to_owned)
            .unwrap_or_else(|| deterministic_uuid(&format!("nova-a-entity:{index}:{legacy_id}")));
        let mut collision = 0_u32;
        while used_uuids.contains(&uuid) {
            collision += 1;
            uuid = deterministic_uuid(&format!("nova-a-entity:{index}:{legacy_id}:{collision}"));
        }
        used_uuids.insert(uuid.clone());
        id_to_uuid.entry(legacy_id).or_insert_with(|| uuid.clone());
        entity.insert("uuid".into(), Value::String(uuid));
        entity.remove("id");
    }

    let connections = root
        .entry("connections")
        .or_insert_with(|| Value::Array(Vec::new()));
    let Value::Array(connections) = connections else {
        return Err(FormatError("project connections must be an array".into()));
    };
    for (index, connection) in connections.iter_mut().enumerate() {
        let Value::Object(connection) = connection else {
            return Err(FormatError("every connection must be an object".into()));
        };
        let legacy_id = connection
            .get("id")
            .map(identity_key)
            .unwrap_or_else(|| index.to_string());
        let mut uuid = connection
            .get("uuid")
            .and_then(Value::as_str)
            .filter(|value| is_uuid(value))
            .map(str::to_owned)
            .unwrap_or_else(|| {
                deterministic_uuid(&format!("nova-a-connection:{index}:{legacy_id}"))
            });
        let mut collision = 0_u32;
        while used_uuids.contains(&uuid) {
            collision += 1;
            uuid = deterministic_uuid(&format!(
                "nova-a-connection:{index}:{legacy_id}:{collision}"
            ));
        }
        used_uuids.insert(uuid.clone());
        connection.insert("uuid".into(), Value::String(uuid));
        connection.remove("id");
        if let Some(Value::Array(anchors)) = connection.get_mut("anchors") {
            for anchor in anchors {
                let Value::Object(anchor) = anchor else {
                    continue;
                };
                if anchor.get("entityUuid").and_then(Value::as_str).is_none() {
                    if let Some(id) = anchor.get("entityId").map(identity_key) {
                        if let Some(uuid) = id_to_uuid.get(&id) {
                            anchor.insert("entityUuid".into(), Value::String(uuid.clone()));
                        }
                    }
                }
                anchor.remove("entityId");
            }
        }
    }
    Ok(())
}

fn migrate_legacy_components(scene: &mut Map<String, Value>) -> Result<(), FormatError> {
    let entities = scene
        .get_mut("entities")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| FormatError("scene must contain an entities array".into()))?;
    for entity in entities {
        let entity = entity
            .as_object_mut()
            .ok_or_else(|| FormatError("every entity must be an object".into()))?;
        let entity_uuid = entity
            .get("uuid")
            .and_then(Value::as_str)
            .ok_or_else(|| FormatError("entity UUID is missing".into()))?
            .to_owned();
        let existing_components = entity
            .get_mut("components")
            .and_then(Value::as_array_mut)
            .filter(|components| !components.is_empty());
        if let Some(components) = existing_components {
            for (index, component) in components.iter_mut().enumerate() {
                let component = component
                    .as_object_mut()
                    .ok_or_else(|| FormatError("every component must be an object".into()))?;
                let kind = component
                    .get("kind")
                    .and_then(Value::as_str)
                    .unwrap_or("Component2D")
                    .to_owned();
                if !component
                    .get("uuid")
                    .and_then(Value::as_str)
                    .is_some_and(is_uuid)
                {
                    component.insert(
                        "uuid".into(),
                        Value::String(deterministic_uuid(&format!(
                            "nova-a-component:{entity_uuid}:{kind}:{index}"
                        ))),
                    );
                }
                component.entry("enabled").or_insert(Value::Bool(true));
                component.entry("removed").or_insert(Value::Bool(false));
                component.entry("data").or_insert_with(|| json!({}));
            }
        } else {
            let shape_type = entity
                .get("shapeType")
                .or_else(|| entity.get("name"))
                .and_then(Value::as_str)
                .unwrap_or("Box")
                .to_owned();
            entity.insert("entityType".into(), Value::String(shape_type.clone()));
            let transform = entity.get("transform").cloned().unwrap_or_else(
                || json!({"position":{"x":0,"y":0},"rotation":0,"scale":{"x":1,"y":1}}),
            );
            let mut transform_data = transform.as_object().cloned().unwrap_or_default();
            transform_data.insert(
                "parentUuid".into(),
                entity.get("parentUuid").cloned().unwrap_or(Value::Null),
            );
            let renderer_shape = match shape_type.as_str() {
                "Circle" => "Ellipse",
                "Triangle" => "Polygon",
                _ => "Rectangle",
            };
            let renderer_data = json!({
                "shape": renderer_shape,
                "vertices": entity.get("vertices").cloned().unwrap_or_else(|| json!([])),
                "radiusX": entity.get("radiusX").cloned().unwrap_or_else(|| json!(1)),
                "radiusY": entity.get("radiusY").cloned().unwrap_or_else(|| json!(1)),
                "color": entity.get("color").cloned().unwrap_or_else(|| json!({"r":0,"g":180,"b":255})),
                "opacity": entity.get("transparency").cloned().unwrap_or_else(|| json!(100)),
                "texture": entity.get("texture").cloned().unwrap_or(Value::Null),
                "sortingLayer": entity.get("layer").cloned().unwrap_or_else(|| json!(1)),
                "orderInLayer": 0
            });
            let body_type = if entity.get("isStatic").and_then(Value::as_bool) == Some(true) {
                "Static"
            } else if entity.get("isKinematic").and_then(Value::as_bool) == Some(true) {
                "Kinematic"
            } else {
                "Dynamic"
            };
            let rigid_body_data = json!({
                "bodyType": body_type,
                "massMode": "Manual",
                "density": entity.get("density").cloned().unwrap_or_else(|| json!(1)),
                "mass": entity.get("mass").cloned().unwrap_or_else(|| json!(1)),
                "autoInertia": entity.get("autoInertia").cloned().unwrap_or(json!(true)),
                "inertia": entity.get("inertia").cloned().unwrap_or_else(|| json!(1)),
                "gravityScale": entity.get("gravityScale").cloned().unwrap_or_else(|| json!(1)),
                "localGravity": entity.get("gravity").cloned().unwrap_or_else(|| json!(0)),
                "velocity": entity.get("velocity").cloned().unwrap_or_else(|| json!({"x":0,"y":0})),
                "acceleration": entity.get("acceleration").cloned().unwrap_or_else(|| json!({"x":0,"y":0})),
                "angularVelocity": entity.get("angularVelocity").cloned().unwrap_or_else(|| json!(0)),
                "linearDamping": entity.get("linearDamping").cloned().unwrap_or_else(|| json!(0)),
                "angularDamping": entity.get("angularDamping").cloned().unwrap_or_else(|| json!(0)),
                "force": entity.get("force").cloned().unwrap_or_else(|| json!({"x":0,"y":0})),
                "torque": entity.get("torque").cloned().unwrap_or_else(|| json!(0)),
                "continuousCollision": "Continuous",
                "sleepingAllowed": true,
                "freezeRotation": false
            });
            let legacy_layer = entity.get("layer").and_then(Value::as_u64).unwrap_or(1);
            let physics_layer = legacy_layer.saturating_sub(1).min(31) as u32;
            let collider_kind = match shape_type.as_str() {
                "Circle" => "EllipseCollider2D",
                "Triangle" => "PolygonCollider2D",
                _ => "BoxCollider2D",
            };
            let collider_data = json!({
                "offset": {"x":0,"y":0},
                "rotation": 0,
                "size": {"x":1,"y":1},
                "vertices": entity.get("vertices").cloned().unwrap_or_else(|| json!([])),
                "radiusX": entity.get("radiusX").cloned().unwrap_or_else(|| json!(1)),
                "radiusY": entity.get("radiusY").cloned().unwrap_or_else(|| json!(1)),
                "sensor": entity.get("isSensor").cloned().unwrap_or(json!(false)),
                "physicsLayer": physics_layer,
                "collisionMask": 1_u32 << physics_layer,
                "material": {
                    "restitution": entity.get("restitution").cloned().unwrap_or_else(|| json!(0)),
                    "restitutionThreshold": entity.get("restitutionThreshold").cloned().unwrap_or_else(|| json!(1)),
                    "staticFriction": entity.get("staticFriction").cloned().unwrap_or_else(|| json!(0)),
                    "dynamicFriction": entity.get("dynamicFriction").cloned().unwrap_or_else(|| json!(0))
                }
            });
            entity.insert(
                "components".into(),
                Value::Array(vec![
                    component_value(&entity_uuid, "Transform2D", Value::Object(transform_data)),
                    component_value(&entity_uuid, "ShapeRenderer2D", renderer_data),
                    component_value(&entity_uuid, "RigidBody2D", rigid_body_data),
                    component_value(&entity_uuid, collider_kind, collider_data),
                ]),
            );
        }
        entity.entry("enabled").or_insert(Value::Bool(true));
        entity.entry("tags").or_insert_with(|| json!([]));
    }

    if let Some(connections) = scene.get_mut("connections").and_then(Value::as_array_mut) {
        for connection in connections {
            if let Some(connection) = connection.as_object_mut() {
                let binding = connection
                    .get("binding")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                connection.entry("componentType").or_insert_with(|| {
                    Value::String(if binding { "FixedJoint2D" } else { "Rope2D" }.into())
                });
                connection.entry("enabled").or_insert(Value::Bool(true));
            }
        }
    }
    Ok(())
}

fn component_value(entity_uuid: &str, kind: &str, data: Value) -> Value {
    json!({
        "uuid": deterministic_uuid(&format!("nova-a-component:{entity_uuid}:{kind}")),
        "kind": kind,
        "enabled": true,
        "removed": false,
        "data": data
    })
}

fn identity_key(value: &Value) -> String {
    value
        .as_i64()
        .map(|value| value.to_string())
        .or_else(|| value.as_u64().map(|value| value.to_string()))
        .or_else(|| value.as_f64().map(|value| format!("{value:.0}")))
        .or_else(|| value.as_str().map(str::to_owned))
        .unwrap_or_default()
}

fn deterministic_uuid(seed: &str) -> String {
    fn hash(seed: &[u8], offset: u64) -> u64 {
        seed.iter()
            .fold(0xcbf29ce484222325_u64 ^ offset, |value, byte| {
                (value ^ u64::from(*byte)).wrapping_mul(0x100000001b3)
            })
    }
    let high = hash(seed.as_bytes(), 0);
    let low = hash(seed.as_bytes(), 0x9e3779b97f4a7c15);
    let mut bytes = [0_u8; 16];
    bytes[..8].copy_from_slice(&high.to_be_bytes());
    bytes[8..].copy_from_slice(&low.to_be_bytes());
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    format!("{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0],bytes[1],bytes[2],bytes[3],bytes[4],bytes[5],bytes[6],bytes[7],bytes[8],bytes[9],bytes[10],bytes[11],bytes[12],bytes[13],bytes[14],bytes[15])
}

fn is_uuid(value: &str) -> bool {
    value.len() == 36
        && value.bytes().enumerate().all(|(index, byte)| {
            if matches!(index, 8 | 13 | 18 | 23) {
                byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrates_v1_1_2_numeric_identities_without_losing_data() {
        let source = r#"{"formatVersion":5,"layers":[1],"entities":[{"id":7,"name":"Box","shapeType":"Box","mass":12}],"connections":[{"id":3,"anchors":[{"entityId":7}]}]}"#;
        let migrated = migrate_project_str(source).unwrap();
        let value: Value = serde_json::from_str(&migrated).unwrap();
        assert_eq!(value["formatVersion"], CURRENT_FORMAT_VERSION);
        assert_eq!(value["engineVersion"], CURRENT_ENGINE_VERSION);
        assert!(value["scenes"][0]["entities"][0].get("id").is_none());
        assert_eq!(
            value["scenes"][0]["entities"][0]["components"][2]["data"]["mass"],
            12
        );
        assert_eq!(
            value["scenes"][0]["connections"][0]["anchors"][0]["entityUuid"],
            value["scenes"][0]["entities"][0]["uuid"]
        );
    }

    #[test]
    fn preserves_multi_scene_projects_and_component_identity() {
        let scene_a = deterministic_uuid("scene-a");
        let scene_b = deterministic_uuid("scene-b");
        let entity = deterministic_uuid("entity-a");
        let component = deterministic_uuid("component-a");
        let source = json!({
            "formatVersion": 7,
            "activeSceneUuid": scene_b,
            "scenes": [
                {"uuid":scene_a,"name":"A","entities":[],"connections":[]},
                {"uuid":scene_b,"name":"B","entities":[{
                    "uuid":entity,"name":"Body","entityType":"Box","components":[{
                        "uuid":component,"kind":"Transform2D","enabled":true,
                        "data":{"position":{"x":0,"y":0},"rotation":0,"scale":{"x":1,"y":1}}
                    }]
                }],"connections":[]}
            ]
        });
        let migrated = migrate_project_value(source).unwrap();
        assert_eq!(migrated.scenes.len(), 2);
        assert_eq!(migrated.active_scene_uuid, scene_b);
        assert_eq!(migrated.scenes[1].entities[0].components[0].uuid, component);
    }

    #[test]
    fn rejects_future_project_formats() {
        let error = migrate_project_str(r#"{"formatVersion":999,"entities":[]}"#).unwrap_err();
        assert!(error.0.contains("newer"));
    }
}
