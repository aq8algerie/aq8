import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { ArticleShareActions } from "@/components/blog/ArticleShareActions";
import { BlogArticleContent } from "@/components/blog/BlogArticleContent";
import { getBlogCategoryLabel } from "@/src/lib/blog";
import {
  getServerPublishedBlogPostBySlug,
  getServerPublishedBlogPosts,
} from "@/src/lib/serverBlogData";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const BASE_URL = (
  process.env.APP_URL
  || process.env.NEXT_PUBLIC_APP_URL
  || "https://www.aq8algerie-dz.com"
).replace(/\/+$/, "");

function formatDate(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-DZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getServerPublishedBlogPostBySlug(slug);
  if (!post) {
    return {
      title: "Article introuvable | AQ8 Algérie",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const canonical = `/conseils/${post.slug}`;
  return {
    title,
    description,
    authors: [{ name: post.authorName }],
    alternates: { canonical },
    keywords: post.tags,
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      images: [{
        url: post.coverImageUrl,
        alt: post.coverImageAlt,
      }],
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getServerPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const allPosts = await getServerPublishedBlogPosts();
  const relatedPosts = allPosts
    .filter(item => item.id !== post.id && item.category === post.category)
    .slice(0, 3);
  const headings = post.content.filter(block => block.type === "heading" && block.text);
  const articleUrl = `${BASE_URL}/conseils/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: [post.coverImageUrl],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: articleUrl,
    author: {
      "@type": "Organization",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "AQ8 Algérie",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/images/logo.png`,
      },
    },
  };

  return (
    <article className="pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="mx-auto max-w-5xl pt-3 text-center sm:pt-6">
        <Link href="/conseils" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#ff5757]">
          <ArrowLeft className="h-4 w-4" />
          Tous les conseils
        </Link>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-[10px] font-extrabold uppercase">
          <span className="text-[#ff5757]">{getBlogCategoryLabel(post.category)}</span>
          {post.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-slate-400">{tag}</span>
          ))}
        </div>
        <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-bold leading-tight text-[#242424] sm:text-5xl lg:text-6xl">
          {post.title}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
          {post.excerpt}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-[#ff5757]" />{post.authorName}</span>
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#ff5757]" />{formatDate(post.publishedAt)}</span>
          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#ff5757]" />{post.readingTimeMinutes} min de lecture</span>
        </div>
      </header>

      <figure className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-lg bg-slate-100">
        <img src={post.coverImageUrl} alt={post.coverImageAlt} className="aspect-[16/8] w-full object-cover" />
      </figure>

      <div className="mx-auto mt-10 grid max-w-6xl gap-10 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-center">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-6">
            {headings.length > 0 && (
              <nav aria-label="Sommaire">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Dans cet article</span>
                <ul className="mt-3 space-y-2 border-l border-slate-200 pl-4">
                  {headings.map(heading => {
                    const id = (heading.text || "")
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    return (
                      <li key={heading.id}>
                        <a href={`#${id}`} className="text-xs font-semibold leading-5 text-slate-500 transition hover:text-[#ff5757]">
                          {heading.text}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            <ArticleShareActions title={post.title} url={articleUrl} />
          </div>
        </aside>

        <div>
          <BlogArticleContent blocks={post.content} />

          <aside className="mt-10 flex items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5757]" />
            <div>
              <h2 className="text-sm font-bold text-[#242424]">Information responsable</h2>
              <p className="mt-1 text-xs leading-6 text-slate-600">
                Ce contenu est fourni à titre informatif. Il ne remplace pas un avis médical
                ni l’évaluation réalisée par un professionnel avant une séance.
              </p>
              {post.reviewerName && (
                <p className="mt-2 text-[10px] font-bold text-slate-500">Relu par {post.reviewerName}</p>
              )}
            </div>
          </aside>

          <div className="mt-7 flex items-center justify-between gap-4 border-t border-slate-200 pt-6 lg:hidden">
            <span className="text-xs font-bold text-slate-500">Partager cet article</span>
            <ArticleShareActions title={post.title} url={articleUrl} />
          </div>
        </div>
      </div>

      {relatedPosts.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl border-t border-slate-200 pt-10">
          <div className="flex items-end justify-between gap-5">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-[#ff5757]">Continuer la lecture</span>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#242424]">Articles liés</h2>
            </div>
            <Link href="/conseils" className="hidden items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-[#ff5757] sm:inline-flex">
              Tous les articles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map(item => (
              <Link key={item.id} href={`/conseils/${item.slug}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img src={item.coverImageUrl} alt={item.coverImageAlt} className="aspect-[16/9] w-full object-cover" loading="lazy" />
                <div className="p-4">
                  <span className="text-[9px] font-extrabold uppercase text-[#ff5757]">{getBlogCategoryLabel(item.category)}</span>
                  <h3 className="mt-2 line-clamp-2 font-display text-lg font-bold leading-snug text-[#242424] transition group-hover:text-[#ff5757]">{item.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
