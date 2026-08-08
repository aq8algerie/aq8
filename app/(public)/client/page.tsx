import type { Metadata } from "next";
import { getSeoForPage } from "@/lib/seo";
import { ClientPortalClient } from "@/components/client/ClientPortalClient";

export const metadata: Metadata = {
  title: "Mon Espace Client | AQ8 Algérie",
  description: "Accédez à votre espace adhérent AQ8 Algérie : consultez vos rendez-vous passés et à venir, le suivi de vos mensurations et l'état de vos forfaits.",
};

export const dynamic = "force-dynamic";

export default function ClientPortalPage() {
  return (
    <main className="bg-slate-50/50 min-h-screen py-6 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <ClientPortalClient />
      </div>
    </main>
  );
}
