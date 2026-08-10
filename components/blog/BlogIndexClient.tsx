"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Megaphone,
  Search,
  Sparkles,
  Tag,
  X,
  Eye,
  CheckCircle2,
  ChevronDown,
  Flame,
  Zap,
  HelpCircle,
  Send,
  ShieldCheck,
  Star,
  Activity,
  Layers,
  Filter,
} from "lucide-react";
import {
  BLOG_CATEGORIES,
  BLOG_PUBLICATION_TYPES,
  getBlogCategoryLabel,
  getBlogPublicationTypeLabel,
  type BlogPost,
  type BlogPublicationType,
  type BlogCategory,
} from "@/src/lib/blog";

const TYPE_ICONS = {
  article: BookOpen,
  promotion: Tag,
  news: Megaphone,
  event: CalendarDays,
} as const;

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


function getTimingLabel(post: BlogPost): string {
  if (post.publicationType === "promotion" && post.endsAt) {
    return "Jusqu’au " + formatDate(post.endsAt);
  }
  if (post.publicationType === "event" && post.startsAt) {
    return formatDate(post.startsAt, true);
  }
  return formatDate(post.publishedAt || post.scheduledAt || post.updatedAt);
}

function BlogHero({ onSelectCategory }: { onSelectCategory: (cat: BlogCategory | "all") => void }) {
  return (
    <section className="relative isolate min-h-[460px] overflow-hidden rounded-3xl bg-[#0d0d11] text-white shadow-2xl border border-white/10 sm:min-h-[500px]">
      {/* Background glow radial effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#0284c7]/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-amber-500/15 blur-[120px]" />

      {/* Dynamic Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative z-10 flex min-h-[460px] max-w-4xl flex-col justify-center px-6 py-12 sm:min-h-[500px] sm:px-12 sm:py-16 lg:px-16">
        {/* Shimmer Badge */}
        <div className="mb-5 inline-flex w-fit items-center gap-2.5 rounded-full border border-[#0284c7]/40 bg-[#0284c7]/10 px-4 py-1.5 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0284c7] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0284c7]" />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[#38bdf8]" />
          <span className="text-xs font-black uppercase tracking-wider text-[#38bdf8]">
            Le Magazine AQ8 & Expertise
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Conseils, Science & <br />
          <span className="bg-gradient-to-r from-[#38bdf8] via-[#0284c7] to-amber-300 bg-clip-text text-transparent">
            Actualités AQ8 Algérie
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 max-w-2xl text-base font-normal leading-relaxed text-slate-300 sm:text-lg">
          Le magazine officiel pour comprendre les technologies <strong className="text-white font-semibold">AQ8 EMS</strong> et <strong className="text-white font-semibold">Wonder Axion</strong>, optimiser vos entraînements, votre nutrition et suivre la vie de nos centres.
        </p>

        {/* Key Pillars Ticker */}
        <div className="mt-8 flex flex-wrap gap-2.5 sm:gap-3 text-xs font-semibold text-slate-300">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>20 min = 4h de sport</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            <Activity className="h-3.5 w-3.5 text-[#0284c7]" />
            <span>+350 muscles stimulés</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>98% satisfaction</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Encadrement certifié</span>
          </div>
        </div>

        {/* Primary Hero Actions */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="#magazine-aq8"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0284c7]/30 transition-all hover:scale-[1.02] hover:shadow-[#0284c7]/50"
          >
            <span>Explorer les conseils</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <Link
            href="/reservation"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40"
          >
            <CalendarDays className="h-4 w-4 text-amber-300" />
            <span>Réserver une séance</span>
          </Link>
        </div>
      </div>


      {/* Decorative Floating Card Overlay on Desktop */}
      <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 w-80 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284c7] to-amber-500 text-white font-black text-sm">
            AQ8
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Focus Réseau Algérie</h4>
            <p className="text-xs text-slate-300">6 Centres à votre service</p>
          </div>
        </div>
        <div className="mt-4 space-y-2.5 text-xs text-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Alger (3 centres)</span>
            <span className="font-semibold text-emerald-400">Ouverts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Blida & Tlemcen</span>
            <span className="font-semibold text-emerald-400">Ouverts</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-amber-300 font-medium">
            <span>✨ Bilan corporel personnalisé offert</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Category Highlights Cards Row
function CategoryExplorer({
  selectedCategory,
  onSelectCategory
}: {
  selectedCategory: BlogCategory | "all";
  onSelectCategory: (cat: BlogCategory | "all") => void;
}) {
  const categories: { id: BlogCategory | "all"; label: string; icon: string; desc: string; count?: string }[] = [
    { id: "all", label: "Toutes les publications", icon: "💎", desc: "Conseils, offres et guides" },
    { id: "aq8-ems", label: "AQ8 EMS", icon: "⚡", desc: "Électrostimulation globale 20min" },
    { id: "wonder", label: "Wonder Axion", icon: "🔥", desc: "Remodelage musculaire ciblé" },
    { id: "bien-etre", label: "Santé & Dos", icon: "🌿", desc: "Postures, lombaires & bien-être" },
    { id: "conseils", label: "Conseils Pratiques", icon: "💡", desc: "Alimentation & préparation" },
    { id: "actualites", label: "Vie du Réseau", icon: "📢", desc: "Nouveautés & évènements" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[#242424]">
          <Layers className="h-5 w-5 text-[#0284c7]" />
          Thématiques & Formats
        </h2>
        <span className="text-xs font-bold text-slate-400">Cliquez pour filtrer</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`group relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 ${
                isSelected
                  ? "bg-gradient-to-br from-[#242424] to-[#161618] text-white shadow-xl shadow-black/10 ring-2 ring-[#0284c7]"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50/30 hover:shadow-md"
              }`}
            >
              <div>
                <span className="text-2xl">{cat.icon}</span>
                <h3 className={`mt-2 text-xs font-bold leading-snug ${isSelected ? "text-white" : "text-[#242424]"}`}>
                  {cat.label}
                </h3>
              </div>
              <p className={`mt-1 text-[10px] leading-tight ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                {cat.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Quick Article Preview Modal
function ArticlePreviewModal({
  post,
  onClose
}: {
  post: BlogPost | null;
  onClose: () => void;
}) {
  if (!post) return null;
  const TypeIcon = TYPE_ICONS[post.publicationType];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-100"
        >
          {/* Header Cover */}
          <div className="relative h-64 w-full overflow-hidden bg-slate-900 sm:h-72">
            <img
              src={post.coverImageUrl}
              alt={post.coverImageAlt}
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md transition hover:bg-slate-900"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Floating Info */}
            <div className="absolute bottom-4 left-6 right-6">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase text-white">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0284c7] px-3 py-1 text-white shadow-md">
                  <TypeIcon className="h-3 w-3" />
                  {getBlogPublicationTypeLabel(post.publicationType)}
                </span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-white backdrop-blur-md">
                  {getBlogCategoryLabel(post.category)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-slate-200 backdrop-blur-md">
                  <Clock3 className="h-3 w-3 text-amber-300" />
                  {post.readingTimeMinutes} min
                </span>
              </div>
              <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl leading-tight">
                {post.title}
              </h2>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-xs font-extrabold uppercase text-[#0284c7] tracking-wider">Résumé & Aperçu</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-700 font-medium">
                {post.excerpt}
              </p>
            </div>

            {/* Key Content Blocks */}
            <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5 space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-[#242424] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#0284c7]" />
                Points clés à retenir
              </h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-700">
                {post.content.slice(0, 4).map((block, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0284c7]" />
                    <span>{block.text || block.items?.[0] || "Conseil expert AQ8"}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Author info & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <div>
                <p className="text-xs font-bold text-[#242424]">{post.authorName}</p>
                <p className="text-[11px] text-slate-500">{post.authorRole}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Fermer
                </button>
                <Link
                  href={"/conseils/" + post.slug}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#0284c7]/20 transition hover:bg-[#0369a1]"
                >
                  <span>Lire l'article complet</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// VIP Insider Club & FAQ Section
function InsiderClubAndFaq() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  const faqs = [
    {
      q: "Combien de séances AQ8 EMS sont recommandées par semaine ?",
      a: "1 à 2 séances de 20 minutes par semaine suffisent largement. Étant donné l'intensité équivalente à 4h de sport traditionnel, le corps nécessite 48h de repos pour reconstruire la fibre musculaire."
    },
    {
      q: "Wonder Axion et AQ8 EMS : Peut-on combiner les deux ?",
      a: "Absolument ! C'est d'ailleurs notre Cure Combinée la plus populaire. L'EMS agit sur l'ensemble de la masse musculaire et du métabolisme, tandis que Wonder cible intensément les abdominaux et fessiers."
    },
    {
      q: "Quelle tenue dois-je apporter lors de mon rendez-vous ?",
      a: "Pour que les électrodes conduisent parfaitement le signal, prévoyez un haut à manches longues et un bas fin en coton d'entraînement, ainsi que des baskets propres d'intérieur."
    },
    {
      q: "Quelles sont les règles de réservation et d'annulation ?",
      a: "Les réservations s'effectuent au plus tard la veille avant 21h30. Vous pouvez annuler jusqu'à 1h avant votre séance sans pénalité pour préserver les crédits de votre forfait."
    }
  ];

  return (
    <div className="mt-16 space-y-12">
      {/* Insider VIP Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#18181c] via-[#242429] to-[#18181c] p-8 sm:p-12 text-white shadow-2xl border border-white/10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#0284c7]/20 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#38bdf8] tracking-wider">
              <Sparkles className="h-4 w-4" />
              Club VIP & Privilèges AQ8
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl leading-tight">
              Recevez nos conseils exclusifs & offres en avant-première
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Inscrivez-vous gratuitement pour recevoir nos guides nutrition, astuces récupération et les offres exclusives réservées aux membres du réseau AQ8 Algérie.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Guides nutrition offerts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Offres flash récurrentes
              </span>
            </div>
          </div>

          <div>
            {subscribed ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center backdrop-blur-md">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                <h4 className="mt-3 text-lg font-bold text-white">Merci pour votre inscription !</h4>
                <p className="mt-1 text-xs text-emerald-200">
                  Vous recevrez très prochainement nos premiers conseils dans votre boîte mail.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email (ex: yasmine@gmail.com)"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm font-medium text-white placeholder-slate-400 backdrop-blur-md outline-none transition focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/30"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0284c7] px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#0284c7]/30 transition hover:bg-[#0369a1]"
                >
                  <Send className="h-4 w-4" />
                  <span>S'inscrire gratuitement</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Accordion */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-black uppercase text-[#0284c7] tracking-wider">Expertise & Réponses</span>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#242424] sm:text-3xl">
              Questions Fréquentes avant votre Séance
            </h2>
          </div>
          <HelpCircle className="h-8 w-8 text-[#0284c7] opacity-80 hidden sm:block" />
        </div>

        <div className="mt-6 divide-y divide-slate-100">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between text-left text-base font-bold text-[#242424] transition hover:text-[#0284c7]"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-[#0284c7]" : ""}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-sm leading-relaxed text-slate-600 font-medium">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// MAIN COMPONENT
export function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  const [publicationType, setPublicationType] = useState<"all" | BlogPublicationType>("all");
  const [category, setCategory] = useState<"all" | BlogCategory>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "reading">("latest");
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = posts.filter((post) => {
      const matchesType = publicationType === "all" || post.publicationType === publicationType;
      const matchesCategory = category === "all" || post.category === category;
      const matchesSearch =
        !term ||
        post.title.toLowerCase().includes(term) ||
        post.excerpt.toLowerCase().includes(term) ||
        post.tags.some((tag) => tag.toLowerCase().includes(term));
      return matchesType && matchesCategory && matchesSearch;
    });

    if (sortBy === "reading") {
      result = [...result].sort((a, b) => a.readingTimeMinutes - b.readingTimeMinutes);
    }

    return result;
  }, [posts, publicationType, category, search, sortBy]);

  const featured = useMemo(() => {
    return posts.find((post) => post.featured) || posts[0];
  }, [posts]);

  const remainingPosts = useMemo(() => {
    return filteredPosts.filter((post) => post.id !== featured?.id);
  }, [filteredPosts, featured]);

  const FeaturedIcon = featured ? TYPE_ICONS[featured.publicationType] : BookOpen;

  return (
    <div className="space-y-12 pb-12" suppressHydrationWarning>
      {/* 1. Hero Header */}

      <BlogHero onSelectCategory={(cat) => setCategory(cat)} />

      {/* 2. Category Explorer */}
      <CategoryExplorer
        selectedCategory={category}
        onSelectCategory={(cat) => setCategory(cat)}
      />

      {/* 3. Featured Spotlight Article */}
      {featured && (
        <section id="magazine-aq8" className="scroll-mt-28 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl transition-all hover:shadow-2xl">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-1 text-xs font-black uppercase text-[#0284c7]">
                  <FeaturedIcon className="h-3.5 w-3.5" />
                  {"À la une · " + getBlogPublicationTypeLabel(featured.publicationType)}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {getBlogCategoryLabel(featured.category)}
                </span>
              </div>

              <Link href={"/conseils/" + featured.slug} className="group">
                <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] transition group-hover:text-[#0284c7] sm:text-4xl">
                  {featured.title}
                </h2>
              </Link>

              <p className="mt-4 line-clamp-3 text-base leading-relaxed text-slate-600 font-medium">
                {featured.excerpt}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-[#0284c7]" />
                  {getTimingLabel(featured)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                  {featured.readingTimeMinutes} min de lecture
                </span>
                <span>Par {featured.authorName}</span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={"/conseils/" + featured.slug}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#242424] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0284c7]"
                >
                  <span>Lire l'article</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewPost(featured)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  <Eye className="h-4 w-4 text-[#0284c7]" />
                  <span>Aperçu rapide</span>
                </button>
              </div>
            </div>

            <Link href={"/conseils/" + featured.slug} className="relative min-h-[320px] overflow-hidden lg:min-h-[460px]">
              <img
                src={featured.coverImageUrl}
                alt={featured.coverImageAlt}
                className="h-full w-full object-cover transition duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
            </Link>
          </div>
        </section>
      )}

      {/* 4. Search, Formats & Filter Suite */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-xs font-black uppercase text-[#0284c7] tracking-wider">Tous les articles</span>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#242424] sm:text-3xl">
              Catalogue Magazine ({filteredPosts.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (ex: électrostimulation, dos...)"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-semibold text-[#242424] outline-none transition focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "latest" | "reading")}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0284c7]"
            >
              <option value="latest">Récents d'abord</option>
              <option value="reading">Lecture rapide</option>
            </select>
          </div>
        </div>

        {/* Publication Format Tabs */}
        <div className="flex overflow-x-auto gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5">
          <button
            type="button"
            onClick={() => setPublicationType("all")}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              publicationType === "all"
                ? "bg-white text-[#242424] shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tous les formats
          </button>
          {BLOG_PUBLICATION_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPublicationType(item.id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                publicationType === item.id
                  ? "bg-white text-[#242424] shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.pluralLabel}
            </button>
          ))}
        </div>

        {/* Article Cards Grid */}
        {remainingPosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-3 font-display text-base font-bold text-[#242424]">
              {posts.length === 1 ? "Article à la une disponible ci-dessus" : "Aucun autre article trouvé"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {posts.length === 1
                ? "Découvrez la publication principale du réseau mise en valeur dans la section à la une."
                : "Essayez de réinitialiser vos filtres ou de modifier votre recherche."}
            </p>
            {posts.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPublicationType("all");
                  setCategory("all");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#242424] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0284c7]"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {remainingPosts.map((post) => {
              const TypeIcon = TYPE_ICONS[post.publicationType];
              return (
                <article
                  key={post.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:border-[#0284c7]/40 hover:shadow-xl"
                >

                  <div>
                    {/* Cover & Badges */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-bold text-white">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0284c7] px-3 py-1 text-white shadow-md">
                          <TypeIcon className="h-3 w-3" />
                          {getBlogPublicationTypeLabel(post.publicationType)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-slate-200 backdrop-blur-md">
                          <Clock3 className="h-3 w-3 text-amber-300" />
                          {post.readingTimeMinutes} min
                        </span>
                      </div>
                    </div>

                    {/* Article Body */}
                    <div className="p-6 space-y-3">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">
                        {getBlogCategoryLabel(post.category)}
                      </span>
                      <Link href={"/conseils/" + post.slug}>
                        <h3 className="line-clamp-2 font-display text-xl font-bold leading-snug text-[#242424] transition group-hover:text-[#0284c7]">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="line-clamp-3 text-xs leading-relaxed text-slate-600 font-medium">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="border-t border-slate-100 p-6 pt-4 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">{getTimingLabel(post)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewPost(post)}
                        title="Aperçu rapide"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-rose-50 hover:text-[#0284c7]"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Link
                        href={"/conseils/" + post.slug}
                        className="inline-flex items-center gap-1 font-bold text-[#242424] transition group-hover:text-[#0284c7]"
                      >
                        <span>Lire</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );

            })}
          </div>
        )}
      </section>

      {/* 5. Insider Club & FAQ Section */}
      <InsiderClubAndFaq />

      {/* 6. Quick Preview Modal */}
      <ArticlePreviewModal post={previewPost} onClose={() => setPreviewPost(null)} />
    </div>
  );
}
