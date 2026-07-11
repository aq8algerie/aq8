/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Client, Package } from '../../../types';

interface PaymentModalProps {
  clients: Client[];
  packages: Package[];
  onClose: () => void;
  onSubmit: (data: {
    clientId: string;
    packageId: string;
    amount: number;
    method: 'cash' | 'card' | 'ccp' | 'cheque';
    receiptNumber: string;
    autoActivatePackage: boolean;
  }) => void;
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
  const [amount, setAmount] = useState(27000);
  const [method, setMethod] = useState<'cash' | 'card' | 'ccp' | 'cheque'>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [autoActivatePackage, setAutoActivatePackage] = useState(true);

  // Sync package price when packageId changes
  useEffect(() => {
    const matched = packages.find(p => p.id === packageId);
    if (matched) {
      setAmount(matched.price);
    }
  }, [packageId, packages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !packageId || amount <= 0) return;
    
    onSubmit({
      clientId,
      packageId,
      amount,
      method,
      receiptNumber: receiptNumber.trim(),
      autoActivatePackage
    });
  };

  return (
    <div id="modal-payment" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h4 className="font-bold text-slate-800 text-sm font-display">Loguer un Encaissement Manuel</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
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
                <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString('fr-DZ')} DZD)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Montant encaissé (DZD) *</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
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
              className="h-4 w-4 text-[#ff5757] border-slate-300 rounded focus:ring-[#ff5757]"
            />
            <label htmlFor="chk-auto-activate" className="font-medium text-slate-700 select-none cursor-pointer">
              Activer automatiquement le forfait pour cet adhérent
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl cursor-pointer"
            >
              Enregistrer le paiement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
