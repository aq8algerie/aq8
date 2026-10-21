export type LegacyHistoryKind = 'finance' | 'reservations';

export interface LegacyHistoryRecord {
  id: string;
  centerId: string;
  clientId: string;
  clientName: string;
  clientExists: boolean;
  date: string;
  type: string;
  amount?: number;
  comment: string;
  service?: string;
  resource?: string;
  planningState?: string;
  end?: string;
  eventId?: string;
  cancelled?: boolean;
  refunded?: boolean;
  sourceState?: string;
  relatedReservationIds?: string[];
  originalCenterMissing?: boolean;
  previousImportedCenterId?: string;
  source: { file: string; sha256: string; page: number; technicalPage: number; legacyId: string };
}

// Legacy balances and availability rows are evidence, not new receipts or live bookings.
export function isHistoricalRecord(record: { id?: string; documentId?: string; historicalOnly?: boolean }): boolean {
  return record.historicalOnly === true || /^legacy-(payment|reservation|event)-/.test(record.id || record.documentId || '');
}

export function filterLegacyHistory(rows: LegacyHistoryRecord[], input: {
  clientId?: string; search?: string; from?: string; to?: string; type?: string;
}) {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const search = normalize(input.search || '').trim();
  return rows.filter(row =>
    (!input.clientId || row.clientId === input.clientId) &&
    (!input.from || row.date.slice(0, 10) >= input.from) &&
    (!input.to || row.date.slice(0, 10) <= input.to) &&
    (!input.type || row.type === input.type) &&
    (!search || normalize([row.clientName, row.clientId, row.id, row.source.legacyId, row.type, row.comment, row.service, row.eventId].join(' ')).includes(search)),
  ).sort((a, b) => b.date.localeCompare(a.date) || Number(b.source.legacyId) - Number(a.source.legacyId));
}

export function summarizeLegacyHistory(rows: LegacyHistoryRecord[]) {
  const types: Record<string, { count: number; positive: number; negative: number }> = {};
  for (const row of rows) {
    const item = types[row.type] ||= { count: 0, positive: 0, negative: 0 };
    item.count++;
    if (Number.isFinite(row.amount)) {
      if (row.amount! > 0) item.positive += row.amount!;
      if (row.amount! < 0) item.negative += row.amount!;
    }
  }
  return { count: rows.length, types, missingClients: rows.filter(r => !r.clientExists).length,
    originalCenterMissing: rows.filter(r => r.originalCenterMissing).length };
}
