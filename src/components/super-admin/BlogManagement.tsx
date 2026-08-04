import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { BlogArticleContent } from '../../../components/blog/BlogArticleContent';
import type { Center } from '../../types';
import {
  BLOG_PUBLICATION_TYPES,
  createAutomaticBlogExcerpt,
  createBlogBlock,
  createEmptyBlogDraft,
  estimateBlogReadingTime,
  getBlogCategoryLabel,
  getBlogPublicationType,
  getBlogPublicationTypeLabel,
  normalizeStoredBlogPost,
  slugifyBlogTitle,
  type BlogBlockType,
  type BlogContentBlock,
  type BlogPost,
  type BlogPostDraft,
  type BlogPostStatus,
  type BlogPublicationType,
} from '../../lib/blog';
import {
  createBlogPost,
  deleteBlogPost,
  listBlogPosts,
  updateBlogPost,
  uploadBlogImage,
} from '../../lib/blogClient';
import { ProfessionalToast, type ProfessionalToastState } from '../manager/ProfessionalToast';
import { ProfessionalConfirmDialog } from '../manager/ProfessionalConfirmDialog';
import { SimpleBlogEditor } from './SimpleBlogEditor';

type StatusFilter = 'all' | BlogPostStatus;
type TypeFilter = 'all' | BlogPublicationType;
type EditorMode = 'edit' | 'preview';

const STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
  archived: 'Archivé',
};

const TYPE_ICONS = {
  article: BookOpen,
  promotion: Tag,
  news: Megaphone,
  event: CalendarDays,
} as const;

function toDraft(source: BlogPost): BlogPostDraft {
  const post = normalizeStoredBlogPost(source);
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    publicationType: post.publicationType,
    category: post.category,
    tags: post.tags || [],
    targetCenterIds: post.targetCenterIds,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    authorName: post.authorName,
    authorRole: post.authorRole,
    reviewerName: post.reviewerName,
    content: post.content || [],
    ctaLabel: post.ctaLabel,
    ctaUrl: post.ctaUrl,
    startsAt: post.startsAt,
    endsAt: post.endsAt,
    location: post.location,
    scheduledAt: post.scheduledAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    status: post.status,
    featured: post.featured,
    publishedAt: post.publishedAt,
  };
}

function formatDate(value?: string | null, withTime = false): string {
  if (!value) return 'Non publié';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date invalide';
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function statusClasses(status: BlogPostStatus): string {
  if (status === 'published') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'scheduled') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function hasFutureSchedule(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date > new Date();
}

export function BlogManagement({ centers }: { centers: Center[] }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BlogPostDraft>(createEmptyBlogDraft());
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [pendingDelete, setPendingDelete] = useState<BlogPost | null>(null);
  const [toast, setToast] = useState<ProfessionalToastState | null>(null);

  const showToast = (
    message: string,
    type: ProfessionalToastState['type'] = 'success',
    title?: string,
  ) => {
    setToast({ message, type, title });
    window.setTimeout(() => setToast(null), 4400);
  };

  const refreshPosts = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setPosts((await listBlogPosts()).map(normalizeStoredBlogPost));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Chargement éditorial impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter(post => {
      const matchesSearch = !term
        || post.title.toLowerCase().includes(term)
        || post.excerpt.toLowerCase().includes(term)
        || post.tags.some(tag => tag.toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesType = typeFilter === 'all' || post.publicationType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [posts, search, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: posts.length,
    published: posts.filter(post => post.status === 'published').length,
    scheduled: posts.filter(post => post.status === 'scheduled').length,
    drafts: posts.filter(post => post.status === 'draft').length,
  }), [posts]);

  const automaticExcerpt = createAutomaticBlogExcerpt(draft);
  const completedContent = draft.content.filter(block => (
    block.type === 'image' ? block.imageUrl : block.text || block.items?.some(Boolean)
  ));
  const publicationChecks = useMemo(() => {
    const checks = [
      { label: 'Titre clair', ok: draft.title.trim().length >= 8 },
      { label: 'Résumé complet', ok: automaticExcerpt.length >= 80 },
      { label: 'Image principale', ok: Boolean(draft.coverImageUrl) },
      { label: 'Contenu structuré', ok: completedContent.length >= 2 },
    ];
    if (draft.publicationType === 'event') {
      checks.push({ label: 'Date de début', ok: Boolean(draft.startsAt) });
    }
    if (draft.publicationType === 'promotion' || draft.publicationType === 'event') {
      checks.push({ label: 'Date de fin', ok: Boolean(draft.endsAt) });
    }
    return checks;
  }, [
    automaticExcerpt.length,
    completedContent.length,
    draft.coverImageUrl,
    draft.endsAt,
    draft.publicationType,
    draft.startsAt,
    draft.title,
  ]);
  const readyForPublication = publicationChecks.every(item => item.ok);
  const estimatedReadingTime = estimateBlogReadingTime(draft.content);
  const willSchedule = hasFutureSchedule(draft.scheduledAt);

  const openNewEditor = (publicationType: BlogPublicationType = 'article') => {
    setEditingId(null);
    setDraft(createEmptyBlogDraft(publicationType));
    setSlugManuallyEdited(false);
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const openEditor = (post: BlogPost) => {
    setEditingId(post.id);
    setDraft(toDraft(post));
    setSlugManuallyEdited(true);
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const updateDraft = <K extends keyof BlogPostDraft>(key: K, value: BlogPostDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const handleTitleChange = (title: string) => {
    setDraft(current => ({
      ...current,
      title,
      slug: slugManuallyEdited ? current.slug : slugifyBlogTitle(title),
      coverImageAlt: current.coverImageAlt || (title ? 'Illustration de ' + title : ''),
    }));
  };

  const handlePublicationTypeChange = (publicationType: BlogPublicationType) => {
    setDraft(current => {
      const previous = getBlogPublicationType(current.publicationType);
      const next = getBlogPublicationType(publicationType);
      return {
        ...current,
        publicationType,
        category: publicationType === 'news' || publicationType === 'event'
          ? 'actualites'
          : current.category,
        ctaLabel: !current.ctaLabel || current.ctaLabel === previous.defaultCtaLabel
          ? next.defaultCtaLabel
          : current.ctaLabel,
      };
    });
  };

  const updateBlock = (id: string, patch: Partial<BlogContentBlock>) => {
    setDraft(current => ({
      ...current,
      content: current.content.map(block => block.id === id ? { ...block, ...patch } : block),
    }));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.content.length) return;
    const content = [...draft.content];
    [content[index], content[target]] = [content[target], content[index]];
    updateDraft('content', content);
  };

  const removeBlock = (id: string) => {
    updateDraft('content', draft.content.filter(block => block.id !== id));
  };

  const addBlock = (type: BlogBlockType) => {
    updateDraft('content', [...draft.content, createBlogBlock(type)]);
  };

  const handleCoverUpload = async (file?: File) => {
    if (!file) return;
    setUploading('cover');
    try {
      const url = await uploadBlogImage(editingId || 'draft-' + Date.now(), file, 'cover');
      setDraft(current => ({
        ...current,
        coverImageUrl: url,
        coverImageAlt: current.coverImageAlt || (current.title ? 'Illustration de ' + current.title : 'Publication AQ8 Algérie'),
      }));
      showToast('L’image principale est prête.', 'success', 'Image ajoutée');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Téléversement impossible.', 'error', 'Image refusée');
    } finally {
      setUploading('');
    }
  };

  const handleBlockImageUpload = async (blockId: string, file?: File) => {
    if (!file) return;
    setUploading(blockId);
    try {
      const url = await uploadBlogImage(editingId || 'draft-' + Date.now(), file, 'content');
      updateBlock(blockId, {
        imageUrl: url,
        imageAlt: draft.title ? 'Illustration de ' + draft.title : 'Publication AQ8 Algérie',
      });
      showToast('L’image a été ajoutée au contenu.', 'success', 'Image insérée');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Téléversement impossible.', 'error', 'Image refusée');
    } finally {
      setUploading('');
    }
  };

  const savePublication = async (status: BlogPostStatus, closeAfter = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const payload: BlogPostDraft = {
        ...draft,
        excerpt: automaticExcerpt,
        status,
      };
      const saved = editingId
        ? await updateBlogPost(editingId, payload)
        : await createBlogPost(payload);
      const normalized = normalizeStoredBlogPost(saved);
      setEditingId(normalized.id);
      setDraft(toDraft(normalized));
      setSlugManuallyEdited(true);
      setPosts(current => {
        const exists = current.some(post => post.id === normalized.id);
        const next = exists
          ? current.map(post => post.id === normalized.id ? normalized : post)
          : [normalized, ...current];
        return next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      });

      const typeLabel = getBlogPublicationTypeLabel(normalized.publicationType);
      showToast(
        status === 'published'
          ? typeLabel + ' visible sur le site public.'
          : status === 'scheduled'
            ? typeLabel + ' programmé pour le ' + formatDate(normalized.scheduledAt, true) + '.'
            : status === 'archived'
              ? typeLabel + ' retiré du site public.'
              : 'Le brouillon a été enregistré.',
        'success',
        status === 'published'
          ? 'Publication réussie'
          : status === 'scheduled'
            ? 'Publication planifiée'
            : status === 'archived'
              ? 'Contenu archivé'
              : 'Brouillon enregistré',
      );
      if (closeAfter) setEditorOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Enregistrement impossible.', 'error', 'Contenu non enregistré');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || busy) return;
    setBusy(true);
    try {
      await deleteBlogPost(pendingDelete.id);
      setPosts(current => current.filter(post => post.id !== pendingDelete.id));
      setPendingDelete(null);
      showToast('Le contenu a été supprimé définitivement.', 'success', 'Contenu supprimé');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Suppression impossible.', 'error', 'Contenu conservé');
    } finally {
      setBusy(false);
    }
  };

  const primaryStatus: BlogPostStatus = willSchedule ? 'scheduled' : 'published';

  return (
    <div className="space-y-6">
      <ProfessionalToast toast={toast} onDismiss={() => setToast(null)} id="blog-admin-toast" />
      <ProfessionalConfirmDialog
        open={Boolean(pendingDelete)}
        title="Supprimer définitivement ce contenu ?"
        description={'« ' + (pendingDelete?.title || '') + ' » ne sera plus accessible.'}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Conserver"
        tone="danger"
        loading={busy}
        id="blog-delete-dialog"
        onCancel={() => !busy && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase text-[#ff5757]">
            <Sparkles className="h-3.5 w-3.5" />
            Pôle éditorial
          </div>
          <h2 className="font-display text-2xl font-bold text-[#242424]">Magazine & actualités</h2>
          <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
            Conseils, promotions, informations et événements du réseau AQ8.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewEditor()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5757] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#e94949]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle publication
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Contenus', value: stats.total, icon: FileText, tone: 'text-slate-700 bg-slate-100' },
          { label: 'Publiés', value: stats.published, icon: Check, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'Planifiés', value: stats.scheduled, icon: CalendarDays, tone: 'text-sky-700 bg-sky-50' },
          { label: 'Brouillons', value: stats.drafts, icon: Edit3, tone: 'text-amber-700 bg-amber-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
              <span className={'flex h-9 w-9 items-center justify-center rounded-md ' + item.tone}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <strong className="block text-xl font-bold text-[#242424]">{item.value}</strong>
                <span className="text-[10px] font-bold uppercase text-slate-400">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_190px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher un contenu"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium outline-none transition focus:border-[#ff5757]"
            />
          </label>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as StatusFilter)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-[#ff5757]"
          >
            <option value="all">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="scheduled">Planifiés</option>
            <option value="draft">Brouillons</option>
            <option value="archived">Archivés</option>
          </select>
          <select
            value={typeFilter}
            onChange={event => setTypeFilter(event.target.value as TypeFilter)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-[#ff5757]"
          >
            <option value="all">Tous les formats</option>
            {BLOG_PUBLICATION_TYPES.map(type => (
              <option key={type.id} value={type.id}>{type.pluralLabel}</option>
            ))}
          </select>
        </div>

        {loadError && (
          <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            {loadError}
            <button type="button" onClick={refreshPosts} className="ml-3 underline">Réessayer</button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 border border-slate-200 bg-white text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#ff5757]" />
            Chargement de la rédaction...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 text-center">
            <BookOpen className="mb-4 h-9 w-9 text-[#ff5757]" />
            <h3 className="font-display text-base font-bold text-[#242424]">
              {posts.length === 0 ? 'Votre espace éditorial est prêt' : 'Aucun contenu ne correspond aux filtres'}
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              {posts.length === 0
                ? 'Créez le premier contenu public du réseau AQ8.'
                : 'Modifiez la recherche ou les filtres.'}
            </p>
            {posts.length === 0 && (
              <button type="button" onClick={() => openNewEditor()} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#ff5757]">
                <Plus className="h-4 w-4" />
                Créer une publication
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_130px_120px_120px_110px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[9px] font-extrabold uppercase text-slate-400 md:grid">
              <span>Publication</span>
              <span>Format</span>
              <span>Statut</span>
              <span>Diffusion</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredPosts.map(post => {
                const TypeIcon = TYPE_ICONS[post.publicationType];
                const diffusionDate = post.status === 'scheduled' ? post.scheduledAt : post.updatedAt;
                return (
                  <article
                    key={post.id}
                    className="grid gap-3 px-4 py-4 transition hover:bg-slate-50/70 md:grid-cols-[minmax(0,1fr)_130px_120px_120px_110px] md:items-center md:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
                        {post.coverImageUrl ? (
                          <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-300" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-xs font-bold text-[#242424]">{post.title}</h3>
                        <p className="mt-1 truncate text-[10px] font-medium text-slate-400">{getBlogCategoryLabel(post.category)}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {post.readingTimeMinutes} min
                          {post.featured && <span className="font-bold text-[#ff5757]">• À la une</span>}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <TypeIcon className="h-3.5 w-3.5 text-[#ff5757]" />
                      {getBlogPublicationTypeLabel(post.publicationType)}
                    </span>
                    <span className={'w-fit rounded-full border px-2.5 py-1 text-[9px] font-extrabold ' + statusClasses(post.status)}>
                      {STATUS_LABELS[post.status]}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">{formatDate(diffusionDate, post.status === 'scheduled')}</span>
                    <div className="flex justify-end gap-1">
                      {post.status === 'published' && (
                        <a
                          href={'/conseils/' + post.slug}
                          target="_blank"
                          rel="noreferrer"
                          title="Voir sur le site public"
                          className="rounded-md p-2 text-slate-400 transition hover:bg-white hover:text-[#ff5757]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditor(post)}
                        title="Modifier"
                        className="rounded-md p-2 text-slate-400 transition hover:bg-white hover:text-[#242424]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {post.status !== 'published' && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(post)}
                          title="Supprimer"
                          className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f6f7f9]">
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => !busy && setEditorOpen(false)}
                aria-label="Fermer l’éditeur"
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="hidden min-w-0 sm:block">
                <h2 className="truncate text-sm font-bold text-[#242424]">{draft.title || 'Nouvelle publication'}</h2>
                <p className="text-[10px] font-medium text-slate-400">
                  {getBlogPublicationTypeLabel(draft.publicationType)} • {estimatedReadingTime} min de lecture
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setEditorMode(current => current === 'edit' ? 'preview' : 'edit')}
                aria-label={editorMode === 'edit' ? 'Afficher l’aperçu' : 'Revenir à la rédaction'}
                title={editorMode === 'edit' ? 'Aperçu' : 'Rédaction'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300"
              >
                {editorMode === 'edit' ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </button>
              {(draft.status === 'published' || draft.status === 'scheduled') && (
                <button
                  type="button"
                  onClick={() => void savePublication('archived', true)}
                  disabled={busy}
                  aria-label="Archiver"
                  title="Archiver et retirer du site"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void savePublication('draft')}
                disabled={busy}
                aria-label="Enregistrer le brouillon"
                title="Enregistrer le brouillon"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 disabled:opacity-50 sm:w-auto sm:gap-2 sm:px-4"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-bold">Enregistrer</span>
              </button>
              <button
                type="button"
                onClick={() => void savePublication(primaryStatus)}
                disabled={busy || !readyForPublication}
                title={readyForPublication ? (willSchedule ? 'Programmer la publication' : 'Publier maintenant') : 'Complétez la checklist'}
                className="inline-flex min-w-24 items-center justify-center gap-2 rounded-md bg-[#ff5757] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#e94949] disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-28 sm:px-4"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {willSchedule ? 'Planifier' : 'Publier'}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {editorMode === 'edit' ? (
              <SimpleBlogEditor
                draft={draft}
                centers={centers}
                uploading={uploading}
                publicationChecks={publicationChecks}
                onTitleChange={handleTitleChange}
                onPublicationTypeChange={handlePublicationTypeChange}
                onDraftChange={updateDraft}
                onUpdateBlock={updateBlock}
                onMoveBlock={moveBlock}
                onRemoveBlock={removeBlock}
                onAddBlock={addBlock}
                onCoverUpload={handleCoverUpload}
                onBlockImageUpload={handleBlockImageUpload}
              />
            ) : (
              <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {draft.coverImageUrl ? (
                    <img src={draft.coverImageUrl} alt={draft.coverImageAlt} className="aspect-[16/8] w-full bg-slate-100 object-cover" />
                  ) : (
                    <div className="flex aspect-[16/6] items-center justify-center bg-slate-100"><ImageIcon className="h-8 w-8 text-slate-300" /></div>
                  )}
                  <div className="px-5 py-8 sm:px-10">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase text-[#ff5757]">
                      <span>{getBlogPublicationTypeLabel(draft.publicationType)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{getBlogCategoryLabel(draft.category)}</span>
                    </div>
                    <h1 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-5xl">{draft.title || 'Titre de la publication'}</h1>
                    <p className="mt-5 text-base leading-7 text-slate-600">{automaticExcerpt || 'Le résumé apparaîtra ici.'}</p>
                    <div className="my-8 border-t border-slate-100" />
                    <BlogArticleContent blocks={draft.content} />
                  </div>
                </article>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
