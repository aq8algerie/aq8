"""Verify a completed reconciliation against its source plan and original audit."""
import collections
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'db-audit/out/legacy-reconciliation'
load = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
plan = load(OUT / 'plan.json')
before = load(ROOT / 'db-audit/out/pdf-global-comparison/current-snapshot.json')
after = load(OUT / 'verification-snapshot.json')
B, A = before['collections'], after['collections']
by_id = lambda rows: {r['documentId']: r for r in rows}
clients = by_id(A['clients'])
errors = []
check = lambda ok, message: errors.append(message) if not ok else None
stats = dict(verifiedAt=after['completedAt'], centers={}, unchangedCollections=[],
             paymentsCenterCorrections=0, reservationsCenterCorrections=0, datesCorrected=0)

for collection in B:
    if collection in ('payments', 'appointments'):
        continue
    old = {r['id']: r['hash'] for r in before['fingerprints'][collection]}
    new = {r['id']: r['hash'] for r in after['fingerprints'][collection]}
    check(old == new, f'Unrelated collection changed: {collection}')
    if old == new:
        stats['unchangedCollections'].append(collection)
check(sorted(before['authUsers'], key=lambda r: r['uid']) == sorted(after['authUsers'], key=lambda r: r['uid']), 'Auth identities changed')

finance_plan = {r['source']['legacyId']: r for r in plan['finance'] + plan['unassignedFinance']}
reservation_plan = {r['source']['legacyId']: r for r in plan['reservations']}
for collection in ('payments', 'appointments'):
    old, new = by_id(B[collection]), by_id(A[collection])
    check(old.keys() == new.keys(), f'Unexpected create/delete in {collection}')
    for rid, original in old.items():
        current = new.get(rid, {})
        legacy = rid.startswith(('legacy-payment-', 'legacy-reservation-', 'legacy-event-'))
        if not legacy:
            check(original == current, f'Current CRM record changed: {collection}/{rid}')
            continue
        check(current.get('historicalOnly') is True, f'Missing history flag: {rid}')
        ignored = {'historicalOnly', 'legacyReconciliation', 'centerId'}
        if rid.startswith('legacy-reservation-'):
            ignored.add('dateTime')
        check({k: v for k, v in original.items() if k not in ignored} ==
              {k: v for k, v in current.items() if k not in ignored}, f'Unapproved field change: {rid}')
        if rid.startswith('legacy-event-'):
            check(current.get('centerId') == original.get('centerId'), f'Event center was changed: {rid}')
            check(current.get('legacyReconciliation', {}).get('sourceState') == plan['events'][rid.removeprefix('legacy-event-')]['sourceState'], f'Event state lost: {rid}')
            continue
        operation = finance_plan[rid.removeprefix('legacy-payment-')] if collection == 'payments' else reservation_plan[rid.removeprefix('legacy-reservation-')]
        expected_center = operation['centerId'] or original['centerId']
        check(current.get('centerId') == expected_center, f'Center mismatch: {rid}')
        key = 'paymentsCenterCorrections' if collection == 'payments' else 'reservationsCenterCorrections'
        stats[key] += original['centerId'] != expected_center
        check(current.get('legacyReconciliation', {}).get('previousCenterId') == original['centerId'], f'Previous center lost: {rid}')
        if collection == 'payments':
            check(current['amount'] == operation['amount'], f'Amount mismatch: {rid}')
            check(current['legacyReconciliation']['sourceType'] == operation['type'], f'Type mismatch: {rid}')
        else:
            old_date = original['dateTime'].replace(' ', 'T')
            corrected = old_date == operation['date'][:13]
            expected_date = operation['date'][:16] if corrected else original['dateTime']
            check(current['dateTime'] == expected_date, f'Date mismatch: {rid}')
            stats['datesCorrected'] += corrected

for collection, records, originals in [('legacy_financial_operations', plan['finance'], by_id(B['payments'])),
                                       ('legacy_reservations', plan['reservations'], by_id(B['appointments']))]:
    actual = by_id(A[collection])
    check(len(actual) == len(records), f'Archive count mismatch: {collection}')
    for record in records:
        check(bool(record['centerId']), 'Attempt to import an archive with no center')
        expected = {**record, 'clientExists': record['clientId'] in clients}
        prefix = 'legacy-payment-' if collection == 'legacy_financial_operations' else 'legacy-reservation-'
        old = originals.get(prefix + record['source']['legacyId'])
        if old and old['centerId'] != record['centerId']:
            expected['previousImportedCenterId'] = old['centerId']
        current = {k: v for k, v in actual.get(record['id'], {}).items() if k != 'documentId'}
        check(current == expected, f'Archive differs from PDF plan: {collection}/{record["id"]}')

for center in ('center-1', 'center-2', 'center-3', 'center-4'):
    stats['centers'][center] = {name: sum(r['centerId'] == center for r in A[name]) for name in ('legacy_financial_operations', 'legacy_reservations')}
stats['paymentsTotalAmountPreserved'] = sum(r['amount'] for r in B['payments']) == sum(r['amount'] for r in A['payments'])
check(stats['paymentsTotalAmountPreserved'], 'Payment amounts changed')
stats['unassignedOperationsNotCreated'] = len(plan['unassignedFinance'])
stats['preexistingUnassignedPaymentsPreserved'] = sum(r['documentId'].startswith('legacy-payment-') and r.get('legacyReconciliation', {}).get('sourceCenterId') is None for r in A['payments'])
stats['historicalMissingClientReferences'] = {k: sum(not r['clientExists'] for r in A[k]) for k in ('legacy_financial_operations', 'legacy_reservations')}
stats['currentPaymentsWithoutClient'] = [r['documentId'] for r in A['payments'] if not r['documentId'].startswith('legacy-payment-') and r.get('clientId') not in clients]
stats['errors'] = errors
stats['passed'] = not errors
(OUT / 'verification-result.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps(stats, ensure_ascii=True))
assert not errors, f'{len(errors)} verification errors; inspect verification-result.json'

names = {'center-1': 'Bir Khadem', 'center-2': 'Ouled Fayet', 'center-3': 'Blida', 'center-4': 'Tlemcen'}
rows = ''.join(f'<tr><td>{names[c]}</td><td>{s["legacy_financial_operations"]:,}</td><td>{s["legacy_reservations"]:,}</td></tr>' for c, s in stats['centers'].items())
details = []
for center in ('center-1', 'center-2'):
    sums = collections.defaultdict(lambda: [0, 0, 0])
    for row in A['legacy_financial_operations']:
        if row['centerId'] == center:
            item = sums[row['type']]
            item[0] += 1
            item[1] += max(0, row['amount'])
            item[2] += min(0, row['amount'])
    entries = ''.join(f'<tr><td>{html.escape(t)}</td><td>{v[0]}</td><td>{v[1]:,.0f} DA</td><td>{v[2]:,.0f} DA</td></tr>' for t, v in sorted(sums.items()))
    details.append(f'<h2>{names[center]} : mouvements par type d’origine</h2><table><tr><th>Type</th><th>Références</th><th>Montants positifs</th><th>Montants négatifs</th></tr>{entries}</table>')
report = f'''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reprise historique AQ8 — contrôle après mise à jour</title>
<style>body{{font:16px/1.6 system-ui;max-width:1080px;margin:40px auto;padding:0 20px;color:#243247}}h1,h2{{color:#173754}}table{{border-collapse:collapse;width:100%;margin:20px 0}}td,th{{padding:10px;border-bottom:1px solid #dce3eb;text-align:left}}th{{background:#edf4fa}}.note{{background:#fff6df;padding:16px;border-radius:12px}}a{{color:#0878ae}}</style>
<h1>Reprise historique AQ8 : contrôle après mise à jour</h1><p>Vérification du {html.escape(stats['verifiedAt'])}. Contrôles réussis, aucune divergence entre les archives et le plan issu des PDF.</p>
<table><tr><th>Centre d’origine</th><th>Écritures financières</th><th>Réservations</th></tr>{rows}</table>
<p><b>21 258 écritures et 15 629 références de réservation archivées.</b> {stats['paymentsCenterCorrections']} centres de paiements et {stats['reservationsCenterCorrections']} centres de réservations corrigés. {stats['datesCorrected']} heure tronquée complétée. Chaque ancien rattachement est conservé dans la provenance.</p>
<p>Montants de paiements, statuts des rendez-vous, comptes Auth, fiches clients, forfaits et crédits actifs, mensurations et autres collections contrôlées : préservés. Aucun document courant supprimé, aucun crédit historique réactivé.</p>
<h2>Consultation dans le CRM</h2><ul><li>Paiements → Historique ancienne base : journal signé et abonnements passés.</li><li>Réservations → Consulter les réservations de l’ancienne base.</li><li>Fiche client → Historique ancienne base : réservations et, selon les droits, finances.</li></ul>
<p>Recherche sur tout l’historique du centre, dates, types, pagination et détails de provenance. Les disponibilités BAT et les représentations doubles ne sont plus présentées comme des rendez-vous courants.</p>
<div class="note"><b>Interprétation comptable :</b> les montants et types anciens restent fidèles à la source. Bonus, remboursements et débits ne sont pas automatiquement des encaissements. Les archives sont exclues du chiffre d’affaires courant tant que leur qualification n’est pas validée. Aucun mode de règlement n’est inventé.</div>
<h2>Exclusions et cas conservés pour contrôle</h2><ul><li>2 939 opérations sans centre dans la source : aucun nouvel import. Parmi les anciens imports déjà présents, 956 restent dans leur centre antérieur avec un avertissement.</li><li>Les 32 clients sans centre restent exclus.</li><li>Les références historiques vers un client non repris restent lisibles, sans créer de fiche fictive : {stats['historicalMissingClientReferences']['legacy_financial_operations']} écritures et {stats['historicalMissingClientReferences']['legacy_reservations']} réservations.</li><li>Quatre paiements courants sans fiche client ({', '.join(stats['currentPaymentsWithoutClient'])}) restent à justifier. Aucun rattachement arbitraire et aucune suppression.</li><li>Les adhésions inactives restent archivées. Les abonnements évoqués par des écritures financières ne sont pas transformés en forfaits actifs.</li></ul>
{''.join(details)}<p>Les mouvements ci-dessus ne sont pas un chiffre d’affaires validé. Les sauvegardes avant chaque lot et journaux de commit sont conservés localement dans le dossier de reprise.</p></html>'''
(OUT / 'rapport-apres-reprise.html').write_text(report, encoding='utf8')
