import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { historicalMeasurementFields, absentHistoricalFields } from './historical-measurement-fields.mjs';

const PROJECT='aq8algerie-4f675';
const SHA='9fcf5ae79db5387d0c5b45f665bedc893aec6b106c4ffe120d27ceeb1902d857';
const ROOT=path.resolve('db-audit/out/pdf-measurement-comparison');
const execute=process.argv.includes('--execute');
assert(process.argv.slice(2).every(a=>a==='--execute'),'Unknown argument.');
const source=JSON.parse(await fs.readFile(path.join(ROOT,'pdf-extraction.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
assert.equal(source.sha256,SHA);assert.equal(hash(await fs.readFile(source.source)),SHA);
assert.equal(source.business.length,1233);assert.equal(source.technical.length,1233);
assert.equal(new Set(source.business.map(r=>r.cells[0])).size,1233);
const technical=new Map(source.technical.map(r=>[r.cells[0],r]));
for(const r of source.business){const t=technical.get(r.cells[0]);assert(t);assert.equal(r.cells[1],t.cells[1]);assert.equal(r.cells[4],t.cells[5]);}
const require=createRequire(import.meta.url);
const auth=require(path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/auth.js'));
const account=auth.getAllAccounts().find(a=>a.user.email==='aq8algerie@gmail.com');
assert(account,'Firebase owner is not connected.');
const token=await auth.getAccessToken(account.tokens.refresh_token,[]);
const docRoot=`projects/${PROJECT}/databases/(default)/documents`;
const base='https://firestore.googleapis.com/v1/'+docRoot;
async function api(suffix,body){
 const response=await fetch(base+suffix,{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const result=await response.json();const errors=(Array.isArray(result)?result:[result]).filter(r=>r.error);
 if(!response.ok||errors.length)throw new Error(`Firestore ${suffix}: HTTP ${response.status} ${errors.map(r=>r.error.message).join('; ')}`);
 return result;
}
function decode(v){if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('booleanValue'in v)return v.booleanValue;if('timestampValue'in v)return v.timestampValue;if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)]));return null;}
function encode(v){if(v===null)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(encode)}};return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}};}
const unpack=doc=>({id:doc.name.split('/').at(-1),name:doc.name,updateTime:doc.updateTime,data:Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,decode(v)]))});
async function inventory(collection,fields){const r=await api(':runQuery',{structuredQuery:{from:[{collectionId:collection}],...(fields?{select:{fields:fields.map(fieldPath=>({fieldPath}))}}:{})}});return r.filter(r=>r.document).map(r=>unpack(r.document));}
const before=await inventory('measurements');
const clients=new Map((await inventory('clients',['centerId'])).map(r=>[r.id,r]));
const centers=new Set((await inventory('centers',['name'])).map(r=>r.id));
const current=new Map(before.map(r=>[r.id,r]));
function additions(row,doc,client,centerExists){
 const a=row.cells;
 assert.equal(doc.id,'legacy-measurement-'+a[0]);
 assert.equal(doc.data.clientId,'legacy-client-'+a[1]);
 assert.equal(doc.data.date,a[4].slice(0,10));
 assert.equal(doc.data.weight,Number(a[5]));
 assert(doc.data.centerId&&centerExists,'Existing measurement has no valid center.');
 assert(client&&client.data.centerId===doc.data.centerId,'Existing client/center relationship changed.');
 assert.equal(doc.data.chest,Number(a[8]));assert.equal(doc.data.hips,Number(a[9]));
 return absentHistoricalFields(doc.data,historicalMeasurementFields(row,SHA));
}
const plan=[];const skipped=[];
for(const row of source.business){
 const doc=current.get('legacy-measurement-'+row.cells[0]);
 if(!doc){skipped.push({nid:row.cells[0],reason:'missing_record_no_source_center'});continue;}
 const client=clients.get('legacy-client-'+row.cells[1]);
 try{
  const fields=additions(row,doc,client,centers.has(doc.data.centerId));
  if(Object.keys(fields).length)plan.push({id:doc.id,row,fields});
 }catch(e){skipped.push({nid:row.cells[0],reason:e.message});}
}
const fieldCounts={};for(const p of plan)for(const k of Object.keys(p.fields))fieldCounts[k]=(fieldCounts[k]||0)+1;
const summary={mode:execute?'execute':'dry-run',project:PROJECT,sourceSha256:SHA,preparedAt:new Date().toISOString(),existingMeasurements:before.length,plannedRecords:plan.length,fieldCounts,skipped};
await fs.writeFile(path.join(ROOT,execute?'enrichment-execution-plan.json':'enrichment-dry-run.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({mode:summary.mode,existing:before.length,plannedRecords:plan.length,fieldCounts,skipped:skipped.length}));
if(!execute)process.exit(0);
await fs.writeFile(path.join(ROOT,'enrichment-before.json'),JSON.stringify(before,null,2));
const receipts=[];const expected=new Map();
for(let offset=0;offset<plan.length;offset+=80){
 const batch=plan.slice(offset,offset+80);let transaction;
 try{
  transaction=(await api(':beginTransaction',{options:{readWrite:{}}})).transaction;assert(transaction);
  const paths=[...new Set(batch.flatMap(p=>{const d=current.get(p.id);return[docRoot+'/measurements/'+p.id,docRoot+'/clients/'+d.data.clientId,docRoot+'/centers/'+d.data.centerId];}))];
  const found=await api(':batchGet',{transaction,documents:paths});
  const live=new Map(found.filter(r=>r.found).map(r=>{const d=unpack(r.found);return[d.name,d];}));
  const writes=[];const touched=[];
  for(const p of batch){
   const name=docRoot+'/measurements/'+p.id;const doc=live.get(name);assert(doc,'Existing measurement disappeared.');
   const fields=additions(p.row,doc,live.get(docRoot+'/clients/'+doc.data.clientId),live.has(docRoot+'/centers/'+doc.data.centerId));
   if(!Object.keys(fields).length)continue;
   // Each mask contains absent fields only. Existing values, identifiers and dates are untouched.
   assert(Object.keys(fields).every(k=>!Object.hasOwn(doc.data,k)));
   writes.push({update:{name,fields:encode(fields).mapValue.fields},updateMask:{fieldPaths:Object.keys(fields)},currentDocument:{updateTime:doc.updateTime}});
   expected.set(p.id,{before:doc.data,added:fields});touched.push(p.id);
  }
  if(writes.length){
   const auditId='measurement-enrichment-'+SHA.slice(0,12)+'-'+offset+'-'+Date.now();
   const audit={timestamp:new Date().toISOString(),userId:'firebase-admin-pdf-import',userName:'Complément des mensurations historiques',role:'super_admin',action:'ENRICH_HISTORICAL_MEASUREMENTS',targetType:'measurement',targetId:auditId,sourceSha256:SHA,recordCount:touched.length,measurementIds:touched,details:'Ajout uniquement de champs absents sur des relevés existants. Aucune nouvelle mesure, aucun changement de valeur existante ni de centre.'};
   writes.push({update:{name:docRoot+'/audit_logs/'+auditId,fields:encode(audit).mapValue.fields},currentDocument:{exists:false}});
   const receipt=await api(':commit',{transaction,writes});transaction=null;receipts.push({commitTime:receipt.commitTime,count:touched.length,auditId});
   await fs.writeFile(path.join(ROOT,'enrichment-receipts.json'),JSON.stringify(receipts,null,2));
  }else{await api(':rollback',{transaction});transaction=null;}
  console.log(JSON.stringify({processed:Math.min(offset+80,plan.length),total:plan.length}));
 }catch(e){if(transaction)await api(':rollback',{transaction}).catch(()=>{});throw e;}
}
const after=await inventory('measurements');const afterById=new Map(after.map(r=>[r.id,r]));
const failures=[];
for(const doc of before){const a=afterById.get(doc.id);if(!a){failures.push({id:doc.id,reason:'removed'});continue;}for(const[k,v]of Object.entries(doc.data))if(!same(a.data[k],v))failures.push({id:doc.id,field:k,reason:'existing_value_changed'});}
for(const[id,e]of expected){const a=afterById.get(id);for(const[k,v]of Object.entries(e.added))if(!same(a?.data[k],v))failures.push({id,field:k,reason:'addition_not_verified'});}
assert.equal(after.length,before.length,'No new measurements may be created.');
const report={...summary,completedAt:new Date().toISOString(),enrichedRecords:expected.size,createdRecords:0,removedRecords:0,beforeCount:before.length,afterCount:after.length,preservedExistingValues:failures.length===0,failures,receipts};
await fs.writeFile(path.join(ROOT,'enrichment-result.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({enriched:expected.size,before:before.length,after:after.length,preservedExistingValues:failures.length===0,failures:failures.length}));
assert.equal(failures.length,0,'Verification failed; inspect the local report.');
