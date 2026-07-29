import type { Metadata } from "next";
import { BlogIndexClient } from "@/components/blog/BlogIndexClient";
import { getServerPublishedBlogPosts } from "@/src/lib/serverBlogData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conseils & actualités AQ8 Algérie | EMS, Wonder et bien-être",
  description:
    "Guides pratiques, conseils et actualités AQ8 Algérie pour comprendre l’EMS, Wonder, préparer vos séances et découvrir nos centres.",
  alternates: { canonical: "/conseils" },
  openGraph: {
    title: "Conseils & actualités AQ8 Algérie",
    description:
      "Des contenus clairs et relus pour mieux comprendre les technologies AQ8 et préparer vos séances.",
    url: "/conseils",
    type: "website",
    images: [{ url: "/images/aq8algerie.webp", alt: "AQ8 Algérie" }],
  },
};

export default async function BlogPage() {
  const posts = await getServerPublishedBlogPosts();

  return <BlogIndexClient posts={posts} />;
}

