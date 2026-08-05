import type { Metadata } from "next";
import Link from "next/link";
import { PublicNotFound } from "@/components/errors/PublicNotFound";

export const metadata: Metadata = {
  title: "Page introuvable | AQ8 Algérie",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="AQ8 Algérie - Accueil"
            className="inline-flex transition hover:opacity-85"
          >
            <img
              src="/images/logo.png"
              alt="AQ8 Algérie"
              width="340"
              height="96"
              className="h-10 w-auto max-w-[210px] object-contain sm:h-12"
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PublicNotFound />
      </main>
    </div>
  );
}
