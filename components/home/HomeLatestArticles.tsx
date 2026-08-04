import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock3, Sparkles } from "lucide-react";
import {
  getBlogCategoryLabel,
  getBlogPublicationTypeLabel,
  type BlogPost,
} from "@/src/lib/blog";

function formatPublishedDate(post: BlogPost): string {
  const value = post.publishedAt || post.scheduledAt || post.updatedAt;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Publication r\u00e9cente";

  return new Intl.DateTimeFormat("fr-DZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function HomeLatestArticles({ posts }: { posts: BlogPost[] }) {
  const latestPosts = posts.slice(0, 3);
  if (latestPosts.length === 0) return null;

  const [primaryPost, ...secondaryPosts] = latestPosts;
  const primaryHref = "/conseils/" + primaryPost.slug;

  return (
    <section aria-labelledby="latest-articles-title" className="space-y-10 sm:space-y-12">
      <div className="grid gap-6 border-b border-slate-200 pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff5757]">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[#fff0f0]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            {"Conseils & actualit\u00e9s"}
          </p>
          <h2
            id="latest-articles-title"
            className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl lg:text-5xl"
          >
            {"Les derni\u00e8res nouvelles du r\u00e9seau AQ8."}
          </h2>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
            {"D\u00e9cryptages, conseils pratiques et temps forts du r\u00e9seau pour vous accompagner avant, pendant et apr\u00e8s chaque s\u00e9ance."}
          </p>
        </div>
        <Link
          href="/conseils"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-[#242424] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff5757] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5757] focus-visible:ring-offset-2"
        >
          {"D\u00e9couvrir le magazine"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <article className="group overflow-hidden rounded-lg bg-[#242424] shadow-[0_24px_60px_-34px_rgba(15,23,42,0.7)]">
        <Link href={primaryHref} className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 lg:min-h-[430px] lg:aspect-auto">
            <img
              src={primaryPost.coverImageUrl}
              alt={primaryPost.coverImageAlt}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
              loading="lazy"
            />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-[10px] font-extrabold uppercase text-[#242424] shadow-sm sm:left-6 sm:top-6">
              <Sparkles className="h-3.5 w-3.5 text-[#ff5757]" aria-hidden="true" />
              {"\u00c0 la une"}
            </span>
          </div>

          <div className="flex min-w-0 flex-col justify-center p-6 sm:p-9 lg:p-10">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-extrabold uppercase">
              <span className="text-[#ff7777]">{getBlogPublicationTypeLabel(primaryPost.publicationType)}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
              <span className="text-slate-400">{getBlogCategoryLabel(primaryPost.category)}</span>
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-white transition group-hover:text-[#ff7777] sm:text-3xl lg:text-4xl">
              {primaryPost.title}
            </h3>
            <p className="mt-4 line-clamp-4 text-sm font-medium leading-7 text-slate-300 sm:text-base">
              {primaryPost.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-[11px] font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatPublishedDate(primaryPost)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {primaryPost.readingTimeMinutes} min de lecture
              </span>
            </div>

            <span className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-bold text-white">
              Lire la publication
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </article>

      {secondaryPosts.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {secondaryPosts.map(post => (
            <article key={post.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-[0_18px_40px_-30px_rgba(15,23,42,0.6)]">
              <Link href={"/conseils/" + post.slug} className="grid h-full sm:grid-cols-[190px_minmax(0,1fr)]">
                <div className="aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-auto">
                  <img
                    src={post.coverImageUrl}
                    alt={post.coverImageAlt}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="flex min-w-0 flex-col justify-center p-5 sm:p-6">
                  <span className="text-[10px] font-extrabold uppercase text-[#ff5757]">
                    {getBlogPublicationTypeLabel(post.publicationType)}
                  </span>
                  <h3 className="mt-2 line-clamp-3 font-display text-lg font-bold leading-snug text-[#242424] transition group-hover:text-[#ff5757]">
                    {post.title}
                  </h3>
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400">
                    <span>{formatPublishedDate(post)}</span>
                    <span>{post.readingTimeMinutes} min</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
