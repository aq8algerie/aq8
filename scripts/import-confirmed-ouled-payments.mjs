/** The owner's explicit 2026-10-26 assignment of 16 previously centerless PDF payments.
 * Default: dry-run. --execute performs one create-only, backed-up atomic transaction.
 * Signed source amounts, dates, clients and receipts are preserved. No current revenue or credits.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { hasConfirmedLegacyCenter } from './confirmed-legacy-center.mjs';
const execute = process.argv.includes('--execute');
assert(process.argv.slice(2).every(a => a === '--execute'));
const ids = ['232','254','292','310','371','373','408','410','785','3310','3313','3650','3903','4516','4663','4872'];
const centerId = 'center-2';
const project = 'aq8algerie-4f675';
const root = `projects/${project}/databases/(default)/documents`;
const out = path.resolve('db-audit/out/confirmed-ouled-payments-2026-10-26');
await fs.mkdir(out, {recursive:true});
const sha = value => createHash('sha256').update(value).digest('hex');
const load = async p => JSON.parse(await fs.readFile(p,'utf8'));
const plan = await load('db-audit/out/legacy-reconciliation/plan.json');
const sourcePdf = plan.sources.find(s => s.name.startsWith('03_'));
assert.equal(sha(await fs.readFile(sourcePdf.path)),sourcePdf.sha256);
const pdf04 = await load('db-audit/out/pdf-payment-comparison/pdf-extraction.json');
assert.equal(sha(await fs.readFile(pdf04.source)),pdf04.sha256);
const compact = value => String(value || '').replace(/\s+/g,'');
const technical = new Map(pdf04.technical.map(r=>[compact(r.cells[0]),r]));
const business = new Map(pdf04.business.map(r=>[compact(r.cells[0]),r]));
const sources = ids.map(id => {
  const source = plan.unassignedFinance.find(r=>r.source.legacyId===id);
  assert(source && source.centerId===null && source.type==='Paiement');
  assert.equal(source.clientId, 'legacy-client-'+(ids.indexOf(id)<9 ? '46' : '240'));
  const b=business.get(id), t=technical.get(id); assert(b && t);
  assert.equal('legacy-client-'+compact(t.cells[4]),source.clientId);
  assert.equal(compact(t.cells[6]),'');
  assert.equal(Number(compact(b.cells[6])),source.amount);
  assert.equal(compact(b.cells[1]),source.date);
  return source;
});
assert.equal(sources.length,16);assert.equal(sources.reduce((s,r)=>s+r.amount,0),-42000);
const auditId='owner-confirmed-ouled-payments-'+sha(sourcePdf.sha256+ids.join(',')+centerId).slice(0,20);
const canonical = v => Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same = (a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const require=createRequire(import.meta.url);
const auth=require(path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/auth.js'));
const owner=auth.getAllAccounts().find(a=>a.user.email==='aq8algerie@gmail.com');assert(owner);
const token=await auth.getAccessToken(owner.tokens.refresh_token,[]);
const api=async(resource,body)=>{
 const r=await fetch('https://firestore.googleapis.com/v1/'+resource,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
 const data=await r.json();if(!r.ok || data.error || (Array.isArray(data)&&data.some(x=>x.error)))throw new Error('Firestore request failed: '+r.status);
 return data;
};
const dbInfo=await api(`projects/${project}/databases/(default)`);assert.equal(dbInfo.databaseEdition,'STANDARD');
const decode=v=>'stringValue'in v?v.stringValue:'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'booleanValue'in v?v.booleanValue:'timestampValue'in v?v.timestampValue:'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):'arrayValue'in v?(v.arrayValue.values||[]).map(decode):null;
const encode=v=>v===null?{nullValue:null}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{doubleValue:v}:{stringValue:v};
const fields=v=>encode(v).mapValue.fields;
const paths=[...sources.flatMap(r=>[`${root}/payments/legacy-payment-${r.source.legacyId}`,`${root}/legacy_financial_operations/${r.id}`]),`${root}/clients/legacy-client-46`,`${root}/clients/legacy-client-240`,`${root}/centers/${centerId}`,`${root}/audit_logs/${auditId}`];
let transaction;
try {
 if(execute)transaction=(await api(root+':beginTransaction',{options:{readWrite:{}}})).transaction;
 const before=await api(root+':batchGet',{documents:paths,...(transaction?{transaction}:{})});
 const raw=new Map(before.filter(r=>r.found).map(r=>[r.found.name,r.found]));
 const data=name=>raw.has(name)?Object.fromEntries(Object.entries(raw.get(name).fields||{}).map(([k,v])=>[k,decode(v)])):null;
 assert(data(`${root}/centers/${centerId}`));
 for(const client of ['46','240'])assert(data(`${root}/clients/legacy-client-${client}`),'Referenced client must exist');
 const writes=[], createdIds=[];
 for(const source of sources){
  const payId='legacy-payment-'+source.source.legacyId;
  const oldPay=data(`${root}/payments/${payId}`),oldArchive=data(`${root}/legacy_financial_operations/${source.id}`);
  if(oldPay || oldArchive){assert(oldPay && oldArchive,'Partial existing pair refused');assert(hasConfirmedLegacyCenter(oldPay,oldArchive,source));assert.equal(oldPay.centerId,centerId);assert.equal(oldArchive.centerResolution.auditId,auditId);continue;}
  const resolution={status:'confirmed_by_owner',originalSourceCenterId:null,centerId,confirmedAt:new Date().toISOString(),auditId,
    basis:'Instruction explicite du propriétaire dans le chat le 26/10/2026 : les 16 paiements listés pour les UID 46 et 240 appartiennent à Ouled Fayet.'};
  const archive={...source,centerId,clientExists:true,centerResolution:resolution};
  const pay={id:payId,clientId:source.clientId,centerId,packageId:'pkg-legacy-payment',amount:source.amount,date:source.date.slice(0,10),
    createdAt:source.date,method:'unknown',receiptNumber:'LEG-'+source.source.legacyId,historicalOnly:true,importedFrom:'legacy-pdf-owner-confirmed',
    legacyReconciliation:{version:plan.version,archiveId:source.id,source:source.source,sourceType:source.type,sourceCenterId:null,
      resolvedCenterId:centerId,revenueTreatment:'excluded_pending_historical_qualification',centerResolution:resolution}};
  assert(hasConfirmedLegacyCenter(pay,archive,source));
  for(const [collection,id,record] of [['payments',payId,pay],['legacy_financial_operations',source.id,archive]])writes.push({update:{name:`${root}/${collection}/${id}`,fields:fields(record)},currentDocument:{exists:false}});
  createdIds.push(source.source.legacyId);
 }
 const audit=data(`${root}/audit_logs/${auditId}`);
 if(writes.length){assert.equal(createdIds.length,16,'Only an all-or-nothing first import is permitted');assert(!audit);
  writes.push({update:{name:`${root}/audit_logs/${auditId}`,fields:fields({timestamp:new Date().toISOString(),userId:'firebase-admin-owner-confirmation',userName:'Confirmation propriétaire AQ8',role:'super_admin',action:'IMPORT_OWNER_CONFIRMED_HISTORICAL_PAYMENTS',targetType:'center',targetId:centerId,
    sourceSha256:sourcePdf.sha256,paymentIds:ids,details:'16 paiements historiques : centre Ouled Fayet confirmé par le propriétaire. Montants signés conservés (-42000 DA). Aucun crédit ou chiffre d’affaires actuel modifié.'})},currentDocument:{exists:false}});
 }else assert(audit,'Existing assignment must have its audit record');
 const report={project,edition:dbInfo.databaseEdition,mode:execute?'execute':'dry-run',auditId,centerId,newPaymentCount:createdIds.length,newArchiveCount:createdIds.length,totalSignedAmount:-42000,
   byClient:[{clientId:'legacy-client-46',count:9,amount:-18000},{clientId:'legacy-client-240',count:7,amount:-24000}],writes:writes.length,sourceSha256:sourcePdf.sha256};
 await fs.writeFile(path.join(out,execute?'execution-plan.json':'dry-run.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(!execute)process.exit(0);
 if(!writes.length){await api(root+':rollback',{transaction});transaction=null;console.log('Idempotent: zero writes');process.exit(0);}
 const backup=path.join(out,'backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
 await fs.writeFile(backup,JSON.stringify({report,before,writes},null,2));
 const receipt=await api(root+':commit',{transaction,writes});transaction=null;assert.equal(receipt.writeResults.length,33);
 const after=await api(root+':batchGet',{documents:paths});
 const afterRaw=new Map(after.filter(r=>r.found).map(r=>[r.found.name,r.found]));
 for(const write of writes)assert(same(afterRaw.get(write.update.name)?.fields,write.update.fields),'Post-write verification failed');
 for(const [name,doc]of raw)assert(same(doc.fields,afterRaw.get(name)?.fields),'Pre-existing document changed');
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({...report,commitTime:receipt.commitTime,verified:true,preexistingDocumentsUnchanged:true,backup},null,2));
 console.log(JSON.stringify({verified:true,createdPayments:16,createdArchives:16,auditId,preexistingDocumentsUnchanged:true,backup}));
}finally{if(transaction)await api(root+':rollback',{transaction});}
