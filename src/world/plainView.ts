/**
 * Hosts that keep the world in observable (proxied) storage can hand the Runtime the plain objects
 * behind those proxies for the duration of a simulation frame. Runtime code never imports the
 * host's reactivity library; the Editor installs its unwrapping function, and the Player keeps the
 * default identity view because its world is plain already.
 */
type PlainView = <T>(value: T) => T

let view: PlainView = value => value

/** Installed once by a host whose world storage is proxied. */
export function installPlainView(next: PlainView): void { view = next }

/** The plain object behind a host proxy, or the value itself. Use for identity keys and hot loops. */
export function plainView<T>(value: T): T { return value === null || typeof value !== 'object' ? value : view(value) }

/** A Map keyed by object identity that treats a host proxy and its plain object as the same key. */
export class PlainKeyMap<K extends object, V> extends Map<K, V> {
  override get(key: K): V | undefined { return super.get(plainView(key)) }
  override set(key: K, value: V): this { return super.set(plainView(key), value) }
  override has(key: K): boolean { return super.has(plainView(key)) }
  override delete(key: K): boolean { return super.delete(plainView(key)) }
}
