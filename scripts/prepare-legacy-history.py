"""Build immutable historical records from the independently validated PDF extracts.

No network access and no database writes. Output stays in ignored db-audit/out.
"""
import collections
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'db-audit/out/pdf-global-comparison'
OUT = ROOT / 'db-audit/out/legacy-reconciliation'
OUT.mkdir(parents=True, exist_ok=True)
load = lambda p: json.loads(p.read_text(encoding='utf8'))
def iso(value):
    compact = re.sub(r'\s+', '', value)
    result = re.sub(r'^(\d{4}-\d{2}-\d{2})(\d{2}:\d{2})', r'\1T\2', compact)
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?', result), f'Invalid source date: {value!r}'
    return result
audit = load(AUDIT / 'analysis.json')
sources = {s['name'][:2]: s for s in audit['sources']}
for number in ('02', '03', '05'):
    source = sources[number]
    assert hashlib.sha256(Path(source['path']).read_bytes()).hexdigest() == source['sha256'], 'Source changed'

def view(number, columns):
    data = load(AUDIT / f'{number}-extraction.json')
    rows = {r[0]: {'page': p['page'], 'cells': r} for p in data['pages'] if p['columnCount'] == columns
            for r in p['rows'][1:] if r and r[0].isdigit()}
    return rows

def source(number, record, technical):
    item = sources[number]
    return dict(file=item['name'], sha256=item['sha256'], page=record['page'],
                technicalPage=technical['page'], legacyId=record['cells'][0])

business = view('03', 10)
technical = view('03', 9)
finance, unassigned = [], []
for op in audit['details']['operations']:
    b, t = business[op['nid']], technical[op['nid']]
    cells = b['cells']
    record = dict(id='legacy-operation-' + op['nid'], centerId=op['sourceCenterId'],
        clientId=op['sourceClientId'], clientName=cells[2], date=op['date'], type=op['type'],
        amount=float(op['amount']), comment=cells[9], sourceStatus=cells[8], method='unknown',
        historicalOnly=True, source=source('03', b, t),
        sourceBusiness=cells, sourceTechnical=t['cells'])
    (finance if record['centerId'] else unassigned).append(record)

business = view('02', 14)
technical = view('02', 19)
event_business = view('05', 10)
event_technical = view('05', 8)
groups = collections.defaultdict(list)
for r in audit['details']['reservations']:
    if r['eventId']:
        groups[r['eventId']].append(r['nid'])
reservations = []
for r in audit['details']['reservations']:
    assert r['sourceCenterId'], 'Do not import a reservation without a center'
    b, t = business[r['nid']], technical[r['nid']]
    cells = b['cells']
    event = event_business.get(r['eventId'])
    record = dict(id='legacy-reservation-' + r['nid'], centerId=r['sourceCenterId'],
        clientId=r['sourceClientId'], clientName=cells[1], date=iso(cells[8]), end=iso(cells[9]),
        type='Annulée' if r['expectedStatus'] == 'cancelled' else 'Réservée (historique)',
        service=cells[6], resource=cells[7], sourceState=cells[10],
        cancelled=cells[11] == '1', refunded=cells[12] == '1', comment=cells[13],
        eventId=r['eventId'], relatedReservationIds=groups.get(r['eventId'], []),
        historicalOnly=True, source=source('02', b, t), sourceBusiness=cells, sourceTechnical=t['cells'])
    if event:
        record['planningSource'] = source('05', event, event_technical[r['eventId']])
        record['planningState'] = event['cells'][3]
    reservations.append(record)

events = {r['eid']: dict(sourceState=r['sourceState'], source=source('05', event_business[r['eid']], event_technical[r['eid']]),
    relatedReservationIds=groups.get(r['eid'], []), sourceBusiness=event_business[r['eid']]['cells'],
    sourceTechnical=event_technical[r['eid']]['cells']) for r in audit['details']['events']}
plan = dict(version='pdf-history-v1', sources=[sources[n] for n in ('02', '03', '05')],
    finance=finance, reservations=reservations, unassignedFinance=unassigned, events=events)
(OUT / 'plan.json').write_text(json.dumps(plan, ensure_ascii=False), encoding='utf8')
summary = dict(finance=len(finance), reservations=len(reservations), excludedFinanceWithoutCenter=len(unassigned),
    financeByCenter=dict(collections.Counter(r['centerId'] for r in finance)),
    reservationsByCenter=dict(collections.Counter(r['centerId'] for r in reservations)))
(OUT / 'plan-summary.json').write_text(json.dumps(summary, indent=2), encoding='utf8')
print(json.dumps(summary))
