import assert from 'node:assert/strict';

// Preserve explicit owner-confirmed assignments when replaying the original PDF migration.
export function hasConfirmedLegacyCenter(payment, archive, source) {
  const resolution = payment.legacyReconciliation?.centerResolution;
  if (!resolution) return false;
  assert.equal(resolution.status, 'confirmed_by_owner');
  assert.equal(source.centerId, null);
  assert.equal(resolution.originalSourceCenterId, null);
  assert.ok(resolution.auditId && resolution.confirmedAt);
  assert.equal(payment.centerId, resolution.centerId);
  assert.equal(archive?.centerId, resolution.centerId);
  assert.deepEqual(archive?.centerResolution, resolution);
  assert.equal(payment.historicalOnly, true);
  assert.equal(archive?.historicalOnly, true);
  assert.equal(payment.clientId, source.clientId);
  assert.equal(archive?.clientId, source.clientId);
  assert.equal(payment.amount, source.amount);
  assert.equal(archive?.amount, source.amount);
  assert.deepEqual(archive?.source, source.source);
  assert.equal(payment.legacyReconciliation.archiveId, source.id);
  assert.ok(!payment.legacyReconciliation.unassignedSourceRecord, 'A resolved archive must not also appear as an unresolved duplicate');
  return true;
}
