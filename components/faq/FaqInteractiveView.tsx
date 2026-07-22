"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Sparkles,
  Zap,
  Shirt,
  Calendar,
  HeartPulse,
  CreditCard,
  X,
  ArrowRight,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { FAQ_ITEMS, FAQ_CATEGORIES, FaqItem } from './faqData';

const iconMap = {
  Sparkles,
  Zap,
  Shirt,
  Calendar,
  HeartPulse,
  CreditCard,
};

export function FaqInteractiveView() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['faq-1', 'faq-5', 'faq-7']));

  const toggleOpen = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenIds(new Set(filteredFaqs.map(f => f.id)));
  };

  const collapseAll = () => {
    setOpenIds(new Set());
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter(item => {
      // Category match
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      // Search match
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.tags.some(t => t.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <div className="space-y-10 py-2">
      {/* HERO / HEADER SECTION */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50/70 px-4 py-1.5 text-xs font-bold text-[#ff5757]">
          <HelpCircle className="h-4 w-4" />
          Foire Aux Questions AQ8 Algérie
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#242424] tracking-tight">
          Toutes les réponses à vos questions
        </h1>

        <p className="text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
          Technologies AQ8 EMS & Wonder Sculpt, déroulement des séances, tenue conseillée, règles de réservation et contre-indications.
        </p>
      </div>

      {/* SEARCH BAR & QUICK FILTERS */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une question (ex: tenue, contre-indication, durée, tarif)..."
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff5757]/30 focus:border-[#ff5757] transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* CATEGORY PILLS */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {FAQ_CATEGORIES.map(cat => {
            const Icon = iconMap[cat.icon as keyof typeof iconMap] || Sparkles;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#ff5757] text-white shadow-md shadow-[#ff5757]/20 scale-105'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TOP CONTROLS & STATUS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500 font-medium">
        <div>
          Affichage de <span className="font-bold text-slate-800">{filteredFaqs.length}</span> question{filteredFaqs.length > 1 ? 's' : ''}
          {selectedCategory !== 'all' && (
            <span> dans cette catégorie</span>
          )}
          {search && (
            <span> pour « <span className="font-bold text-[#ff5757]">{search}</span> »</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={expandAll}
            className="text-slate-600 hover:text-[#ff5757] font-bold transition cursor-pointer"
          >
            Tout déplier
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-slate-600 hover:text-[#ff5757] font-bold transition cursor-pointer"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* FAQ ACCORDION LIST */}
      {filteredFaqs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">Aucune question ne correspond à votre recherche</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Essayez avec un autre mot-clé ou réinitialisez la recherche.</p>
          <button
            type="button"
            onClick={() => { setSearch(''); setSelectedCategory('all'); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq) => {
            const isOpen = openIds.has(faq.id);

            return (
              <div
                key={faq.id}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'border-[#ff5757]/40 shadow-md shadow-[#ff5757]/5 ring-1 ring-[#ff5757]/20'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleOpen(faq.id)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    {faq.popular && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[#ff5757] text-[10px] font-black uppercase tracking-wider">
                        Populaire
                      </span>
                    )}
                    <h2 className="font-display font-bold text-base text-[#242424] leading-snug">
                      {faq.question}
                    </h2>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-[#ff5757]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm font-medium text-slate-600 border-t border-slate-100/80 leading-relaxed bg-slate-50/40">
                    <p className="mt-2 text-slate-700 leading-relaxed">{faq.answer}</p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
                      <span className="uppercase tracking-wider mr-1 text-slate-400">Mots-clés :</span>
                      {faq.tags.map(tag => (
                        <span key={tag} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BOTTOM CTA BOX */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mt-12">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="font-display text-xl font-bold">Une question spécifique sur un centre ?</h3>
          <p className="text-xs text-slate-400 max-w-lg">
            Nos équipes vous accueillent dans nos centres de Birkhadem, Ouled Fayet, Blida, Tlemcen, Sidi Yahia et Draria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/centres"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-3 text-xs font-bold text-white transition cursor-pointer"
          >
            <MapPin className="h-4 w-4 text-[#ff5757]" />
            Nos Centres
          </Link>
          <Link
            href="/reservation"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff5757] hover:bg-[#e94949] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#ff5757]/30 transition cursor-pointer"
          >
            Réserver une séance
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
