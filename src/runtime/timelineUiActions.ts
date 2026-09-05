import { toRaw } from 'vue'
import type { Entity } from '../world/Entity'
import type { TimelinePlayer } from '../world/components'
import { readTimeline, timelineRuntime } from './timeline'
export const timelineUiActions = ['play', 'pause', 'skip', 'resume'] as const
export type TimelineUiAction = typeof timelineUiActions[number]
export function parseTimelineUiAction(value: string): TimelineUiAction | null {
  return timelineUiActions.find(action => value === '@timeline:' + action) ?? null
}
export function timelineUiOwner(sender: Entity, entities: Entity[]): { owner: Entity | null; issue: string | null } {
  const index = new Map(entities.map(entity => [entity.uuid, entity])), seen = new Set<string>()
  let current: Entity | undefined = sender
  if (toRaw(index.get(sender.uuid)) !== toRaw(sender)) return { owner: null, issue: 'The sender is no longer in this scene.' }
  for (let depth = 0; current && depth < 64; depth++) {
    if (seen.has(current.uuid)) return { owner: null, issue: 'The menu hierarchy contains a cycle.' }
    seen.add(current.uuid)
    if (!current.enabled) return { owner: null, issue: 'The menu or one of its parents is disabled.' }
    const player = current.getComponent<TimelinePlayer>('TimelinePlayer')
    if (player) return player.enabled && !player.removed ? { owner: current, issue: null } : { owner: null, issue: 'The nearest TimelinePlayer is disabled or removed.' }
    if (!current.parentUuid) return { owner: null, issue: 'Add a TimelinePlayer to this button or one of its parents.' }
    current = index.get(current.parentUuid)
    if (!current) return { owner: null, issue: 'The menu parent is missing from this scene.' }
  }
  return { owner: null, issue: 'The menu hierarchy exceeds 64 levels.' }
}
/** Reserved opt-in actions cannot fall through into script callbacks. No project format field is added. */
export function dispatchTimelineUiAction(sender: Entity, value: string, entities: Entity[]): { handled: boolean; succeeded: boolean; issue: string | null } {
  if (!value.startsWith('@timeline:')) return { handled: false, succeeded: false, issue: null }
  const action = parseTimelineUiAction(value)
  if (!action) return { handled: true, succeeded: false, issue: 'Unknown timeline action. Choose an action in the Button Inspector.' }
  const result = timelineUiOwner(sender, entities), player = result.owner?.getComponent<TimelinePlayer>('TimelinePlayer'), document = readTimeline(player?.timelineAsset ?? null)
  if (!result.owner || !player || !document) return { handled: true, succeeded: false, issue: result.issue ?? 'Assign a valid timeline asset to the nearest TimelinePlayer.' }
  let succeeded = false
  if (action === 'play') { player.playing = true; succeeded = timelineRuntime.seek(result.owner.uuid, entities, player.currentTime >= document.duration ? 0 : player.currentTime) }
  else if (action === 'pause') { player.playing = false; succeeded = timelineRuntime.seek(result.owner.uuid, entities, player.currentTime) }
  else if (action === 'skip') succeeded = timelineRuntime.skip(result.owner.uuid, entities)
  else succeeded = timelineRuntime.resume(result.owner.uuid, entities)
  return { handled: true, succeeded, issue: succeeded ? null : action === 'skip' ? 'Skip is unavailable: start the timeline, choose a later marker, and check unskippable clips.' : 'The timeline action could not be applied to the current playback state.' }
}
