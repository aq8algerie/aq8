import React from "react";
import type { Metadata } from "next";
import "@/src/index.css";
import { DataProvider } from "@/components/context/DataProvider";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: any = {
  title: "AQ8 Algérie",
  description: "AQ8 EMS & Wonder Sculpting en Algérie",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AQ8 CRM",
  },
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
          <PwaRegister />
          {children}
        </DataProvider>
      </body>
    </html>
  );
}
