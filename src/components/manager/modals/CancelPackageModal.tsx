/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Ban, X, DollarSign, FileText } from 'lucide-react';
import { Client, ClientPackage, Package, Payment } from '../../../types';

interface CancelPackageModalProps {
  clientPackage: ClientPackage;
  client?: Client;
  packageDefinition?: Package;
  payment?: Payment;
  onClose: () => void;
  onConfirmCancel: (input: {
    clientPackageId: string;
    reason: string;
    notes: string;
    reversePayment: boolean;
  }) => Promise<void>;
}

const CANCELLATION_REASONS = [
  { key: 'error', label: 'Attribué par erreur', desc: 'Le forfait a été créé sur le mauvais adhérent ou doublon.' },
  { key: 'refund_request', label: 'Demande de remboursement', desc: 'L\'adhérent demande un remboursement total ou partiel.' },
  { key: 'illness', label: 'Maladie / Raison médicale', desc: 'Certificat médical ou incapacité physique à poursuivre.' },
  { key: 'other', label: 'Autre raison', desc: 'Insatisfaction, déménagement ou décision managériale.' },
];

export function CancelPackageModal({
  clientPackage,
  client,
  packageDefinition,
  payment,
  onClose,
  onConfirmCancel,
}: CancelPackageModalProps) {
  const [reasonKey, setReasonKey] = useState('error');
  const [notes, setNotes] = useState('');
  const [reversePayment, setReversePayment] = useState(Boolean(payment && payment.status !== 'reversed'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const clientName = client ? `${client.firstName} ${client.lastName}` : 'Adhérent';
  const packageName = packageDefinition?.name || 'Forfait';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const selectedReasonLabel = CANCELLATION_REASONS.find(r => r.key === reasonKey)?.label || 'Annulation';

    try {
      await onConfirmCancel({
        clientPackageId: clientPackage.id,
        reason: selectedReasonLabel,
        notes: notes.trim(),
        reversePayment,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’annulation du forfait.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Ban className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-black text-base">Annuler un Forfait Adhérent</h3>
              <p className="text-[11px] text-rose-100 font-medium">Révoquer le forfait et désactiver ses séances restantes.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-rose-100 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs">
              {error}
            </div>
          )}

          {/* Package Info Pill */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <div className="flex justify-between font-bold text-slate-800">
              <span>{packageName}</span>
              <span className="font-mono text-[#0284c7]">{clientPackage.sessionsRemaining} / {clientPackage.totalSessions} séa.</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Adhérent : <strong>{clientName}</strong> (Souscrit le {clientPackage.purchaseDate})</p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 block">Motif de l'annulation :</label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map(r => (
                <label
                  key={r.key}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    reasonKey === r.key
                      ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={r.key}
                    checked={reasonKey === r.key}
                    onChange={() => setReasonKey(r.key)}
                    className="mt-0.5 accent-rose-600"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block">{r.label}</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">{r.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Manager Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" /> Notes explicatives (Optionnel) :
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Saisissez des précisions sur cette annulation..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-500 focus:bg-white resize-none"
            />
          </div>

          {/* Associated Payment Option */}
          {payment && payment.status !== 'reversed' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer text-amber-900 font-bold">
                <input
                  type="checkbox"
                  checked={reversePayment}
                  onChange={(e) => setReversePayment(e.target.checked)}
                  className="mt-0.5 accent-amber-600 h-4 w-4"
                />
                <div>
                  <span className="block text-xs">Annuler également l'encaissement d'origine (Remboursement)</span>
                  <span className="text-[10px] font-normal text-amber-800 block">
                    Reçu N° {payment.receiptNumber || payment.id.slice(-6)} - Montant : {payment.amount.toLocaleString('fr-DZ')} DZD
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Warning Message */}
          <div className="p-3 bg-slate-100 rounded-xl flex items-start gap-2 text-[10px] text-slate-600 font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>Cette action désactivera immédiatement les crédits restants de ce forfait et sera enregistrée dans le journal d'audit du centre.</span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Conserver le forfait
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Ban className="h-4 w-4" />
              {submitting ? 'Annulation...' : 'Confirmer l\'annulation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
