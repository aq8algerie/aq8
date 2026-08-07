import React from "react";
import type { Metadata } from "next";
import "@/src/index.css";
import { DataProvider } from "@/components/context/DataProvider";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: any = {
  metadataBase: new URL(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.aq8algerie-dz.com"),
  title: "AQ8 Algérie | Électrostimulation EMS & Wonder Axion",
  description: "AQ8 EMS & Wonder Axion en Algérie. Réservez votre séance dans le centre AQ8 le plus proche.",
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/apple-touch-icon.png",
  },
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
      <head>
        <link rel="icon" type="image/png" href="/images/favicon.png" />
        <link rel="shortcut icon" href="/images/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        <DataProvider>
          <PwaRegister />
          {children}
        </DataProvider>
      </body>
    </html>
  );
}
