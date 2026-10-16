/** Unique lazy Editor composition of the shared stateless record builder. */
import { t } from '../i18n'
import {getEditorTileMapOwner} from './tileMapAdapter'
import {physicsState} from '../store/physics'
import { createEntityBuilder, type EntityBuilder } from '../world/entityBuilder'
let builder: EntityBuilder | null = null
/** Module construction reads no World/store state. Locale and Tile cache remain live. */
export function getEditorEntityBuilder(): EntityBuilder {
  return builder ??= createEntityBuilder({message:t,invalidateTileMap:component=>getEditorTileMapOwner(physicsState.world).invalidateTileMap(component)})
}
