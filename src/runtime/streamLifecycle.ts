/** 流送生命周期工具：协调可取消工作与实体或场景的激活、退休边界。 */
import { toRaw } from 'vue'
import type { Entity } from '../world/Entity'
import { beginEntityLifetime, retireEntityLifetime } from './entityLifetimes'
interface StreamRuntimeHooks { beforeDeactivate(entities: Entity[], world: Entity[]): void; afterActivate(entities: Entity[], fresh: Entity[]): void }
let hooks: StreamRuntimeHooks | null = null
let initialized = new WeakSet<Entity>()
/** 替换流式生命周期钩子，并以现存实体原始对象初始化弱引用集合。 */ export function setStreamRuntimeHooks(value: StreamRuntimeHooks | null, existing: Entity[] = []): void { hooks = value; initialized = new WeakSet(existing.map(toRaw)) }
/** 先调用停用钩子，再终止每个流式实体的生命周期。 */ export function deactivateStreamEntities(entities: Entity[], world: Entity[]): void { if (!entities.length) return; hooks?.beforeDeactivate(entities, world); for (const entity of entities) retireEntityLifetime(entity) }
/** 识别首次激活实体，登记对象并开启新生命周期，再通知激活钩子。 */ export function activateStreamEntities(entities: Entity[]): void { if (!entities.length) return; const fresh = entities.filter(/* 返回 initialized.has(toRaw(entity)) 的逻辑取反结果。 */ entity => !initialized.has(toRaw(entity))); for (const entity of entities) { initialized.add(toRaw(entity)); beginEntityLifetime(entity) }; hooks?.afterActivate(entities, fresh) }
