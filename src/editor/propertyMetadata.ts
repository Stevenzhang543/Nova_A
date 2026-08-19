export interface PropertyMetadata {
  path: string
  unit?: string
  minimum?: number
  maximum?: number
  defaults: Array<string | number | boolean>
  help: string
  enumDocs?: Record<string, string>
}

/** Stable inspector metadata used by validation, actions, documentation, and tests. */
export const PROPERTY_METADATA: Record<string, PropertyMetadata> = {
  'Entity.enabled': { path: 'Entity.enabled', defaults: [true], help: 'Controls whether runtime systems process this object.' },
  'Entity.visible': { path: 'Entity.visible', defaults: [true], help: 'Controls editor and authored render visibility.' },
  'Authoring.zOrder': { path: 'Authoring.zOrder', defaults: [0], help: 'Orders objects inside one render layer.' },
  'Authoring.renderLayer': { path: 'Authoring.renderLayer', minimum: 0, defaults: [1], help: 'Selects the independent 2D render layer.' },
  'Authoring.sortMode': { path: 'Authoring.sortMode', defaults: ['LayerThenOrder'], help: 'Chooses explicit order or vertical Y sorting.', enumDocs: { LayerThenOrder: 'Sort by render layer and z order.', YSort: 'Sort vertically by world Y after the render layer.' } },
  'Authoring.origin': { path: 'Authoring.origin', unit: 'm', defaults: [0, 0], help: 'Sets the local authoring pivot for non-sprite objects.' },
  'Canvas.screenSpace': { path: 'Canvas.screenSpace', defaults: [false], help: 'Renders descendants in screen space instead of world space.' },
  'Canvas.followCamera': { path: 'Canvas.followCamera', defaults: [true], help: 'Keeps world-space canvas descendants attached to the active camera.' },
  'Parallax.motionScale': { path: 'Parallax.motionScale', defaults: [.5, .5], help: 'Scales camera movement independently on each axis.' },
  'Parallax.repeat': { path: 'Parallax.repeat', unit: 'm', minimum: 0, defaults: [0, 0], help: 'Sets the optional repetition distance; zero disables repetition on that axis.' },
  'Transform.position': { path: 'Transform.position', unit: 'm', defaults: [0, 0], help: 'Local position relative to the hierarchy parent.' },
  'Transform.rotation': { path: 'Transform.rotation', unit: '°', minimum: -180, maximum: 180, defaults: [0], help: 'Clockwise local rotation in degrees.' },
  'Transform.scale': { path: 'Transform.scale', minimum: .000001, defaults: [1, 1], help: 'Unitless local scale. Values must remain positive.' },
  'Sprite.size': { path: 'Sprite.size', unit: 'm', minimum: .000001, defaults: [1, 1], help: 'Rendered width and height in world units.' },
  'Sprite.pivot': { path: 'Sprite.pivot', minimum: 0, maximum: 1, defaults: [.5, .5], help: 'Normalized origin inside the sprite region.' },
  'Sprite.opacity': { path: 'Sprite.opacity', unit: '%', minimum: 0, maximum: 100, defaults: [100], help: 'Modulation alpha applied during rendering.' },
  'Sprite.flipX': { path: 'Sprite.flipX', defaults: [false], help: 'Mirrors sprite texture coordinates horizontally.' },
  'Sprite.flipY': { path: 'Sprite.flipY', defaults: [false], help: 'Mirrors sprite texture coordinates vertically.' },
  'Camera.orthographicSize': { path: 'Camera.orthographicSize', unit: 'm', minimum: .000001, defaults: [10], help: 'Half-height of the orthographic camera view.' },
  'Camera.zoom': { path: 'Camera.zoom', minimum: .000001, defaults: [1], help: 'Magnification applied after orthographic size.' },
  'Camera.smoothingSpeed': { path: 'Camera.smoothingSpeed', unit: 's⁻¹', minimum: 0, defaults: [5], help: 'Exponential camera-follow convergence speed.' },
  'Camera.pixelPerfect': { path: 'Camera.pixelPerfect', defaults: [false], help: 'Quantizes camera scale and position to device pixels.' }
}

export function propertyMetadata(path: string): PropertyMetadata | undefined { return PROPERTY_METADATA[path] }
