import type { Metadata } from "next";
import { getSeoForPage } from "@/lib/seo";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeTechnologies } from "@/components/home/HomeTechnologies";
import { HomeCentersPreview } from "@/components/home/HomeCentersPreview";
import { HomeWhyChoose } from "@/components/home/HomeWhyChoose";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomeShortFAQ } from "@/components/home/HomeShortFAQ";
import { HomeLatestArticles } from "@/components/home/HomeLatestArticles";
import { HomeFinalCTA } from "@/components/home/HomeFinalCTA";
import { getServerPublicCenters } from "@/src/lib/serverPublicData";
import { getServerPublishedBlogPosts } from "@/src/lib/serverBlogData";

export const metadata: Metadata = {
  title: getSeoForPage("home").title,
  description: getSeoForPage("home").description,
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [centers, publishedPosts] = await Promise.all([
    getServerPublicCenters(),
    getServerPublishedBlogPosts(),
  ]);

  return (
    <main className="space-y-16 py-4">
      <SeoJsonLd type="organization" />

      <HomeHero centerCount={centers.length} />
      <HomeTechnologies />
      <HomeCentersPreview centers={centers} />
      <HomeWhyChoose />
      <HomeHowItWorks />
      <HomeLatestArticles posts={publishedPosts} />
      <HomeShortFAQ />
      <HomeFinalCTA />
    </main>
  );
}
