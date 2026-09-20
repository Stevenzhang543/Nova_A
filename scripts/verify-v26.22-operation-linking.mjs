import assert from 'node:assert/strict'
import ts from 'typescript'
import {constructorFactoryReference22} from './lib/constructorFactoryEvidence22.mjs'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
const audit=await propertyAudit22('operation-linking'),checks=[],scope=new Map([['World',{source:'src/world/World.ts',path:'World'}]])
const resolve=(node,bindings)=>ts.isIdentifier(node)?bindings.get(node.text):null
function infer(text){const file=ts.createSourceFile('fixture.js','const factory='+text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);return constructorFactoryReference22(file.statements[0].declarationList.declarations[0].initializer,scope,resolve)}
function test(name,fn){fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
test('Resolve direct constructors and initialized constant instances',()=>{for(const source of ['()=>new World()','entities=>{const world=new World();world.entities=entities;world.setNextId(10);return world}','function(){const world=new World();Object.defineProperty(world,"flag",{value:true});return world}'])assert.deepEqual(infer(source),scope.get('World'))})
test('Reject parameter and local aliases that hide the constructor',()=>{for(const source of ['World=>new World()','({World})=>new World()','()=>{const World=other;const world=new World();return world}'])assert.equal(infer(source),null)})
test('Reject branches, reassignment and computed or mutable returns',()=>{for(const source of ['()=>{const world=new World();if(flag)return other;return world}','()=>{let world=new World();return world}','()=>{const world=new World();world=other;return world}','()=>{const world=new World();return flag?world:other}','()=>{const world=new World();return wrap(world)}','()=>{const world=new World();while(flag){}return world}'])assert.equal(infer(source),null)})
test('Unknown constructors and missing return values receive no evidence',()=>{for(const source of ['async()=>new World()','function*(){const world=new World();return world}','()=>new Unknown()','()=>{const world=new Unknown();return world}','()=>{const world=new World();}','()=>({world:new World()})'])assert.equal(infer(source),null)})
await audit.write(checks,'Conservative static audit-link inference only. Checks prevent ambiguous test factories from being presented as executed source-operation evidence; no production behavior is changed.')
