import {mediaUuid} from '../lib/mediaAudit16.mjs'
/** Typed and coupled alternatives for the populated media fixture, not production renaming APIs. */
export function mediaStructuredCandidate22(type,path,original,fixture){
 const key=type+'.'+path.map(k=>typeof k==='number'?'*':k).join('.'),ref=n=>'asset://'+mediaUuid(n)
 const values={
 'animation.spriteFrames.*.spriteAsset':null,'animation.tracks.*.targetEntityUuid':null,'animation.commandTracks.*.targetEntityUuid':original===null?mediaUuid(100):null,
 'controller.defaultState':'walk','controller.parameters.*.name':'enabled_edited','controller.states.*.clipAsset':ref(7),'controller.states.*.speedParameter':'count','controller.states.*.blendTree.parameter':'count','controller.states.*.blendTree.parameterY':'speed','controller.states.*.blendTree.children.*.clipAsset':ref(7),'controller.states.*.blendTree':structuredClone(fixture.controller.states[0].blendTree),'controller.transitions.*.from':'end','controller.transitions.*.to':'end','controller.transitions.*.conditions.*.parameter':'count','controller.layers.*.defaultState':'walk','controller.layers.*.maskAsset':ref(3),
 'rig.ikChains.*.endBoneId':'arm','rig.constraints.*.boneId':'root','rig.constraints.*.targetBoneId':'root','rig.attachments.*.boneId':'arm','rig.retargetAliases.hips':'tip','rig.retargetAliases.upper':'root','rig.retargetAliases.hand':'arm',
 'skin.rigAsset':ref(8),'skin.vertices.*.weights.*.boneId':'tip','timeline.markers.*.color':'#13579b','timeline.skipMarker':'resume','timeline.resumeMarker':'skip','timeline.tracks.*.clips.*.asset':ref(1),'timeline.tracks.*.clips.*.targetEntityUuid':original===null?mediaUuid(100):null
 }
 if(key==='controller.transitions.*.conditions.*.parameter')return{value:'count',prepare:d=>{d.transitions[0].conditions[0].value=1},scope:'Parameter rebinding with an integer-compatible condition threshold'}
 if(Object.hasOwn(values,key))return{value:values[key],prepare:key.startsWith('rig.retargetAliases.')?d=>{d.retargetAliases[original]=original}:undefined,scope:'Typed existing-resource/reference alternative through the lossless document owner'}
 if(key==='animationMask.properties.*')return{value:'Transform.position.y',prepare:d=>{d.properties.splice(1,1)},scope:'Mask membership edit removes the previous property while preserving unique property entries'}
 if(key==='controller.layers.*.synchronizedLayer')return{value:'upper',prepare:d=>{d.layers[1].synchronizedLayer=null},scope:'Coupled layer synchronization edit preserving an acyclic layer graph'}
 if(key==='rig.bones.*.parentId')return{value:'new-root',prepare:d=>{d.bones.unshift({...structuredClone(d.bones[0]),id:'new-root',name:'New root',parentId:null});d.retargetAliases.new_root='new-root'},path:['bones',1,'parentId'],scope:'Parent rebinding after creating a separate valid root bone'}
 if(key==='skin.vertices.*.weights.*.weight')return{value:.5,prepare:d=>{d.vertices[0].weights[1].weight=.5},scope:'Coupled normalized two-bone weight edit'}
 if(key==='timeline.markers.*.name')return{value:'ResumeEdited',prepare:d=>{d.resumeMarker='ResumeEdited'},scope:'Marker-name edit with the matching resume reference'}
 return null
}
