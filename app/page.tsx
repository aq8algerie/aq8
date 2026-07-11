import type { Metadata } from "next";
import { getSeoForPage } from "@/lib/seo";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeTechnologies } from "@/components/home/HomeTechnologies";
import { HomeCentersPreview } from "@/components/home/HomeCentersPreview";
import { HomeWhyChoose } from "@/components/home/HomeWhyChoose";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomeShortFAQ } from "@/components/home/HomeShortFAQ";
import { HomeFinalCTA } from "@/components/home/HomeFinalCTA";
import { centers } from "@/lib/centers";

export const metadata: Metadata = {
  title: getSeoForPage("home").title,
  description: getSeoForPage("home").description,
};

export default function HomePage() {
  return (
    <main className="space-y-16 py-4">
      <SeoJsonLd type="organization" />

      <HomeHero />
      <HomeTechnologies />
      <HomeCentersPreview centers={centers} />
      <HomeWhyChoose />
      <HomeHowItWorks />
      <HomeShortFAQ />
      <HomeFinalCTA />
    </main>
  );
}
