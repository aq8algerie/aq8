/** Owner-confirmed, reversible consolidation of legacy-client-746 into legacy-client-747.
 * Default: dry-run. Requires an empty source history; no reference/financial/auth mutation.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const execute=process.argv.includes('--execute');assert(process.argv.slice(2).every(a=>a==='--execute'));
const project='aq8algerie-4f675',sourceId='legacy-client-746',targetId='legacy-client-747',centerId='center-2';
const root=`projects/${project}/databases/(default)/documents`;
const out=path.resolve('db-audit/out/client-merge-746-747');await fs.mkdir(out,{recursive:true});
const prior=JSON.parse(await fs.readFile(path.join(out,'before.json'),'utf8'));assert.equal(prior.project,project);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const auditId='confirmed-client-merge-746-into-747';
const require=createRequire(import.meta.url);
const auth=require(path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/auth.js'));
const owner=auth.getAllAccounts().find(a=>a.user.email==='aq8algerie@gmail.com');assert(owner);
const token=await auth.getAccessToken(owner.tokens.refresh_token,[]);
const api=async(resource,body)=>{const r=await fetch('https://firestore.googleapis.com/v1/'+resource,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});const d=await r.json();if(!r.ok||d.error||(Array.isArray(d)&&d.some(x=>x.error)))throw new Error('Firestore '+r.status);return d;};
const decode=v=>'stringValue'in v?v.stringValue:'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'booleanValue'in v?v.booleanValue:'timestampValue'in v?v.timestampValue:'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):'arrayValue'in v?(v.arrayValue.values||[]).map(decode):null;
const encode=v=>v===null?{nullValue:null}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{doubleValue:v}:{stringValue:v};
const fields=v=>encode(v).mapValue.fields;
assert.equal((await api(`projects/${project}/databases/(default)`)).databaseEdition,'STANDARD');
let transaction;
try{
 if(execute)transaction=(await api(root+':beginTransaction',{options:{readWrite:{}}})).transaction;
 const documents=[sourceId,targetId].map(id=>`${root}/clients/${id}`).concat(`${root}/audit_logs/${auditId}`);
 const before=await api(root+':batchGet',{documents,...(transaction?{transaction}:{})});
 const raw=new Map(before.filter(r=>r.found).map(r=>[r.found.name,r.found]));
 const read=id=>{const d=raw.get(`${root}/clients/${id}`);assert(d,'Client missing');return Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,decode(v)]));};
 const source=read(sourceId),target=read(targetId);
 assert.equal(source.centerId,centerId);assert.equal(target.centerId,centerId);
 if(source.mergedIntoClientId===targetId){
  assert.equal(source.status,'archived');assert.equal(source.mergeAuditId,auditId);assert(target.mergedClientIds?.includes(sourceId));assert(target.mergedProfiles?.[sourceId]);assert(raw.has(`${root}/audit_logs/${auditId}`));
  assert(target.alternatePhones?.includes(source.phone),'Merged source phone must remain preserved');
  assert(target.alternateEmails?.includes(source.email.toLowerCase()),'Merged source email must remain preserved');
  assert.equal(target.mergedProfiles[sourceId].auditId,auditId);
  if(transaction){await api(root+':rollback',{transaction});transaction=null;}
  console.log(JSON.stringify({idempotent:true,writes:0,sourceId,targetId}));process.exit(0);
 }
 assert.notEqual(source.status,'archived');assert(!target.status || target.status==='active');assert(!source.mergedIntoClientId);assert(!target.mergedIntoClientId);
 for(const id of [sourceId,targetId]){const expected=prior.clients.find(c=>c.id===id);assert(expected);assert(same(raw.get(`${root}/clients/${id}`).fields,expected.raw.fields),'Profile changed since preparation');}
 assert(!raw.has(`${root}/audit_logs/${auditId}`));
 const sourceChildren=await api(`${root}/clients/${sourceId}:listCollectionIds`,{pageSize:1});
 assert(!(sourceChildren.collectionIds||[]).length && !sourceChildren.nextPageToken,'Source subcollections require a reviewed transfer');
 const checked=[];let pageToken;const collections=[];
 do{const r=await api(root+':listCollectionIds',{pageSize:100,...(pageToken?{pageToken}:{})});collections.push(...r.collectionIds);pageToken=r.nextPageToken;}while(pageToken);
 for(const c of collections.filter(c=>c!=='clients')){
  const r=await api(root+':runQuery',{structuredQuery:{from:[{collectionId:c}],where:{fieldFilter:{field:{fieldPath:'clientId'},op:'EQUAL',value:{stringValue:sourceId}}},limit:1},...(transaction?{transaction}:{})});
  assert(!r.some(x=>x.document),'A new source reference exists in '+c+'; prepare a reviewed transfer instead');checked.push(c);
 }
 // Refuse to change an established member login as part of this data-only merge.
 const app=initializeApp({projectId:project,credential:{getAccessToken:async()=>({access_token:token.access_token,expires_in:3600})}},'merge-verify');
 const accounts=await getAuth(app).getUsers([{email:source.email},{email:target.email}]);assert.equal(accounts.users.length,0,'Member login exists; review routing before merging');
 const now=new Date().toISOString();
 const unique=values=>[...new Set(values.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];
 const alternatePhones=unique([...(target.alternatePhones||[]),...(source.alternatePhones||[]),source.phone]).filter(v=>v!==target.phone);
 const alternateEmails=unique([...(target.alternateEmails||[]),...(source.alternateEmails||[]),source.email].map(v=>typeof v==='string'?v.toLowerCase():v)).filter(v=>v!==target.email?.toLowerCase());
 const evidence={sourceClientId:sourceId,sourceCreatedAt:source.createdAt||null,phone:source.phone||'',email:source.email||'',originalNotes:source.notes||'',sourceFingerprint:hash(source),mergedAt:now,auditId,confirmation:'Same person explicitly confirmed by the owner in this chat on 2026-10-26'};
 const targetPatch={mergedClientIds:unique([...(target.mergedClientIds||[]),sourceId]),alternatePhones,alternateEmails,
  mergedProfiles:{...(target.mergedProfiles||{}),[sourceId]:evidence},updatedAt:now,
  notes:[target.notes,`Ancienne fiche fusionnée (référence ${sourceId}, 26/10/2026). Téléphone secondaire : ${source.phone || 'non renseigné'}. E-mail secondaire : ${source.email || 'non renseigné'}.`].filter(Boolean).join('\n\n')};
 const sourcePatch={status:'archived',archivedAt:now,archivedByUserId:'owner-confirmed-client-merge',archivedByUserName:'Fusion confirmée par le propriétaire',mergedIntoClientId:targetId,mergeAuditId:auditId,updatedAt:now};
 const writes=[[sourceId,sourcePatch],[targetId,targetPatch]].map(([id,patch])=>({update:{name:`${root}/clients/${id}`,fields:fields(patch)},updateMask:{fieldPaths:Object.keys(patch)},currentDocument:{updateTime:raw.get(`${root}/clients/${id}`).updateTime}}));
 writes.push({update:{name:`${root}/audit_logs/${auditId}`,fields:fields({timestamp:now,userId:'firebase-admin-owner-confirmation',userName:'Fusion confirmée par le propriétaire AQ8',role:'super_admin',action:'MERGE_CLIENT_PROFILES',targetType:'client',targetId,sourceClientId:sourceId,centerId,
  details:'Même personne confirmée dans le chat. Fiche source sans référence métier archivée avec redirection ; coordonnées conservées sur la fiche historique. Aucun paiement, réservation, mesure, forfait, solde ou compte Auth modifié.'})},currentDocument:{exists:false}});
 const report={project,mode:execute?'execute':'dry-run',sourceId,targetId,centerId,sourceReferenceCount:0,collectionsChecked:checked,authAccountsChanged:0,sourceArchived:true,primaryContactsPreserved:true,secondaryContactsPreserved:true,writes:3,auditId};
 await fs.writeFile(path.join(out,execute?'execution-plan.json':'dry-run.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(!execute)process.exit(0);
 const backup=path.join(out,'backup-'+now.replace(/[:.]/g,'-')+'.json');await fs.writeFile(backup,JSON.stringify({report,before,writes},null,2));
 const receipt=await api(root+':commit',{transaction,writes});transaction=null;assert.equal(receipt.writeResults.length,3);
 const after=await api(root+':batchGet',{documents});const afterRaw=new Map(after.filter(r=>r.found).map(r=>[r.found.name,r.found]));
 for(const [id,patch]of [[sourceId,sourcePatch],[targetId,targetPatch]]){
  const expected={...raw.get(`${root}/clients/${id}`).fields,...fields(patch)};
  assert(same(afterRaw.get(`${root}/clients/${id}`)?.fields,expected),'Unexpected profile change');
 }
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({...report,verified:true,commitTime:receipt.commitTime,backup,historyRecordsModified:0},null,2));
 console.log(JSON.stringify({verified:true,sourceArchived:true,targetId,historyRecordsModified:0,backup}));
}finally{if(transaction)await api(root+':rollback',{transaction});}
