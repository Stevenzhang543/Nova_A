/** Pure compatibility port for the original Editor root; no eager World/resource access. */
import {RuntimeParticleOwner,createInitialParticleDiagnostics,type ParticleDiagnostics} from './particleOwner'
import type {Entity} from '../world/Entity'
import type {Vec2} from '../world/types'
import type {Renderer2D} from '../renderer/types'
export {normalizeParticleEmitter} from './particleEmitterValues'
const raw=createInitialParticleDiagnostics()
export let particleDiagnostics:ParticleDiagnostics=raw
export function getLegacyParticleDiagnosticsRaw(){return raw}
export interface LegacyParticlePort {diagnostics:ParticleDiagnostics;unwrap<T>(value:T):T;getOwner():RuntimeParticleOwner}
let port:LegacyParticlePort|null=null
export function installLegacyParticlePort(next:LegacyParticlePort):void{
 if(port){if(port===next)return;throw new Error('PARTICLE_PORT_ALREADY_INSTALLED')}
 if(!next||typeof next.getOwner!=='function'||typeof next.unwrap!=='function'||next.unwrap(next.diagnostics)!==raw)throw new Error('PARTICLE_PORT_SAME_RAW_REQUIRED')
 port=next;particleDiagnostics=next.diagnostics
}
function requireOwner(entities?:Entity[]):RuntimeParticleOwner{
 if(!port)throw new Error('PARTICLE_LEGACY_PORT_REQUIRED')
 const owner=port.getOwner()
 if(!(owner instanceof RuntimeParticleOwner)||owner.diagnostics!==particleDiagnostics||owner.isDisposed)throw new Error('PARTICLE_LEGACY_OWNER_MISMATCH')
 if(entities&&entities!==owner.world.entities)throw new Error('PARTICLE_LEGACY_WORLD_MISMATCH: Use the fixed-World Particle Owner.')
 return owner
}
export class ParticleRuntime{
 update(entities:Entity[],delta:number,playing:boolean):void{requireOwner(entities).update(delta,playing)}
 submit(renderer:Renderer2D,entities:Entity[]):void{requireOwner().submit(renderer,entities)}
 reset():void{requireOwner().reset()}
}
export const particleRuntime=new ParticleRuntime()
export function shiftParticleOrigin(offset:Vec2,entities:Entity[]):void{requireOwner(entities).shiftOrigin(offset)}
