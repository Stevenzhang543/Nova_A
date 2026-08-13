//! Central ownership of Nova_A's persisted project format and migrations.

use std::collections::{BTreeMap, HashMap};
use std::fmt;

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

pub const PROJECT_FORMAT_NAME: &str = "Nova_A Project Format 2";
pub const PROJECT_FORMAT_MAJOR: u32 = 2;
pub const CURRENT_FORMAT_VERSION: u32 = 17;
pub const MINIMUM_SUPPORTED_FORMAT_VERSION: u32 = 5;
pub const CURRENT_ENGINE_VERSION: &str = "2.4.0";

fn default_true() -> bool {
    true
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub project_format: String,
    pub project_format_major: u32,
    pub format_version: u32,
    pub engine_version: String,
    pub compatibility: CompatibilityFile,
    #[serde(default)]
    pub active_scene_uuid: String,
    #[serde(default)]
    pub scenes: Vec<SceneFile>,
    #[serde(default)]
    pub assets: Vec<AssetReference>,
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompatibilityFile {
    pub format: String,
    pub major: u32,
    pub schema_version: u32,
    pub minimum_schema_version: u32,
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
    #[serde(default = "default_true")]
    pub editor_visible: bool,
    #[serde(default)]
    pub editor_locked: bool,
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
    let legacy_project_settings = if root.get("scenes").is_some_and(Value::is_array) {
        None
    } else {
        root.remove("projectSettings")
    };
    let source_version = root
        .get("formatVersion")
        .and_then(Value::as_u64)
        .unwrap_or(1) as u32;
    let source_major = root
        .get("projectFormatMajor")
        .and_then(Value::as_u64)
        .unwrap_or(1) as u32;
    if source_major > PROJECT_FORMAT_MAJOR {
        return Err(FormatError(format!(
            "project format major {source_major} is newer than supported major {PROJECT_FORMAT_MAJOR}"
        )));
    }
    if source_version > CURRENT_FORMAT_VERSION {
        return Err(FormatError(format!("project format {source_version} is newer than supported format {CURRENT_FORMAT_VERSION}")));
    }
    if !root.get("scenes").is_some_and(Value::is_array) {
        let assets = root.remove("assets");
        root.remove("formatVersion");
        root.remove("engineVersion");
        root.remove("projectFormat");
        root.remove("projectFormatMajor");
        root.remove("compatibility");
        root.remove("projectMetadata");
        root.remove("plugins");
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
        if let Some(settings) = legacy_project_settings {
            root.insert("projectSettings".into(), settings);
        }
    }
    root.entry("assets")
        .or_insert_with(|| Value::Array(Vec::new()));
    root.entry("plugins")
        .or_insert_with(|| Value::Array(Vec::new()));
    root.entry("projectMetadata").or_insert_with(|| {
        json!({
            "id": deterministic_uuid("nova-a-project:imported"),
            "name": "Imported Project",
            "createdAt": "1970-01-01T00:00:00.000Z",
            "updatedAt": "1970-01-01T00:00:00.000Z",
            "format": PROJECT_FORMAT_NAME,
            "template": "imported"
        })
    });
    root.entry("projectSettings")
        .or_insert_with(|| json!({ "inputMap": [] }));
    if let Some(settings) = root
        .get_mut("projectSettings")
        .and_then(Value::as_object_mut)
    {
        settings
            .entry("inputMap")
            .or_insert_with(|| Value::Array(Vec::new()));
        settings.entry("audio").or_insert_with(|| {
            json!({
                "masterVolume": 1.0,
                "sampleRate": 48000,
                "buses": { "Master": 1.0, "Music": 1.0, "SFX": 1.0, "UI": 1.0 }
            })
        });
        settings.entry("build").or_insert_with(|| {
            json!({
                "gameName": "MyGame", "target": "windows", "architecture": "x86_64",
                "sceneOrder": [], "startupSceneUuid": "", "packageIntoExecutable": false,
                "developmentBuild": true, "outputDirectory": ""
            })
        });
        settings.entry("scripting").or_insert_with(
            || json!({ "customSignals": [], "maxConsoleEntries": 2000, "debuggerEnabled": true }),
        );
        settings.entry("rendering").or_insert_with(|| json!({
            "lightingEnabled": false,
            "ambientColor": { "r": 255, "g": 255, "b": 255 },
            "ambientIntensity": 1.0,
            "shadowQuality": "Soft",
            "colorSpace": "sRGB",
            "postProcessing": { "enabled": false, "exposure": 0.0, "contrast": 1.0, "saturation": 1.0, "vignette": 0.0, "bloom": 0.0, "blur": 0.0, "userMaterial": null },
            "debugView": "None"
        }));
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
    root.insert("projectFormat".into(), json!(PROJECT_FORMAT_NAME));
    root.insert("projectFormatMajor".into(), json!(PROJECT_FORMAT_MAJOR));
    root.insert("formatVersion".into(), json!(CURRENT_FORMAT_VERSION));
    root.insert("engineVersion".into(), json!(CURRENT_ENGINE_VERSION));
    root.insert(
        "compatibility".into(),
        json!({
            "format": PROJECT_FORMAT_NAME,
            "major": PROJECT_FORMAT_MAJOR,
            "schemaVersion": CURRENT_FORMAT_VERSION,
            "minimumSchemaVersion": MINIMUM_SUPPORTED_FORMAT_VERSION
        }),
    );
    let project: ProjectFile = serde_json::from_value(Value::Object(root))
        .map_err(|error| FormatError(format!("project schema is invalid: {error}")))?;
    validate_project(&project)?;
    Ok(project)
}

pub fn validate_project(project: &ProjectFile) -> Result<(), FormatError> {
    if project.project_format != PROJECT_FORMAT_NAME
        || project.project_format_major != PROJECT_FORMAT_MAJOR
        || project.compatibility.format != PROJECT_FORMAT_NAME
        || project.compatibility.major != PROJECT_FORMAT_MAJOR
        || project.compatibility.schema_version != CURRENT_FORMAT_VERSION
        || project.compatibility.minimum_schema_version != MINIMUM_SUPPORTED_FORMAT_VERSION
    {
        return Err(FormatError(
            "project compatibility metadata does not match Nova_A Project Format 2".into(),
        ));
    }
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
    validate_project_settings(project.extra.get("projectSettings"))?;
    let mut identities = std::collections::HashSet::new();
    let mut asset_types = HashMap::<&str, &str>::new();
    for asset in &project.assets {
        if !is_uuid(&asset.uuid) || !identities.insert(asset.uuid.as_str()) {
            return Err(FormatError(format!(
                "invalid or duplicate asset UUID: {}",
                asset.uuid
            )));
        }
        if asset.path.split('/').any(|part| part == "..") {
            return Err(FormatError(format!(
                "asset {} contains an unsafe project path",
                asset.uuid
            )));
        }
        asset_types.insert(asset.uuid.as_str(), asset.asset_type.as_str());
        if asset.asset_type == "script" {
            validate_script_asset(asset)?;
        }
    }
    validate_project_metadata(project.extra.get("projectMetadata"))?;
    validate_plugins(project.extra.get("plugins"), &asset_types)?;
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
                if !is_standard_component_kind(&component.kind) {
                    return Err(FormatError(format!(
                        "entity {} contains unsupported component kind {}",
                        entity.uuid, component.kind
                    )));
                }
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
                } else if component.kind == "Script2D" {
                    validate_asset_reference(
                        component.data.get("scriptAsset"),
                        "script",
                        &asset_types,
                    )?;
                } else if component.kind == "SpriteRenderer2D" {
                    validate_asset_reference(
                        component.data.get("spriteAsset"),
                        "image",
                        &asset_types,
                    )?;
                    validate_asset_reference(
                        component.data.get("normalMapAsset"),
                        "image",
                        &asset_types,
                    )?;
                } else if component.kind == "TextRenderer2D" {
                    validate_asset_reference(
                        component.data.get("fontAsset"),
                        "font",
                        &asset_types,
                    )?;
                } else if component.kind == "Animator" {
                    validate_asset_reference(
                        component.data.get("controllerAsset"),
                        "controller",
                        &asset_types,
                    )?;
                } else if component.kind == "Skeleton2D" {
                    validate_asset_reference(component.data.get("rigAsset"), "rig", &asset_types)?;
                    validate_asset_reference(
                        component.data.get("skinAsset"),
                        "skin",
                        &asset_types,
                    )?;
                } else if component.kind == "TimelinePlayer" {
                    validate_asset_reference(
                        component.data.get("timelineAsset"),
                        "timeline",
                        &asset_types,
                    )?;
                } else if component.kind == "AudioSource" {
                    validate_asset_reference(
                        component.data.get("audioClip"),
                        "audio",
                        &asset_types,
                    )?;
                } else if component.kind == "Image" {
                    validate_asset_reference(
                        component.data.get("spriteAsset"),
                        "image",
                        &asset_types,
                    )?;
                } else if component.kind == "Text" {
                    validate_asset_reference(
                        component.data.get("fontAsset"),
                        "font",
                        &asset_types,
                    )?;
                } else if component.kind == "TileMap2D" {
                    validate_asset_reference(
                        component.data.get("tileSetAsset"),
                        "tileset",
                        &asset_types,
                    )?;
                } else if component.kind == "ParticleEmitter2D" {
                    validate_asset_reference(
                        component.data.get("textureAsset"),
                        "image",
                        &asset_types,
                    )?;
                } else if matches!(
                    component.kind.as_str(),
                    "FixedJoint2D"
                        | "DistanceJoint2D"
                        | "RevoluteJoint2D"
                        | "PrismaticJoint2D"
                        | "SpringJoint2D"
                ) {
                    if let Some(target) = component
                        .data
                        .get("targetEntityUuid")
                        .and_then(Value::as_str)
                    {
                        if !entity_ids.contains(target) || target == entity.uuid {
                            return Err(FormatError(format!(
                                "joint {} refers to an invalid target entity {}",
                                component.uuid, target
                            )));
                        }
                    }
                }
            }
            if !component_kinds.contains("Transform2D") {
                return Err(FormatError(format!(
                    "entity {} is missing mandatory Transform2D",
                    entity.uuid
                )));
            }
            validate_asset_reference(entity.extra.get("prefabAsset"), "prefab", &asset_types)?;
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

fn validate_asset_reference(
    value: Option<&Value>,
    expected_type: &str,
    asset_types: &HashMap<&str, &str>,
) -> Result<(), FormatError> {
    let Some(reference) = value.and_then(Value::as_str) else {
        return Ok(());
    };
    let Some(uuid) = reference.strip_prefix("asset://") else {
        return Err(FormatError(format!("invalid asset reference: {reference}")));
    };
    let Some(actual_type) = asset_types.get(uuid) else {
        return Err(FormatError(format!(
            "asset reference points to missing asset: {uuid}"
        )));
    };
    if *actual_type != expected_type {
        return Err(FormatError(format!(
            "asset {uuid} has type {actual_type}, expected {expected_type}"
        )));
    }
    Ok(())
}

fn is_standard_component_kind(kind: &str) -> bool {
    matches!(
        kind,
        "Transform2D"
            | "Camera2D"
            | "SpriteRenderer2D"
            | "ShapeRenderer2D"
            | "TextRenderer2D"
            | "RigidBody2D"
            | "BoxCollider2D"
            | "EllipseCollider2D"
            | "PolygonCollider2D"
            | "FixedJoint2D"
            | "DistanceJoint2D"
            | "RevoluteJoint2D"
            | "PrismaticJoint2D"
            | "SpringJoint2D"
            | "Rope2D"
            | "Script2D"
            | "Animator"
            | "Skeleton2D"
            | "TimelinePlayer"
            | "AudioSource"
            | "AudioListener"
            | "ParticleEmitter2D"
            | "Light2D"
            | "ShadowCaster2D"
            | "Canvas"
            | "RectTransform"
            | "Panel"
            | "Image"
            | "Text"
            | "Button"
            | "Slider"
            | "ProgressBar"
            | "Checkbox"
            | "TextInput"
            | "TileMap2D"
    )
}

fn validate_project_metadata(value: Option<&Value>) -> Result<(), FormatError> {
    let metadata = value
        .and_then(Value::as_object)
        .ok_or_else(|| FormatError("projectMetadata must be an object".into()))?;
    let id = metadata.get("id").and_then(Value::as_str).unwrap_or("");
    let name = metadata.get("name").and_then(Value::as_str).unwrap_or("");
    if !is_uuid(id) {
        return Err(FormatError("projectMetadata.id must be a UUID".into()));
    }
    if name.trim().is_empty() || name.chars().count() > 80 {
        return Err(FormatError(
            "projectMetadata.name must contain 1 to 80 characters".into(),
        ));
    }
    if metadata.get("format").and_then(Value::as_str) != Some(PROJECT_FORMAT_NAME) {
        return Err(FormatError(
            "projectMetadata.format must identify Nova_A Project Format 2".into(),
        ));
    }
    Ok(())
}

fn validate_plugins(
    value: Option<&Value>,
    asset_types: &HashMap<&str, &str>,
) -> Result<(), FormatError> {
    let plugins = value
        .and_then(Value::as_array)
        .ok_or_else(|| FormatError("plugins must be an array".into()))?;
    if plugins.len() > 256 {
        return Err(FormatError(
            "a project cannot configure more than 256 plugins".into(),
        ));
    }
    let mut ids = std::collections::HashSet::new();
    for plugin in plugins {
        let plugin = plugin
            .as_object()
            .ok_or_else(|| FormatError("every plugin manifest must be an object".into()))?;
        let id = plugin.get("id").and_then(Value::as_str).unwrap_or("");
        let name = plugin.get("name").and_then(Value::as_str).unwrap_or("");
        let entry = plugin.get("entry").and_then(Value::as_str).unwrap_or("");
        if id.is_empty()
            || id.len() > 120
            || !id.contains('.')
            || !id.chars().all(|character| {
                character.is_ascii_lowercase()
                    || character.is_ascii_digit()
                    || matches!(character, '.' | '-')
            })
            || !ids.insert(id)
        {
            return Err(FormatError(format!("invalid or duplicate plugin id: {id}")));
        }
        if name.trim().is_empty() || name.chars().count() > 120 {
            return Err(FormatError(format!("plugin {id} has an invalid name")));
        }
        if plugin.get("apiVersion").and_then(Value::as_u64) != Some(1) {
            return Err(FormatError(format!(
                "plugin {id} does not target Nova_A WASM Plugin API 1"
            )));
        }
        if !entry.ends_with(".wasm")
            || entry.contains("..")
            || entry.contains('\\')
            || entry.starts_with('/')
        {
            return Err(FormatError(format!("plugin {id} has an unsafe entry path")));
        }
        let permissions = plugin
            .get("permissions")
            .and_then(Value::as_array)
            .ok_or_else(|| FormatError(format!("plugin {id} permissions must be an array")))?;
        if permissions
            .iter()
            .any(|permission| !matches!(permission.as_str(), Some("log" | "events")))
        {
            return Err(FormatError(format!(
                "plugin {id} requests an unsupported permission"
            )));
        }
        validate_asset_reference(plugin.get("entryAsset"), "other", asset_types)?;
    }
    Ok(())
}

fn validate_project_settings(value: Option<&Value>) -> Result<(), FormatError> {
    let settings = value
        .and_then(Value::as_object)
        .ok_or_else(|| FormatError("projectSettings must be an object".into()))?;
    let actions = settings
        .get("inputMap")
        .and_then(Value::as_array)
        .ok_or_else(|| FormatError("projectSettings.inputMap must be an array".into()))?;
    if let Some(rendering) = settings.get("rendering") {
        let rendering = rendering
            .as_object()
            .ok_or_else(|| FormatError("projectSettings.rendering must be an object".into()))?;
        if !rendering
            .get("lightingEnabled")
            .is_some_and(Value::is_boolean)
        {
            return Err(FormatError(
                "projectSettings.rendering.lightingEnabled must be a boolean".into(),
            ));
        }
        if !matches!(
            rendering.get("shadowQuality").and_then(Value::as_str),
            Some("Off" | "Hard" | "Soft" | "Ultra")
        ) {
            return Err(FormatError(
                "projectSettings.rendering.shadowQuality is unsupported".into(),
            ));
        }
        if !matches!(
            rendering.get("colorSpace").and_then(Value::as_str),
            Some("sRGB" | "Linear")
        ) {
            return Err(FormatError(
                "projectSettings.rendering.colorSpace is unsupported".into(),
            ));
        }
        if !rendering
            .get("postProcessing")
            .is_some_and(Value::is_object)
        {
            return Err(FormatError(
                "projectSettings.rendering.postProcessing must be an object".into(),
            ));
        }
    }
    if let Some(scripting) = settings.get("scripting") {
        let scripting = scripting
            .as_object()
            .ok_or_else(|| FormatError("projectSettings.scripting must be an object".into()))?;
        let signals = scripting
            .get("customSignals")
            .and_then(Value::as_array)
            .ok_or_else(|| {
                FormatError("projectSettings.scripting.customSignals must be an array".into())
            })?;
        if signals.len() > 256
            || signals.iter().any(|signal| {
                !signal
                    .as_str()
                    .is_some_and(|name| !name.trim().is_empty() && name.len() <= 128)
            })
        {
            return Err(FormatError(
                "projectSettings.scripting.customSignals contains an invalid signal".into(),
            ));
        }
        if !matches!(
            scripting.get("maxConsoleEntries").and_then(Value::as_u64),
            Some(100..=10000)
        ) {
            return Err(FormatError(
                "projectSettings.scripting.maxConsoleEntries must be between 100 and 10000".into(),
            ));
        }
        if !scripting
            .get("debuggerEnabled")
            .is_some_and(Value::is_boolean)
        {
            return Err(FormatError(
                "projectSettings.scripting.debuggerEnabled must be a boolean".into(),
            ));
        }
    }
    if let Some(build) = settings.get("build") {
        let build = build
            .as_object()
            .ok_or_else(|| FormatError("projectSettings.build must be an object".into()))?;
        let game_name = build
            .get("gameName")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim();
        if game_name.is_empty() || game_name.len() > 80 {
            return Err(FormatError(
                "projectSettings.build.gameName must contain 1 to 80 characters".into(),
            ));
        }
        if !matches!(
            build.get("target").and_then(Value::as_str),
            Some("windows" | "linux" | "macos" | "web")
        ) {
            return Err(FormatError(
                "projectSettings.build.target is unsupported".into(),
            ));
        }
        if build.get("architecture").and_then(Value::as_str) != Some("x86_64") {
            return Err(FormatError(
                "projectSettings.build.architecture is unsupported".into(),
            ));
        }
        if !build.get("sceneOrder").is_some_and(Value::is_array) {
            return Err(FormatError(
                "projectSettings.build.sceneOrder must be an array".into(),
            ));
        }
    }
    if let Some(audio) = settings.get("audio") {
        let audio = audio
            .as_object()
            .ok_or_else(|| FormatError("projectSettings.audio must be an object".into()))?;
        let unit_gain = |name: &str, value: Option<&Value>| -> Result<(), FormatError> {
            let gain = value
                .and_then(Value::as_f64)
                .ok_or_else(|| FormatError(format!("{name} must be a number")))?;
            if !(0.0..=1.0).contains(&gain) {
                return Err(FormatError(format!("{name} must be between 0 and 1")));
            }
            Ok(())
        };
        unit_gain(
            "projectSettings.audio.masterVolume",
            audio.get("masterVolume"),
        )?;
        if !matches!(
            audio.get("sampleRate").and_then(Value::as_u64),
            Some(44100 | 48000 | 96000)
        ) {
            return Err(FormatError(
                "projectSettings.audio.sampleRate is unsupported".into(),
            ));
        }
        let buses = audio
            .get("buses")
            .and_then(Value::as_object)
            .ok_or_else(|| FormatError("projectSettings.audio.buses must be an object".into()))?;
        for bus in ["Master", "Music", "SFX", "UI"] {
            unit_gain(
                &format!("projectSettings.audio.buses.{bus}"),
                buses.get(bus),
            )?;
        }
    }
    if actions.len() > 128 {
        return Err(FormatError(
            "input map cannot contain more than 128 actions".into(),
        ));
    }
    let mut action_names = std::collections::HashSet::new();
    for action in actions {
        let action = action
            .as_object()
            .ok_or_else(|| FormatError("every input action must be an object".into()))?;
        let name = action
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim();
        if name.is_empty() || name.len() > 80 || !action_names.insert(name) {
            return Err(FormatError(format!(
                "invalid or duplicate input action: {name}"
            )));
        }
        if !matches!(
            action.get("kind").and_then(Value::as_str),
            Some("button" | "axis" | "vector2")
        ) {
            return Err(FormatError(format!(
                "input action {name} has an invalid kind"
            )));
        }
        let bindings = action
            .get("bindings")
            .and_then(Value::as_array)
            .ok_or_else(|| FormatError(format!("input action {name} bindings must be an array")))?;
        if bindings.len() > 32 {
            return Err(FormatError(format!(
                "input action {name} has too many bindings"
            )));
        }
        for binding in bindings {
            let binding = binding.as_object().ok_or_else(|| {
                FormatError(format!("input action {name} contains an invalid binding"))
            })?;
            if !matches!(
                binding.get("device").and_then(Value::as_str),
                Some(
                    "keyboard" | "mouse-button" | "mouse-wheel" | "gamepad-button" | "gamepad-axis"
                )
            ) {
                return Err(FormatError(format!(
                    "input action {name} contains an invalid device"
                )));
            }
            if !binding
                .get("code")
                .and_then(Value::as_str)
                .is_some_and(|code| !code.is_empty() && code.len() <= 80)
            {
                return Err(FormatError(format!(
                    "input action {name} contains an invalid code"
                )));
            }
        }
    }
    Ok(())
}

fn validate_script_asset(asset: &AssetReference) -> Result<(), FormatError> {
    let Some(metadata) = asset.extra.get("script") else {
        return Ok(());
    };
    let metadata = metadata
        .as_object()
        .ok_or_else(|| FormatError(format!("script metadata must be an object: {}", asset.path)))?;
    if metadata.get("version").and_then(Value::as_u64) != Some(1) {
        return Err(FormatError(format!(
            "script metadata version is unsupported: {}",
            asset.path
        )));
    }
    let breakpoints = metadata
        .get("breakpoints")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            FormatError(format!(
                "script breakpoints must be an array: {}",
                asset.path
            ))
        })?;
    if breakpoints.len() > 1000
        || breakpoints.iter().any(|line| {
            !line
                .as_u64()
                .is_some_and(|line| line > 0 && line <= 1_000_000)
        })
    {
        return Err(FormatError(format!(
            "script breakpoints are invalid: {}",
            asset.path
        )));
    }
    for key in ["tests", "packageDependencies"] {
        let entries = metadata
            .get(key)
            .and_then(Value::as_array)
            .ok_or_else(|| FormatError(format!("script {key} must be an array: {}", asset.path)))?;
        if entries.len() > 256
            || entries
                .iter()
                .any(|entry| !entry.as_str().is_some_and(|value| value.len() <= 256))
        {
            return Err(FormatError(format!(
                "script {key} is invalid: {}",
                asset.path
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
        entity.entry("editorVisible").or_insert(Value::Bool(true));
        entity.entry("editorLocked").or_insert(Value::Bool(false));
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
        assert!(migrated.scenes[1].entities[0].editor_visible);
        assert!(!migrated.scenes[1].entities[0].editor_locked);
    }

    #[test]
    fn preserves_v1_5_assets_import_metadata_and_empty_folders() {
        let scene = deterministic_uuid("asset-scene");
        let asset = deterministic_uuid("asset-image");
        let source = json!({
            "formatVersion": 8,
            "activeSceneUuid": scene,
            "assetFolders": ["Assets/Sprites/Empty"],
            "assets": [{
                "uuid": asset,
                "path": "Assets/Sprites/hero.png",
                "assetType": "image",
                "mimeType": "image/png",
                "settings": {"filterMode":"Nearest","pixelsPerUnit":32,"atlas":true}
            }],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[],"connections":[]}]
        });
        let migrated = migrate_project_value(source).unwrap();
        assert_eq!(migrated.format_version, CURRENT_FORMAT_VERSION);
        assert_eq!(migrated.assets.len(), 1);
        assert_eq!(migrated.assets[0].uuid, asset);
        assert_eq!(migrated.assets[0].extra["mimeType"], "image/png");
        assert_eq!(migrated.assets[0].extra["settings"]["pixelsPerUnit"], 32);
        assert_eq!(migrated.extra["assetFolders"][0], "Assets/Sprites/Empty");
    }

    #[test]
    fn migrates_audio_settings_and_validates_v1_7_asset_components() {
        let scene = deterministic_uuid("v1-7-scene");
        let entity = deterministic_uuid("v1-7-entity");
        let transform = deterministic_uuid("v1-7-transform");
        let animator = deterministic_uuid("v1-7-animator");
        let audio_source = deterministic_uuid("v1-7-audio-source");
        let controller = deterministic_uuid("v1-7-controller");
        let audio = deterministic_uuid("v1-7-audio");
        let source = json!({
            "formatVersion": 10,
            "activeSceneUuid": scene,
            "projectSettings": {"inputMap": []},
            "assets": [
                {"uuid":controller,"path":"Assets/Controllers/player.nova-controller","assetType":"controller"},
                {"uuid":audio,"path":"Assets/Audio/jump.wav","assetType":"audio"}
            ],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[{
                "uuid":entity,"name":"Player","components":[
                    {"uuid":transform,"kind":"Transform2D","data":{"parentUuid":null}},
                    {"uuid":animator,"kind":"Animator","data":{"controllerAsset":format!("asset://{controller}")}},
                    {"uuid":audio_source,"kind":"AudioSource","data":{"audioClip":format!("asset://{audio}")}}
                ]
            }],"connections":[]}]
        });
        let migrated = migrate_project_value(source).unwrap();
        assert_eq!(migrated.format_version, CURRENT_FORMAT_VERSION);
        assert_eq!(
            migrated.extra["projectSettings"]["audio"]["sampleRate"],
            48000
        );
        assert_eq!(
            migrated.extra["projectSettings"]["audio"]["buses"]["SFX"],
            1.0
        );
    }

    #[test]
    fn validates_v1_8_tilemap_particles_and_joint_targets() {
        let scene = deterministic_uuid("v1-8-scene");
        let tile_entity = deterministic_uuid("v1-8-tile-entity");
        let body_entity = deterministic_uuid("v1-8-body-entity");
        let tile_transform = deterministic_uuid("v1-8-tile-transform");
        let body_transform = deterministic_uuid("v1-8-body-transform");
        let tilemap = deterministic_uuid("v1-8-tilemap");
        let particles = deterministic_uuid("v1-8-particles");
        let joint = deterministic_uuid("v1-8-joint");
        let tileset = deterministic_uuid("v1-8-tileset-asset");
        let image = deterministic_uuid("v1-8-image-asset");
        let source = json!({
            "formatVersion": 11,
            "activeSceneUuid": scene,
            "assets": [
                {"uuid":tileset,"path":"Assets/TileSets/world.nova-tileset","assetType":"tileset"},
                {"uuid":image,"path":"Assets/Textures/spark.png","assetType":"image"}
            ],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[
                {"uuid":tile_entity,"name":"World","components":[
                    {"uuid":tile_transform,"kind":"Transform2D","data":{"parentUuid":null}},
                    {"uuid":tilemap,"kind":"TileMap2D","data":{"tileSetAsset":format!("asset://{tileset}")}},
                    {"uuid":particles,"kind":"ParticleEmitter2D","data":{"textureAsset":format!("asset://{image}")}},
                    {"uuid":joint,"kind":"FixedJoint2D","data":{"targetEntityUuid":body_entity}}
                ]},
                {"uuid":body_entity,"name":"Body","components":[
                    {"uuid":body_transform,"kind":"Transform2D","data":{"parentUuid":null}}
                ]}
            ],"connections":[]}]
        });
        let migrated = migrate_project_value(source).unwrap();
        assert_eq!(migrated.format_version, CURRENT_FORMAT_VERSION);
        assert_eq!(migrated.engine_version, CURRENT_ENGINE_VERSION);
    }

    #[test]
    fn rejects_v1_8_joint_targeting_its_own_entity() {
        let scene = deterministic_uuid("v1-8-invalid-scene");
        let entity = deterministic_uuid("v1-8-invalid-entity");
        let transform = deterministic_uuid("v1-8-invalid-transform");
        let joint = deterministic_uuid("v1-8-invalid-joint");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "assets": [],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[{
                "uuid":entity,"name":"Body","components":[
                    {"uuid":transform,"kind":"Transform2D","data":{"parentUuid":null}},
                    {"uuid":joint,"kind":"FixedJoint2D","data":{"targetEntityUuid":entity}}
                ]
            }],"connections":[]}]
        });
        let error = migrate_project_value(source).unwrap_err();
        assert!(error.0.contains("invalid target entity"));
    }

    #[test]
    fn rejects_invalid_v1_7_audio_gain() {
        let scene = deterministic_uuid("invalid-audio-scene");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "projectSettings": {"inputMap": [], "audio": {
                "masterVolume": 2.0, "sampleRate": 48000,
                "buses": {"Master":1.0,"Music":1.0,"SFX":1.0,"UI":1.0}
            }},
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[],"connections":[]}]
        });
        assert!(migrate_project_value(source).is_err());
    }

    #[test]
    fn validates_v1_6_scripts_prefabs_and_input_actions() {
        let scene = deterministic_uuid("gameplay-scene");
        let entity = deterministic_uuid("scripted-entity");
        let transform = deterministic_uuid("scripted-transform");
        let script_component = deterministic_uuid("script-component");
        let script_asset = deterministic_uuid("script-asset");
        let prefab_asset = deterministic_uuid("prefab-asset");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "projectSettings": {"inputMap":[{
                "name":"Jump", "kind":"button", "bindings":[{
                    "device":"keyboard", "code":"Space", "scale":1,
                    "x":1, "y":0, "gamepad":0, "deadzone":0.18
                }]
            }]},
            "assets": [
                {"uuid":script_asset,"path":"Assets/Scripts/player.rhai","assetType":"script"},
                {"uuid":prefab_asset,"path":"Assets/Prefabs/player.nova-prefab","assetType":"prefab"}
            ],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[{
                "uuid":entity,"name":"Player","prefabAsset":format!("asset://{prefab_asset}"),
                "components":[
                    {"uuid":transform,"kind":"Transform2D","enabled":true,"data":{"parentUuid":null}},
                    {"uuid":script_component,"kind":"Script2D","enabled":true,"data":{"scriptAsset":format!("asset://{script_asset}"),"properties":{"speed":5.0}}}
                ]
            }],"connections":[]}]
        });
        let migrated = migrate_project_value(source).unwrap();
        assert_eq!(
            migrated.extra["projectSettings"]["inputMap"][0]["name"],
            "Jump"
        );
        assert_eq!(
            migrated.scenes[0].entities[0].components[1].kind,
            "Script2D"
        );
    }

    #[test]
    fn rejects_invalid_v1_6_input_devices() {
        let scene = deterministic_uuid("bad-input-scene");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "projectSettings":{"inputMap":[{"name":"Jump","kind":"button","bindings":[{"device":"network","code":"Space"}]}]},
            "assets":[],
            "scenes":[{"uuid":scene,"name":"Main Scene","entities":[],"connections":[]}]
        });
        let error = migrate_project_value(source).unwrap_err();
        assert!(error.0.contains("invalid device"));
    }

    #[test]
    fn rejects_unsafe_asset_paths() {
        let scene = deterministic_uuid("unsafe-asset-scene");
        let asset = deterministic_uuid("unsafe-asset");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "assets": [{"uuid":asset,"path":"Assets/../private.png","assetType":"image"}],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[],"connections":[]}]
        });
        let error = migrate_project_value(source).unwrap_err();
        assert!(error.0.contains("unsafe project path"));
    }

    #[test]
    fn rejects_future_project_formats() {
        let error = migrate_project_str(r#"{"formatVersion":999,"entities":[]}"#).unwrap_err();
        assert!(error.0.contains("newer"));
    }

    #[test]
    fn migrates_v1_9_projects_into_project_format_two() {
        let scene = deterministic_uuid("v1-9-build-scene");
        let source = json!({
            "formatVersion": 13,
            "activeSceneUuid": scene,
            "projectSettings": {"inputMap": []},
            "assets": [],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[],"connections":[]}]
        });
        let migrated = migrate_project_value(source).unwrap();
        assert_eq!(migrated.project_format, PROJECT_FORMAT_NAME);
        assert_eq!(migrated.project_format_major, PROJECT_FORMAT_MAJOR);
        assert_eq!(migrated.format_version, CURRENT_FORMAT_VERSION);
        assert_eq!(migrated.engine_version, CURRENT_ENGINE_VERSION);
        assert_eq!(
            migrated.extra["projectSettings"]["build"]["architecture"],
            "x86_64"
        );
        assert_eq!(
            migrated.extra["projectSettings"]["build"]["developmentBuild"],
            true
        );
    }

    #[test]
    fn project_format_two_serialization_round_trip_preserves_game_data() {
        let scene = deterministic_uuid("format-two-round-trip-scene");
        let parent = deterministic_uuid("format-two-round-trip-parent");
        let child = deterministic_uuid("format-two-round-trip-child");
        let parent_transform = deterministic_uuid("format-two-round-trip-parent-transform");
        let child_transform = deterministic_uuid("format-two-round-trip-child-transform");
        let script_component = deterministic_uuid("format-two-round-trip-script-component");
        let script_asset = deterministic_uuid("format-two-round-trip-script-asset");
        let prefab_asset = deterministic_uuid("format-two-round-trip-prefab-asset");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "projectSettings": {"inputMap": []},
            "customGameData": {"difficulty":"hard","chapter":3},
            "assets": [
                {"uuid":script_asset,"path":"Assets/Scripts/player.rhai","assetType":"script"},
                {"uuid":prefab_asset,"path":"Assets/Prefabs/player.nova-prefab","assetType":"prefab"}
            ],
            "scenes": [{"uuid":scene,"name":"Gameplay","entities":[
                {"uuid":parent,"name":"Parent","components":[
                    {"uuid":parent_transform,"kind":"Transform2D","data":{"parentUuid":null}}
                ]},
                {"uuid":child,"name":"Child","prefabAsset":format!("asset://{prefab_asset}"),"components":[
                    {"uuid":child_transform,"kind":"Transform2D","data":{"parentUuid":parent}},
                    {"uuid":script_component,"kind":"Script2D","data":{"scriptAsset":format!("asset://{script_asset}"),"properties":{"speed":7.5}}}
                ]}
            ],"connections":[]}]
        });

        let migrated = migrate_project_value(source).unwrap();
        let serialized = serde_json::to_string(&migrated).unwrap();
        let restored: ProjectFile = serde_json::from_str(&serialized).unwrap();

        validate_project(&restored).unwrap();
        assert_eq!(restored.project_format, PROJECT_FORMAT_NAME);
        assert_eq!(restored.extra["customGameData"]["difficulty"], "hard");
        assert_eq!(
            restored.scenes[0].entities[1].extra["prefabAsset"],
            format!("asset://{prefab_asset}")
        );
        assert_eq!(
            restored.scenes[0].entities[1].components[0].data["parentUuid"],
            parent
        );
        assert_eq!(
            restored.scenes[0].entities[1].components[1].data["properties"]["speed"],
            7.5
        );
    }

    #[test]
    fn rejects_missing_hierarchy_parents() {
        let scene = deterministic_uuid("missing-parent-scene");
        let entity = deterministic_uuid("missing-parent-entity");
        let transform = deterministic_uuid("missing-parent-transform");
        let missing_parent = deterministic_uuid("missing-parent-target");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "assets": [],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[{
                "uuid":entity,"name":"Child","components":[
                    {"uuid":transform,"kind":"Transform2D","data":{"parentUuid":missing_parent}}
                ]
            }],"connections":[]}]
        });

        let error = migrate_project_value(source).unwrap_err();
        assert!(error.0.contains("missing parent"));
    }

    #[test]
    fn rejects_hierarchy_cycles() {
        let scene = deterministic_uuid("parent-cycle-scene");
        let entity_a = deterministic_uuid("parent-cycle-a");
        let entity_b = deterministic_uuid("parent-cycle-b");
        let transform_a = deterministic_uuid("parent-cycle-transform-a");
        let transform_b = deterministic_uuid("parent-cycle-transform-b");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "assets": [],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[
                {"uuid":entity_a,"name":"A","components":[
                    {"uuid":transform_a,"kind":"Transform2D","data":{"parentUuid":entity_b}}
                ]},
                {"uuid":entity_b,"name":"B","components":[
                    {"uuid":transform_b,"kind":"Transform2D","data":{"parentUuid":entity_a}}
                ]}
            ],"connections":[]}]
        });

        let error = migrate_project_value(source).unwrap_err();
        assert!(error.0.contains("parent cycle"));
    }

    #[test]
    fn rejects_invalid_build_targets() {
        let scene = deterministic_uuid("v1-9-invalid-build-scene");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "projectSettings": {"inputMap": [], "build": {
                "gameName":"Demo", "target":"console", "architecture":"x86_64", "sceneOrder":[]
            }},
            "assets": [],
            "scenes": [{"uuid":scene,"name":"Main Scene","entities":[],"connections":[]}]
        });
        let error = migrate_project_value(source).unwrap_err();
        assert!(error.0.contains("build.target"));
    }

    #[test]
    fn migrates_and_validates_v2_2_script_metadata_and_settings() {
        let script = deterministic_uuid("v2.2-script");
        let source = json!({
            "formatVersion": 14,
            "engineVersion": "2.1.0",
            "projectSettings": {"inputMap": []},
            "assets": [{
                "uuid": script, "path": "Assets/Scripts/Game.rhai", "assetType": "script",
                "script": {"version": 1, "breakpoints": [3, 8], "tests": ["test_move"], "packageDependencies": []}
            }],
            "entities": []
        });
        let migrated = migrate_project_value(source).unwrap();
        assert_eq!(migrated.format_version, CURRENT_FORMAT_VERSION);
        assert_eq!(
            migrated.extra["projectSettings"]["scripting"]["maxConsoleEntries"],
            2000
        );
        assert_eq!(migrated.assets[0].extra["script"]["breakpoints"][1], 8);
        assert_eq!(
            migrated.extra["projectSettings"]["rendering"]["lightingEnabled"],
            false
        );
    }

    #[test]
    fn migrates_and_round_trips_v2_4_animation_components() {
        let scene = deterministic_uuid("v2.4-scene");
        let entity = deterministic_uuid("v2.4-entity");
        let transform = deterministic_uuid("v2.4-transform");
        let skeleton = deterministic_uuid("v2.4-skeleton");
        let player = deterministic_uuid("v2.4-timeline-player");
        let rig = deterministic_uuid("v2.4-rig");
        let skin = deterministic_uuid("v2.4-skin");
        let timeline = deterministic_uuid("v2.4-timeline");
        let source = json!({
            "formatVersion": 16,
            "engineVersion": "2.3.0",
            "activeSceneUuid": scene,
            "assets": [
                {"uuid":rig,"path":"Assets/Rigs/Hero.nova-rig","assetType":"rig","futureImporterField":{"kept":true}},
                {"uuid":skin,"path":"Assets/Skins/Hero.nova-skin","assetType":"skin"},
                {"uuid":timeline,"path":"Assets/Timelines/Intro.nova-timeline","assetType":"timeline"}
            ],
            "scenes": [{"uuid":scene,"name":"Main","entities":[{
                "uuid":entity,"name":"Hero","components":[
                    {"uuid":transform,"kind":"Transform2D","data":{}},
                    {"uuid":skeleton,"kind":"Skeleton2D","data":{"rigAsset":format!("asset://{rig}"),"skinAsset":format!("asset://{skin}"),"pose":[]}},
                    {"uuid":player,"kind":"TimelinePlayer","data":{"timelineAsset":format!("asset://{timeline}"),"autoplay":true}}
                ]
            }],"connections":[]}]
        });
        let migrated = migrate_project_value(source).unwrap();
        validate_project(&migrated).unwrap();
        assert_eq!(migrated.format_version, 17);
        assert_eq!(migrated.engine_version, "2.4.0");
        assert_eq!(
            migrated.assets[0].extra["futureImporterField"]["kept"],
            true
        );
        let encoded = serde_json::to_string(&migrated).unwrap();
        let restored: ProjectFile = serde_json::from_str(&encoded).unwrap();
        validate_project(&restored).unwrap();
        assert_eq!(
            restored.scenes[0].entities[0].components[1].data["pose"],
            json!([])
        );
    }

    #[test]
    fn rejects_wrong_v2_4_animation_asset_types() {
        let scene = deterministic_uuid("v2.4-wrong-scene");
        let entity = deterministic_uuid("v2.4-wrong-entity");
        let transform = deterministic_uuid("v2.4-wrong-transform");
        let skeleton = deterministic_uuid("v2.4-wrong-skeleton");
        let timeline = deterministic_uuid("v2.4-wrong-timeline");
        let source = json!({
            "formatVersion": CURRENT_FORMAT_VERSION,
            "activeSceneUuid": scene,
            "assets": [{"uuid":timeline,"path":"Assets/Timelines/Intro.nova-timeline","assetType":"timeline"}],
            "scenes": [{"uuid":scene,"name":"Main","entities":[{
                "uuid":entity,"name":"Hero","components":[
                    {"uuid":transform,"kind":"Transform2D","data":{}},
                    {"uuid":skeleton,"kind":"Skeleton2D","data":{"rigAsset":format!("asset://{timeline}")}}
                ]
            }],"connections":[]}]
        });
        let error = migrate_project_value(source).unwrap_err();
        assert!(error.0.contains("expected rig"));
    }
}
