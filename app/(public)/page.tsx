import type { Metadata } from "next";
import { getSeoForPage } from "@/lib/seo";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeTrustBar } from "@/components/home/HomeTrustBar";
import { HomeTechnologies } from "@/components/home/HomeTechnologies";
import { HomeProgramSimulator } from "@/components/home/HomeProgramSimulator";
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
    <main className="py-4 sm:py-6">
      <SeoJsonLd type="organization" />
      <SeoJsonLd type="faq" />

      <div className="space-y-16 sm:space-y-20 lg:space-y-24">
        <div className="space-y-6">
          <HomeHero centerCount={centers.length} />
          <HomeTrustBar />
        </div>
        <HomeTechnologies />
        <HomeProgramSimulator />
        <HomeCentersPreview centers={centers} />
        <HomeWhyChoose />
        <HomeHowItWorks />
        <HomeLatestArticles posts={publishedPosts} />
        <HomeShortFAQ />
        <HomeFinalCTA />
      </div>
    </main>
  );
}
