import React from "react";
import type { Metadata } from "next";
import "@/src/index.css";
import { DataProvider } from "@/components/context/DataProvider";

export const metadata: Metadata = {
  title: "AQ8 Algérie",
  description: "AQ8 EMS & Wonder Sculpting en Algérie",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        <DataProvider>
          {children}
        </DataProvider>
      </body>
    </html>
  );
}
