"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

export function ArticleShareActions({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await copyLink();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-[#242424]"
      >
        <Share2 className="h-4 w-4" />
        Partager
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        aria-label="Copier le lien"
        title={copied ? "Lien copié" : "Copier le lien"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-[#242424]"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

