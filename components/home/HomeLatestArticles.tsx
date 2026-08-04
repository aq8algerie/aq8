import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock3 } from "lucide-react";
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
    <section aria-labelledby="latest-articles-title" className="space-y-8">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff5757]">
            <BookOpen className="h-4 w-4" />
            {"Conseils & actualit\u00e9s"}
          </p>
          <h2 id="latest-articles-title" className="mt-3 font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">
            {"Les derni\u00e8res nouvelles du r\u00e9seau AQ8."}
          </h2>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            {"Conseils pratiques, informations, promotions et \u00e9v\u00e9nements publi\u00e9s par l\u2019\u00e9quipe AQ8 Alg\u00e9rie."}
          </p>
        </div>
        <Link
          href="/conseils"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-[#242424] transition hover:border-[#ff5757] hover:text-[#ff5757]"
        >
          Voir tous les articles
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <article className={(secondaryPosts.length > 0 ? "lg:col-span-7" : "lg:col-span-12") + " group overflow-hidden rounded-lg border border-slate-200 bg-white"}>
          <Link href={primaryHref} className={(secondaryPosts.length > 0 ? "" : "lg:grid lg:grid-cols-[1.05fr_0.95fr]") + " block"}>
            <div className="aspect-[16/9] overflow-hidden bg-slate-100">
              <img
                src={primaryPost.coverImageUrl}
                alt={primaryPost.coverImageAlt}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                loading="lazy"
              />
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase">
                <span className="text-[#ff5757]">{getBlogPublicationTypeLabel(primaryPost.publicationType)}</span>
                <span className="text-slate-400">{getBlogCategoryLabel(primaryPost.category)}</span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold leading-snug text-[#242424] transition group-hover:text-[#ff5757] sm:text-3xl">
                {primaryPost.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm font-medium leading-7 text-slate-600">
                {primaryPost.excerpt}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatPublishedDate(primaryPost)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {primaryPost.readingTimeMinutes} min
                </span>
              </div>
            </div>
          </Link>
        </article>

        {secondaryPosts.length > 0 && (
          <div className="grid gap-5 lg:col-span-5">
            {secondaryPosts.map(post => (
              <article key={post.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Link href={"/conseils/" + post.slug} className="grid h-full sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-auto">
                    <img
                      src={post.coverImageUrl}
                      alt={post.coverImageAlt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col justify-center p-5">
                    <span className="text-[10px] font-bold uppercase text-[#ff5757]">
                      {getBlogPublicationTypeLabel(post.publicationType)}
                    </span>
                    <h3 className="mt-2 line-clamp-3 font-display text-lg font-bold leading-snug text-[#242424] transition group-hover:text-[#ff5757]">
                      {post.title}
                    </h3>
                    <div className="mt-4 flex items-center gap-3 text-[10px] font-semibold text-slate-400">
                      <span>{formatPublishedDate(post)}</span>
                      <span>{post.readingTimeMinutes} min</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
