# `.nova-graph` format 1

Media type: `application/x-nova-graph+json`  
Extension: `.nova-graph`  
Runtime API: Rhai API v2  
Engine release: Nova_A 5.2.0

The root object contains `format: "nova-graph"`, `version: 1`, `apiVersion: 2`, graph `uuid` and `name`, followed by `variables`, `nodes`, `edges`, `comments` and `viewport`. Unknown root formats or versions fail closed.

Variables record UUID, identifier, value type/default, exposed/serialized flags, Inspector group/tooltip, numeric constraints and optional resource type. Nodes record stable type plus presentation title/category, position/size/collapse state, owned pins and bounded configuration. Pins own stable UUIDs and explicit key/name, direction, execution/data kind, optional value type, required state and default. Edges refer only to node/pin UUID pairs. Comments and viewport are authoring state and never affect runtime semantics.

Canonical encoding is UTF-8 JSON with two-space indentation and a trailing newline. Variables, nodes, edges and comments are ordinally sorted by UUID; object-valued Data/config keys are ordinally sorted; pin order stays semantic because it preserves callable parameter order. Titles may be translated or renamed without changing type, UUID or compiled behavior.

Format 1 has no implicit migration. A future incompatible change must increase `version`; an API-compatible catalog addition remains API v2 and is checked against each stored node's pin schema at validation time.

