import type { Metadata } from "next";
import { PublicNotFound } from "@/components/errors/PublicNotFound";

export const metadata: Metadata = {
  title: "Page introuvable | AQ8 Algérie",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return <PublicNotFound />;
}
