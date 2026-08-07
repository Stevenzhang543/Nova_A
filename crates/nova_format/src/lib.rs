//! Central ownership of Nova_A's persisted project format and migrations.

use std::collections::{BTreeMap, HashMap};
use std::fmt;

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

pub const CURRENT_FORMAT_VERSION: u32 = 6;
pub const CURRENT_ENGINE_VERSION: &str = "1.2.0";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub format_version: u32,
    pub engine_version: String,
    #[serde(default)]
    pub entities: Vec<EntityFile>,
    #[serde(default)]
    pub connections: Vec<ConnectionFile>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneFile {
    pub uuid: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub entities: Vec<EntityFile>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityFile {
    pub uuid: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub components: Vec<ComponentFile>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentFile {
    pub kind: String,
    #[serde(default)]
    pub enabled: bool,
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
    migrate_legacy_identities(&mut root)?;
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
    let mut identities = std::collections::HashSet::new();
    for entity in &project.entities {
        if !is_uuid(&entity.uuid) {
            return Err(FormatError(format!(
                "entity has invalid UUID: {}",
                entity.uuid
            )));
        }
        if !identities.insert(entity.uuid.as_str()) {
            return Err(FormatError(format!(
                "duplicate entity UUID: {}",
                entity.uuid
            )));
        }
    }
    for connection in &project.connections {
        if !is_uuid(&connection.uuid) {
            return Err(FormatError(format!(
                "connection has invalid UUID: {}",
                connection.uuid
            )));
        }
        if !identities.insert(connection.uuid.as_str()) {
            return Err(FormatError(format!(
                "duplicate saved UUID: {}",
                connection.uuid
            )));
        }
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
        assert!(value["entities"][0].get("id").is_none());
        assert_eq!(value["entities"][0]["mass"], 12);
        assert_eq!(
            value["connections"][0]["anchors"][0]["entityUuid"],
            value["entities"][0]["uuid"]
        );
    }

    #[test]
    fn rejects_future_project_formats() {
        let error = migrate_project_str(r#"{"formatVersion":999,"entities":[]}"#).unwrap_err();
        assert!(error.0.contains("newer"));
    }
}
