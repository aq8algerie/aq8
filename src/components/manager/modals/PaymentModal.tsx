/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Client, Package } from '../../../types';

interface PaymentModalProps {
  clients: Client[];
  packages: Package[];
  onClose: () => void;
  onSubmit: (data: {
    paymentId: string;
    clientId: string;
    packageId: string;
    amount: number;
    method: 'cash' | 'card' | 'ccp' | 'cheque';
    receiptNumber: string;
    autoActivatePackage: boolean;
    customSessionsCount?: number;
  }) => Promise<{ ok: boolean }>;
  initialClientId?: string;
}

export function PaymentModal({
  clients,
  packages,
  onClose,
  onSubmit,
  initialClientId
}: PaymentModalProps) {
  const [clientId, setClientId] = useState(initialClientId || '');
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const selectedPackage = packages.find(p => p.id === packageId);
  const [customSessionsCount, setCustomSessionsCount] = useState(selectedPackage?.sessionsCount || 1);
  const [amount, setAmount] = useState((selectedPackage?.price || 3000) * (selectedPackage?.sessionsCount || 1));
  const [method, setMethod] = useState<'cash' | 'card' | 'ccp' | 'cheque'>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [autoActivatePackage, setAutoActivatePackage] = useState(true);
  const paymentIdRef = useRef(`pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync package price and session count when packageId changes
  useEffect(() => {
    const matched = packages.find(p => p.id === packageId);
    if (matched) {
      const defaultCount = matched.sessionsCount || 1;
      setCustomSessionsCount(defaultCount);
      setAmount(matched.price);
    }
  }, [packageId, packages]);

  const handleSessionsChange = (count: number) => {
    const validCount = Math.max(1, count);
    setCustomSessionsCount(validCount);
    const matched = packages.find(p => p.id === packageId);
    if (matched) {
      const unitPrice = matched.isFlexible 
        ? matched.price 
        : Math.round(matched.price / Math.max(1, matched.sessionsCount || 1));
      setAmount(Math.round(unitPrice * validCount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !packageId || amount <= 0 || customSessionsCount <= 0 || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        paymentId: paymentIdRef.current,
        clientId,
        packageId,
        amount,
        method,
        receiptNumber: receiptNumber.trim(),
        autoActivatePackage,
        customSessionsCount,
      });

      if (!result.ok) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  return (
    <div id="modal-payment" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h4 className="font-bold text-slate-800 text-sm font-display">Loguer un Encaissement Manuel</h4>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Adhérent Payeur *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
              disabled={!!initialClientId}
            >
              <option value="">-- Choisir le payeur --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Forfait concerné *</label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString('fr-DZ')} DZD{p.isFlexible ? ' / séance' : ''})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-600 block">Nombre de séances attribuées *</label>
              {selectedPackage?.isFlexible && (
                <span className="text-[10px] bg-sky-100 text-[#0284c7] font-extrabold px-2 py-0.5 rounded-md uppercase">
                  Séance Libre
                </span>
              )}
            </div>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={customSessionsCount}
              onChange={(e) => handleSessionsChange(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-sm text-[#0284c7] focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">
              {selectedPackage?.isFlexible 
                ? "💡 Séance Libre : le client peut payer 1, 2, 3 séances ou plus. Le montant global s'ajuste automatiquement."
                : "Ajustez le nombre de séances attribuées au client si nécessaire."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Montant encaissé (DZD) *</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-800 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Mode de paiement *</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                required
              >
                <option value="cash">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="ccp">CCP (Virement)</option>
                <option value="card">Carte Bancaire / CIB</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Numéro de reçu ou référence (facultatif)</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="ex: REC-2026-45"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="chk-auto-activate"
              checked={autoActivatePackage}
              onChange={(e) => setAutoActivatePackage(e.target.checked)}
              className="h-4 w-4 text-[#0284c7] border-slate-300 rounded focus:ring-[#0284c7]"
            />
            <label htmlFor="chk-auto-activate" className="font-medium text-slate-700 select-none cursor-pointer">
              Activer automatiquement le forfait pour cet adhérent
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-white rounded-xl cursor-pointer disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? 'Enregistrement sécurisé...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
