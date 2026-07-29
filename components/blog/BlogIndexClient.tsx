"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react";
import {
  BLOG_CATEGORIES,
  getBlogCategoryLabel,
  type BlogPost,
} from "@/src/lib/blog";

function formatDate(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-DZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter(post => {
      const matchesCategory = category === "all" || post.category === category;
      const matchesSearch = !term
        || post.title.toLowerCase().includes(term)
        || post.excerpt.toLowerCase().includes(term)
        || post.tags.some(tag => tag.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [category, posts, search]);

  if (posts.length === 0) {
    return (
      <div className="space-y-14">
        <section className="grid min-h-[420px] overflow-hidden rounded-lg bg-[#f5f7f9] lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
            <span className="mb-5 inline-flex w-fit items-center gap-2 text-xs font-bold uppercase text-[#ff5757]">
              <Sparkles className="h-4 w-4" />
              Le magazine AQ8
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight text-[#242424] sm:text-5xl">
              Conseils & actualités
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-slate-600">
              Des contenus clairs et relus pour mieux comprendre les technologies
              AQ8, préparer vos séances et suivre l’actualité de nos centres.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/reservation" className="inline-flex items-center gap-2 rounded-md bg-[#ff5757] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e94949]">
                Réserver une séance
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/aq8" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#242424] transition hover:border-slate-400">
                Découvrir AQ8 EMS
              </Link>
            </div>
          </div>
          <img
            src="/images/aq8algerie.webp"
            alt="Séance AQ8 EMS encadrée"
            className="h-full min-h-72 w-full object-cover object-center"
          />
        </section>

        <section className="py-4 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-[#ff5757]" />
          <h2 className="mt-4 font-display text-2xl font-bold text-[#242424]">
            Les premiers dossiers sont en préparation
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
            Notre équipe éditoriale prépare des contenus pratiques et responsables.
            Revenez prochainement pour découvrir le premier article.
          </p>
        </section>
      </div>
    );
  }

  const featured = posts.find(post => post.featured) || posts[0];
  const remainingPosts = filteredPosts.filter(post => post.id !== featured.id);

  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-lg bg-[#f4f6f8]">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
            <span className="mb-5 inline-flex w-fit items-center gap-2 text-[11px] font-extrabold uppercase text-[#ff5757]">
              <Sparkles className="h-4 w-4" />
              À la une
            </span>
            <Link href={`/conseils/${featured.slug}`} className="group">
              <h1 className="font-display text-3xl font-bold leading-tight text-[#242424] transition group-hover:text-[#ff5757] sm:text-4xl lg:text-5xl">
                {featured.title}
              </h1>
            </Link>
            <p className="mt-5 line-clamp-3 max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
              {featured.excerpt}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              <span className="text-[#ff5757]">{getBlogCategoryLabel(featured.category)}</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(featured.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {featured.readingTimeMinutes} min
              </span>
            </div>
            <Link href={`/conseils/${featured.slug}`} className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-bold text-[#242424] transition hover:text-[#ff5757]">
              Lire l’article
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Link href={`/conseils/${featured.slug}`} className="min-h-72 overflow-hidden lg:min-h-[460px]">
            <img
              src={featured.coverImageUrl}
              alt={featured.coverImageAlt}
              className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
            />
          </Link>
        </div>
      </section>

      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#ff5757]">Bibliothèque AQ8</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-[#242424]">Tous nos conseils</h2>
          </div>
          <label className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher un sujet"
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium outline-none transition focus:border-[#ff5757]"
            />
          </label>
        </div>

        <div className="flex overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded px-3 py-2 text-xs font-bold transition ${category === "all" ? "bg-white text-[#242424] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Tous
          </button>
          {BLOG_CATEGORIES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`shrink-0 rounded px-3 py-2 text-xs font-bold transition ${category === item.id ? "bg-white text-[#242424] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {remainingPosts.length === 0 ? (
          <div className="border border-dashed border-slate-300 px-6 py-14 text-center">
            <Search className="mx-auto h-7 w-7 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-[#242424]">Aucun autre article trouvé</h3>
            <p className="mt-1 text-xs text-slate-500">Modifiez la catégorie ou votre recherche.</p>
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {remainingPosts.map(post => (
              <article key={post.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Link href={`/conseils/${post.slug}`} className="block aspect-[16/10] overflow-hidden bg-slate-100">
                  <img src={post.coverImageUrl} alt={post.coverImageAlt} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
                </Link>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold">
                    <span className="uppercase text-[#ff5757]">{getBlogCategoryLabel(post.category)}</span>
                    <span className="inline-flex items-center gap-1 text-slate-400"><Clock3 className="h-3 w-3" />{post.readingTimeMinutes} min</span>
                  </div>
                  <Link href={`/conseils/${post.slug}`}>
                    <h3 className="mt-3 line-clamp-2 font-display text-xl font-bold leading-snug text-[#242424] transition group-hover:text-[#ff5757]">{post.title}</h3>
                  </Link>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] font-semibold text-slate-400">
                    <span>{formatDate(post.publishedAt)}</span>
                    <Link href={`/conseils/${post.slug}`} aria-label={`Lire ${post.title}`} className="text-[#242424] transition group-hover:text-[#ff5757]">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col items-start justify-between gap-6 rounded-lg bg-[#242424] px-6 py-9 text-white sm:px-9 lg:flex-row lg:items-center">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-[#ff5757]">Passez à l’action</span>
          <h2 className="mt-2 font-display text-2xl font-bold">Un conseil vous a aidé à choisir ?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Trouvez votre centre AQ8 et demandez un créneau adapté à vos objectifs.</p>
        </div>
        <Link href="/reservation" className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#ff5757] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e94949]">
          Réserver une séance
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

