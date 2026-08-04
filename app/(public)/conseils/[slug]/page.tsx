import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { ArticleShareActions } from "@/components/blog/ArticleShareActions";
import { BlogArticleContent } from "@/components/blog/BlogArticleContent";
import {
  getBlogCategoryLabel,
  getBlogPublicationTypeLabel,
} from "@/src/lib/blog";
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

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

function formatDate(value?: string | null, withTime = false): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_FR[date.getMonth()];
  const year = date.getFullYear();
  if (withTime) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} à ${hours}:${minutes}`;
  }
  return `${day} ${month} ${year}`;
}


function getPublicationTiming(
  publicationType: string,
  startsAt?: string | null,
  endsAt?: string | null,
): string {
  if (publicationType === "event" && startsAt) return formatDate(startsAt, true);
  if (publicationType === "promotion" && endsAt) return "Offre valable jusqu’au " + formatDate(endsAt);
  return "";
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getServerPublishedBlogPostBySlug(slug);
  if (!post) {
    return {
      title: "Publication introuvable | AQ8 Algérie",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const canonical = "/conseils/" + post.slug;
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
      publishedTime: post.publishedAt || post.scheduledAt || undefined,
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
    .filter(item => item.id !== post.id && (
      item.publicationType === post.publicationType || item.category === post.category
    ))
    .slice(0, 3);
  const headings = post.content.filter(block => block.type === "heading" && block.text);
  const articleUrl = BASE_URL + "/conseils/" + post.slug;
  const timing = getPublicationTiming(post.publicationType, post.startsAt, post.endsAt);
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: [post.coverImageUrl],
    datePublished: post.publishedAt || post.scheduledAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: articleUrl,
    about: getBlogPublicationTypeLabel(post.publicationType),
    author: {
      "@type": "Organization",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "AQ8 Algérie",
      logo: {
        "@type": "ImageObject",
        url: BASE_URL + "/images/logo.png",
      },
    },
  };
  const eventJsonLd = post.publicationType === "event" && post.startsAt ? {
    "@context": "https://schema.org",
    "@type": "Event",
    name: post.title,
    description: post.excerpt,
    image: [post.coverImageUrl],
    startDate: post.startsAt,
    endDate: post.endsAt || undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: post.location || "Centre AQ8 Algérie",
      address: post.location || "Algérie",
    },
    organizer: {
      "@type": "Organization",
      name: "AQ8 Algérie",
      url: BASE_URL,
    },
    url: articleUrl,
  } : null;
  const promotionJsonLd = post.publicationType === "promotion" ? {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: post.title,
    description: post.excerpt,
    url: articleUrl,
    validFrom: post.startsAt || post.publishedAt || undefined,
    validThrough: post.endsAt || undefined,
    seller: {
      "@type": "Organization",
      name: "AQ8 Algérie",
    },
  } : null;

  return (
    <article className="pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd).replace(/</g, "\\u003c") }}
      />
      {eventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      {promotionJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(promotionJsonLd).replace(/</g, "\\u003c") }}
        />
      )}

      <header className="mx-auto max-w-4xl pt-4 text-center sm:pt-8">
        <Link href="/conseils" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-[#ff5757] hover:text-[#ff5757] shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          <span>Magazine & Expertise AQ8</span>
        </Link>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs font-extrabold uppercase">
          <span className="rounded-full bg-rose-50 px-4 py-1.5 text-[#ff5757]">
            {getBlogPublicationTypeLabel(post.publicationType)}
          </span>
          <span className="rounded-full bg-slate-100 px-4 py-1.5 text-slate-600">
            {getBlogCategoryLabel(post.category)}
          </span>
        </div>

        <h1 className="mx-auto mt-5 font-display text-3xl font-extrabold leading-tight text-[#242424] sm:text-5xl lg:text-6xl tracking-tight">
          {post.title}
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
          {post.excerpt}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-500 border-y border-slate-100 py-4">
          <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-[#ff5757]" />{post.authorName}</span>
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#ff5757]" />{formatDate(post.publishedAt || post.scheduledAt)}</span>
          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-500" />{post.readingTimeMinutes} min de lecture</span>
        </div>

        {(timing || post.location) && (
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-[#1c1c20] to-[#2b2b32] px-6 py-4 text-xs font-bold text-white shadow-lg">
            {timing && <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-400" />{timing}</span>}
            {post.location && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ff7777]" />{post.location}</span>}
          </div>
        )}
      </header>

      <figure className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 shadow-xl">
        <img src={post.coverImageUrl} alt={post.coverImageAlt} className="aspect-[16/8] w-full object-cover" />
      </figure>

      <div className="mx-auto mt-12 grid max-w-6xl gap-12 lg:grid-cols-[240px_minmax(0,740px)] lg:justify-center">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            {headings.length > 0 && (
              <nav aria-label="Sommaire">
                <span className="text-[11px] font-black uppercase text-[#ff5757] tracking-wider">Dans cet article</span>
                <ul className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4 text-xs font-semibold">
                  {headings.map(heading => {
                    const id = (heading.text || "")
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    return (
                      <li key={heading.id}>
                        <a href={"#" + id} className="text-slate-500 transition hover:text-[#ff5757]">
                          {heading.text}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            <div className="border-t border-slate-100 pt-6">
              <span className="text-[11px] font-black uppercase text-slate-400">Partager l'article</span>
              <div className="mt-3">
                <ArticleShareActions title={post.title} url={articleUrl} />
              </div>
            </div>
          </div>
        </aside>

        <div>
          <BlogArticleContent blocks={post.content} />

          {post.ctaLabel && post.ctaUrl && (
            <aside className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-r from-[#18181c] to-[#292930] p-8 sm:p-10 text-white shadow-2xl border border-white/10">
              <span className="text-xs font-black uppercase text-[#ff7777] tracking-wider">
                {getBlogPublicationTypeLabel(post.publicationType)}
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{post.title}</h2>
              <p className="mt-2 text-sm text-slate-300">Prêt à franchir une étape dans votre transformation physique ?</p>
              <a
                href={post.ctaUrl}
                {...(post.ctaUrl.startsWith("https://")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="mt-6 inline-flex items-center gap-2.5 rounded-2xl bg-[#ff5757] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#ff5757]/30 transition hover:bg-[#e94949]"
              >
                <span>{post.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </aside>
          )}

          <aside className="mt-10 flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#ff5757]" />
            <div>
              <h2 className="text-sm font-bold text-[#242424]">Information médicale & responsabilité</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 font-medium">
                Ce contenu est rédigé à titre informatif et scientifique pour accompagner les utilisateurs d'AQ8 Algérie. Il ne remplace pas une consultation médicale individuelle ou l'évaluation préalable par un coach diplômé.
              </p>
              {post.reviewerName && (
                <p className="mt-3 text-[11px] font-bold text-slate-500">Relu et approuvé par {post.reviewerName}</p>
              )}
            </div>
          </aside>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6 lg:hidden">
            <span className="text-xs font-bold text-slate-500">Partager</span>
            <ArticleShareActions title={post.title} url={articleUrl} />
          </div>
        </div>
      </div>

      {relatedPosts.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl border-t border-slate-200 pt-12">
          <div className="flex items-end justify-between gap-5">
            <div>
              <span className="text-xs font-black uppercase text-[#ff5757] tracking-wider">À découvrir aussi</span>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#242424] sm:text-3xl">Autres publications du Magazine</h2>
            </div>
            <Link href="/conseils" className="hidden items-center gap-2 text-xs font-bold text-[#242424] transition hover:text-[#ff5757] sm:inline-flex">
              <span>Tout voir</span> <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map(item => (
              <Link key={item.id} href={"/conseils/" + item.slug} className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <img src={item.coverImageUrl} alt={item.coverImageAlt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                </div>
                <div className="p-6">
                  <span className="text-[10px] font-black uppercase text-[#ff5757]">{getBlogPublicationTypeLabel(item.publicationType)}</span>
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
