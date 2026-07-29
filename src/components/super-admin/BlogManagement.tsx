import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignLeft,
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Clock3,
  Edit3,
  ExternalLink,
  FileText,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  List,
  Loader2,
  MessageSquareQuote,
  Plus,
  Search,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { BlogArticleContent } from '../../../components/blog/BlogArticleContent';
import {
  BLOG_CATEGORIES,
  createBlogBlock,
  createEmptyBlogDraft,
  estimateBlogReadingTime,
  getBlogCategoryLabel,
  slugifyBlogTitle,
  type BlogBlockType,
  type BlogContentBlock,
  type BlogPost,
  type BlogPostDraft,
  type BlogPostStatus,
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

type EditorTab = 'content' | 'seo' | 'publication' | 'preview';
type StatusFilter = 'all' | BlogPostStatus;

const STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
};

const BLOCK_ACTIONS: Array<{ type: BlogBlockType; label: string; icon: typeof AlignLeft }> = [
  { type: 'paragraph', label: 'Paragraphe', icon: AlignLeft },
  { type: 'heading', label: 'Titre H2', icon: Heading2 },
  { type: 'subheading', label: 'Titre H3', icon: Heading3 },
  { type: 'bullets', label: 'Liste', icon: List },
  { type: 'quote', label: 'Citation', icon: MessageSquareQuote },
  { type: 'callout', label: 'Encadré', icon: Info },
  { type: 'image', label: 'Image', icon: ImageIcon },
];

function toDraft(post: BlogPost): BlogPostDraft {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags || [],
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    authorName: post.authorName,
    authorRole: post.authorRole,
    reviewerName: post.reviewerName,
    content: post.content || [],
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    status: post.status,
    featured: post.featured,
    publishedAt: post.publishedAt,
  };
}

function formatDate(value?: string | null): string {
  if (!value) return 'Non publié';
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function statusClasses(status: BlogPostStatus): string {
  if (status === 'published') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('content');
  const [simpleEditor, setSimpleEditor] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BlogPostDraft>(createEmptyBlogDraft());
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [pendingDelete, setPendingDelete] = useState<BlogPost | null>(null);
  const [toast, setToast] = useState<ProfessionalToastState | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
      setPosts(await listBlogPosts());
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
        || post.tags.some(tag => tag.toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, posts, search, statusFilter]);

  const stats = useMemo(() => ({
    total: posts.length,
    published: posts.filter(post => post.status === 'published').length,
    drafts: posts.filter(post => post.status === 'draft').length,
    featured: posts.filter(post => post.status === 'published' && post.featured).length,
  }), [posts]);

  const publicationChecks = useMemo(() => [
    { label: 'Titre éditorial', ok: draft.title.trim().length >= 8 },
    { label: 'Résumé de 80 caractères', ok: draft.excerpt.trim().length >= 80 },
    { label: 'Image de couverture', ok: Boolean(draft.coverImageUrl) },
    { label: 'Texte alternatif', ok: Boolean(draft.coverImageAlt.trim()) },
    { label: 'Au moins deux blocs', ok: draft.content.filter(block => block.type === 'image' ? block.imageUrl : block.text || block.items?.some(Boolean)).length >= 2 },
    { label: 'Auteur identifié', ok: Boolean(draft.authorName.trim()) },
    { label: 'Description SEO', ok: draft.seoDescription.trim().length >= 120 },
  ], [draft]);
  const readyForPublication = publicationChecks.slice(0, 6).every(item => item.ok);
  const estimatedReadingTime = estimateBlogReadingTime(draft.content);

  const openNewEditor = () => {
    setEditingId(null);
    setDraft(createEmptyBlogDraft());
    setSlugManuallyEdited(false);
    setEditorTab('content');
    setSimpleEditor(true);
    setEditorOpen(true);
  };

  const openEditor = (post: BlogPost) => {
    setEditingId(post.id);
    setDraft(toDraft(post));
    setSlugManuallyEdited(true);
    setEditorTab('content');
    setSimpleEditor(true);
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
      seoTitle: editingId ? current.seoTitle : title.slice(0, 70),
    }));
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
      const url = await uploadBlogImage(editingId || `draft-${Date.now()}`, file, 'cover');
      updateDraft('coverImageUrl', url);
      showToast('L’image de couverture est prête pour la publication.', 'success', 'Image ajoutée');
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
      const url = await uploadBlogImage(editingId || `draft-${Date.now()}`, file, 'content');
      updateBlock(blockId, { imageUrl: url });
      showToast('L’image a été ajoutée au contenu.', 'success', 'Image insérée');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Téléversement impossible.', 'error', 'Image refusée');
    } finally {
      setUploading('');
    }
  };

  const saveArticle = async (status: BlogPostStatus, closeAfter = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        ...draft,
        status,
        seoTitle: draft.seoTitle || draft.title.slice(0, 70),
        seoDescription: draft.seoDescription || draft.excerpt.slice(0, 170),
      };
      const saved = editingId
        ? await updateBlogPost(editingId, payload)
        : await createBlogPost(payload);
      setEditingId(saved.id);
      setDraft(toDraft(saved));
      setSlugManuallyEdited(true);
      setPosts(current => {
        const exists = current.some(post => post.id === saved.id);
        const next = exists
          ? current.map(post => post.id === saved.id ? saved : post)
          : [saved, ...current];
        return next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      });
      showToast(
        status === 'published'
          ? 'L’article est maintenant visible sur le site public.'
          : status === 'archived'
            ? 'L’article a été archivé et retiré du site public.'
            : 'Le brouillon a été enregistré.',
        'success',
        status === 'published' ? 'Article publié' : status === 'archived' ? 'Article archivé' : 'Brouillon enregistré',
      );
      if (closeAfter) setEditorOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Enregistrement impossible.', 'error', 'Article non enregistré');
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
      showToast('L’article a été supprimé définitivement.', 'success', 'Article supprimé');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Suppression impossible.', 'error', 'Article conservé');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <ProfessionalToast toast={toast} onDismiss={() => setToast(null)} id="blog-admin-toast" />
      <ProfessionalConfirmDialog
        open={Boolean(pendingDelete)}
        title="Supprimer définitivement cet article ?"
        description={`« ${pendingDelete?.title || ''} » et son historique éditorial ne seront plus accessibles. Les images déjà téléversées restent conservées dans Storage.`}
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
          <h2 className="font-display text-2xl font-bold text-[#242424]">Conseils & actualités</h2>
          <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
            Préparez, relisez et publiez les contenus qui accompagnent les clients avant leur réservation.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewEditor}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5757] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#e94949]"
        >
          <Plus className="h-4 w-4" />
          Nouvel article
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Articles', value: stats.total, icon: FileText, tone: 'text-slate-700 bg-slate-100' },
          { label: 'Publiés', value: stats.published, icon: Check, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'Brouillons', value: stats.drafts, icon: Edit3, tone: 'text-amber-700 bg-amber-50' },
          { label: 'À la une', value: stats.featured, icon: Sparkles, tone: 'text-[#ff5757] bg-rose-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}>
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
        <div className="grid gap-3 md:grid-cols-[1fr_180px_210px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher par titre ou mot-clé"
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
            <option value="draft">Brouillons</option>
            <option value="archived">Archivés</option>
          </select>
          <select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-[#ff5757]"
          >
            <option value="all">Toutes les catégories</option>
            {BLOG_CATEGORIES.map(category => (
              <option key={category.id} value={category.id}>{category.label}</option>
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
              {posts.length === 0 ? 'Votre espace éditorial est prêt' : 'Aucun article ne correspond aux filtres'}
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              {posts.length === 0
                ? 'Créez votre premier brouillon, ajoutez une image, effectuez la relecture SEO puis publiez-le.'
                : 'Modifiez la recherche ou les filtres pour retrouver un article.'}
            </p>
            {posts.length === 0 && (
              <button type="button" onClick={openNewEditor} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#ff5757]">
                <Plus className="h-4 w-4" />
                Commencer un article
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_120px_120px_110px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[9px] font-extrabold uppercase text-slate-400 md:grid">
              <span>Article</span>
              <span>Catégorie</span>
              <span>Statut</span>
              <span>Mise à jour</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredPosts.map(post => (
                <article
                  key={post.id}
                  className="grid gap-3 px-4 py-4 transition hover:bg-slate-50/70 md:grid-cols-[minmax(0,1fr)_150px_120px_120px_110px] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-20 shrink-0 overflow-hidden bg-slate-100">
                      {post.coverImageUrl ? (
                        <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-300" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-bold text-[#242424]">{post.title}</h3>
                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">/conseils/{post.slug}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400">
                        <Clock3 className="h-3 w-3" />
                        {post.readingTimeMinutes} min
                        {post.featured && <span className="font-bold text-[#ff5757]">• À la une</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">{getBlogCategoryLabel(post.category)}</span>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${statusClasses(post.status)}`}>
                    {STATUS_LABELS[post.status]}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">{formatDate(post.updatedAt)}</span>
                  <div className="flex justify-end gap-1">
                    {post.status === 'published' && (
                      <a
                        href={`/conseils/${post.slug}`}
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
                      title="Modifier l’article"
                      className="rounded-md p-2 text-slate-400 transition hover:bg-white hover:text-[#242424]"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {post.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(post)}
                        title="Supprimer l’article"
                        className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f6f7f9]">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => !busy && setEditorOpen(false)}
                aria-label="Fermer l’éditeur"
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-[#242424]">{draft.title || 'Nouvel article'}</h2>
                <p className="text-[10px] font-medium text-slate-400">
                  {draft.status === 'published' ? 'Article public' : 'Espace de rédaction'} • {estimatedReadingTime} min de lecture
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSimpleEditor(current => !current);
                  setEditorTab('content');
                }}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-[#242424] sm:px-3"
                title={simpleEditor ? 'Afficher les options avancées' : 'Revenir à la rédaction simple'}
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden lg:inline">{simpleEditor ? 'Options avancées' : 'Rédaction simple'}</span>
              </button>
              <button
                type="button"
                onClick={() => void saveArticle('draft')}
                disabled={busy}
                aria-label="Enregistrer le brouillon"
                title="Enregistrer le brouillon"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 transition hover:border-slate-400 disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Enregistrer</span>
              </button>
              <button
                type="button"
                onClick={() => void saveArticle('published')}
                disabled={busy || !readyForPublication}
                title={readyForPublication ? 'Publier sur le site public' : 'Complétez la checklist de publication'}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-md bg-[#ff5757] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#e94949] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Publier
              </button>
            </div>
          </header>

          {!simpleEditor && (
            <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-6">
              <div role="tablist" className="flex gap-5">
                {[
                  { id: 'content' as const, label: 'Contenu' },
                  { id: 'seo' as const, label: 'Référencement' },
                  { id: 'publication' as const, label: 'Publication' },
                  { id: 'preview' as const, label: 'Aperçu' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={editorTab === tab.id}
                    onClick={() => setEditorTab(tab.id)}
                    className={`border-b-2 py-3 text-xs font-bold transition ${
                      editorTab === tab.id
                        ? 'border-[#ff5757] text-[#ff5757]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto">
            {simpleEditor && (
              <SimpleBlogEditor
                draft={draft}
                uploading={uploading}
                publicationChecks={publicationChecks}
                onTitleChange={handleTitleChange}
                onDraftChange={updateDraft}
                onUpdateBlock={updateBlock}
                onMoveBlock={moveBlock}
                onRemoveBlock={removeBlock}
                onAddBlock={addBlock}
                onCoverUpload={handleCoverUpload}
                onBlockImageUpload={handleBlockImageUpload}
              />
            )}
            {!simpleEditor && editorTab === 'content' && (
              <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-6">
                <div className="space-y-5">
                  <section className="space-y-4 border border-slate-200 bg-white p-5 sm:p-6">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-400">Titre de l’article</label>
                      <textarea
                        rows={2}
                        value={draft.title}
                        onChange={event => handleTitleChange(event.target.value)}
                        placeholder="Un titre clair, utile et précis"
                        className="w-full resize-none border-0 p-0 font-display text-2xl font-bold leading-tight text-[#242424] outline-none placeholder:text-slate-300 sm:text-3xl"
                      />
                    </div>
                    <div className="border-t border-slate-100 pt-4">
                      <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-400">Résumé public</label>
                      <textarea
                        rows={3}
                        value={draft.excerpt}
                        onChange={event => updateDraft('excerpt', event.target.value)}
                        maxLength={420}
                        placeholder="Présentez en quelques lignes ce que le lecteur va apprendre."
                        className="w-full resize-none border-0 p-0 text-sm font-medium leading-6 text-slate-600 outline-none placeholder:text-slate-300"
                      />
                      <div className="mt-2 text-right text-[9px] font-bold text-slate-400">{draft.excerpt.length}/420</div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    {draft.content.map((block, index) => (
                      <div key={block.id} className="group border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-2">
                          <span className="text-[9px] font-extrabold uppercase text-slate-400">
                            {BLOCK_ACTIONS.find(item => item.type === block.type)?.label || 'Bloc'}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} title="Monter" className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === draft.content.length - 1} title="Descendre" className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => removeBlock(block.id)} title="Supprimer le bloc" className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <div className="p-4 sm:p-5">
                          {block.type === 'bullets' ? (
                            <textarea
                              rows={Math.max(3, block.items?.length || 1)}
                              value={(block.items || []).join('\n')}
                              onChange={event => updateBlock(block.id, { items: event.target.value.split('\n') })}
                              placeholder={'Une idée par ligne\nUn conseil concret\nUne information utile'}
                              className="w-full resize-y border-0 p-0 text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-300"
                            />
                          ) : block.type === 'image' ? (
                            <div className="space-y-4">
                              {block.imageUrl ? (
                                <img src={block.imageUrl} alt="" className="aspect-[16/9] w-full bg-slate-100 object-cover" />
                              ) : (
                                <label className="flex aspect-[16/7] cursor-pointer flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-center hover:border-[#ff5757]">
                                  {uploading === block.id ? <Loader2 className="h-6 w-6 animate-spin text-[#ff5757]" /> : <UploadCloud className="h-6 w-6 text-[#ff5757]" />}
                                  <span className="mt-2 text-xs font-bold text-slate-600">Ajouter une image dans l’article</span>
                                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void handleBlockImageUpload(block.id, event.target.files?.[0])} />
                                </label>
                              )}
                              {block.imageUrl && (
                                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#ff5757]">
                                  <UploadCloud className="h-4 w-4" />
                                  Remplacer l’image
                                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void handleBlockImageUpload(block.id, event.target.files?.[0])} />
                                </label>
                              )}
                              <div className="grid gap-3 sm:grid-cols-2">
                                <input value={block.imageAlt || ''} onChange={event => updateBlock(block.id, { imageAlt: event.target.value })} placeholder="Texte alternatif de l’image" className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#ff5757]" />
                                <input value={block.caption || ''} onChange={event => updateBlock(block.id, { caption: event.target.value })} placeholder="Légende facultative" className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#ff5757]" />
                              </div>
                            </div>
                          ) : (
                            <textarea
                              rows={block.type === 'paragraph' ? 5 : block.type === 'callout' ? 3 : 2}
                              value={block.text || ''}
                              onChange={event => updateBlock(block.id, { text: event.target.value })}
                              placeholder={
                                block.type === 'heading' ? 'Titre de section'
                                  : block.type === 'subheading' ? 'Sous-titre'
                                    : block.type === 'quote' ? 'Citation ou parole d’expert'
                                      : block.type === 'callout' ? 'Information importante à retenir'
                                        : 'Développez une idée utile pour le lecteur...'
                              }
                              className={`w-full resize-y border-0 p-0 leading-7 text-slate-700 outline-none placeholder:text-slate-300 ${
                                block.type === 'heading' ? 'font-display text-xl font-bold'
                                  : block.type === 'subheading' ? 'font-display text-lg font-bold'
                                    : block.type === 'quote' ? 'text-base font-semibold italic'
                                      : 'text-sm'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </section>

                  <div className="border border-dashed border-slate-300 bg-white p-3">
                    <p className="mb-2 px-1 text-[9px] font-extrabold uppercase text-slate-400">Ajouter un bloc</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                      {BLOCK_ACTIONS.map(action => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.type}
                            type="button"
                            onClick={() => addBlock(action.type)}
                            className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-2 py-2 text-[9px] font-bold text-slate-600 transition hover:border-[#ff5757]/30 hover:bg-rose-50 hover:text-[#ff5757]"
                          >
                            <Icon className="h-4 w-4" />
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                  <section className="border border-slate-200 bg-white p-4">
                    <label className="mb-3 block text-[10px] font-extrabold uppercase text-slate-400">Image de couverture</label>
                    {draft.coverImageUrl ? (
                      <img src={draft.coverImageUrl} alt="" className="aspect-[16/10] w-full bg-slate-100 object-cover" />
                    ) : (
                      <button type="button" onClick={() => coverInputRef.current?.click()} className="flex aspect-[16/10] w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-[#ff5757]">
                        {uploading === 'cover' ? <Loader2 className="h-6 w-6 animate-spin text-[#ff5757]" /> : <ImageIcon className="h-6 w-6 text-[#ff5757]" />}
                        <span className="mt-2 text-[10px] font-bold">Téléverser une image</span>
                      </button>
                    )}
                    <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void handleCoverUpload(event.target.files?.[0])} />
                    {draft.coverImageUrl && (
                      <button type="button" onClick={() => coverInputRef.current?.click()} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#ff5757]">
                        <UploadCloud className="h-3.5 w-3.5" />
                        Remplacer
                      </button>
                    )}
                    <input
                      value={draft.coverImageAlt}
                      onChange={event => updateDraft('coverImageAlt', event.target.value)}
                      placeholder="Décrivez précisément l’image"
                      className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-[10px] outline-none focus:border-[#ff5757]"
                    />
                  </section>

                  <section className="space-y-3 border border-slate-200 bg-white p-4">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400">Classement</label>
                    <select value={draft.category} onChange={event => updateDraft('category', event.target.value as BlogPostDraft['category'])} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#ff5757]">
                      {BLOG_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                    </select>
                    <input
                      value={draft.tags.join(', ')}
                      onChange={event => updateDraft('tags', event.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                      placeholder="Tags séparés par des virgules"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#ff5757]"
                    />
                  </section>
                </aside>
              </div>
            )}

            {!simpleEditor && editorTab === 'seo' && (
              <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
                <section className="space-y-5 border border-slate-200 bg-white p-5 sm:p-6">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-400">URL publique</label>
                    <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-3">
                      <span className="text-xs text-slate-400">/conseils/</span>
                      <input
                        value={draft.slug}
                        onChange={event => {
                          setSlugManuallyEdited(true);
                          updateDraft('slug', slugifyBlogTitle(event.target.value));
                        }}
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between gap-3 text-[10px] font-extrabold uppercase text-slate-400">
                      <label>Titre SEO</label><span>{draft.seoTitle.length}/70</span>
                    </div>
                    <input value={draft.seoTitle} onChange={event => updateDraft('seoTitle', event.target.value.slice(0, 70))} placeholder={draft.title || 'Titre affiché dans Google'} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff5757]" />
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between gap-3 text-[10px] font-extrabold uppercase text-slate-400">
                      <label>Description SEO</label><span>{draft.seoDescription.length}/170</span>
                    </div>
                    <textarea rows={4} value={draft.seoDescription} onChange={event => updateDraft('seoDescription', event.target.value.slice(0, 170))} placeholder="Une description précise qui donne envie de lire l’article." className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#ff5757]" />
                  </div>
                </section>
                <aside className="space-y-3 border border-slate-200 bg-white p-5 lg:sticky lg:top-6 lg:self-start">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Aperçu Google</span>
                  <div>
                    <p className="truncate text-xs text-emerald-700">aq8algerie-dz.com › conseils › {draft.slug || 'article'}</p>
                    <h3 className="mt-1 text-lg font-medium leading-snug text-[#1a0dab]">{draft.seoTitle || draft.title || 'Titre de votre article'}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{draft.seoDescription || draft.excerpt || 'La description de l’article apparaîtra ici.'}</p>
                  </div>
                  <p className="border-t border-slate-100 pt-3 text-[10px] leading-5 text-slate-400">
                    L’affichage exact reste déterminé par le moteur de recherche.
                  </p>
                </aside>
              </div>
            )}

            {!simpleEditor && editorTab === 'publication' && (
              <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6">
                <section className="space-y-5 border border-slate-200 bg-white p-5 sm:p-6">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#242424]">Responsabilité éditoriale</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Identifiez clairement la personne qui écrit et celle qui relit les informations sensibles.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-[10px] font-extrabold uppercase text-slate-400">
                      Auteur
                      <input value={draft.authorName} onChange={event => updateDraft('authorName', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium normal-case text-slate-700 outline-none focus:border-[#ff5757]" />
                    </label>
                    <label className="space-y-1.5 text-[10px] font-extrabold uppercase text-slate-400">
                      Fonction
                      <input value={draft.authorRole} onChange={event => updateDraft('authorRole', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium normal-case text-slate-700 outline-none focus:border-[#ff5757]" />
                    </label>
                  </div>
                  <label className="block space-y-1.5 text-[10px] font-extrabold uppercase text-slate-400">
                    Relecteur ou expert consulté
                    <input value={draft.reviewerName} onChange={event => updateDraft('reviewerName', event.target.value)} placeholder="Facultatif, recommandé pour les sujets santé et bien-être" className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium normal-case text-slate-700 outline-none focus:border-[#ff5757]" />
                  </label>
                  <label className="flex cursor-pointer items-start justify-between gap-5 border-t border-slate-100 pt-5">
                    <div>
                      <span className="block text-xs font-bold text-[#242424]">Mettre à la une</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">Cet article occupera l’emplacement principal de la page Conseils.</span>
                    </div>
                    <input type="checkbox" checked={draft.featured} onChange={event => updateDraft('featured', event.target.checked)} className="mt-1 h-4 w-4 accent-[#ff5757]" />
                  </label>
                  {draft.status === 'published' && (
                    <button type="button" disabled={busy} onClick={() => void saveArticle('archived', true)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                      <Archive className="h-4 w-4" />
                      Archiver et retirer du site
                    </button>
                  )}
                </section>

                <section className="border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#242424]">Checklist avant publication</h3>
                      <p className="mt-1 text-xs text-slate-500">{publicationChecks.filter(item => item.ok).length}/{publicationChecks.length} points validés</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full ${readyForPublication ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {readyForPublication ? <Check className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {publicationChecks.map(item => (
                      <div key={item.label} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {item.ok ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </span>
                        <span className={`text-xs font-semibold ${item.ok ? 'text-slate-700' : 'text-slate-400'}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {!simpleEditor && editorTab === 'preview' && (
              <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <article className="overflow-hidden border border-slate-200 bg-white">
                  {draft.coverImageUrl ? (
                    <img src={draft.coverImageUrl} alt={draft.coverImageAlt} className="aspect-[16/8] w-full bg-slate-100 object-cover" />
                  ) : (
                    <div className="flex aspect-[16/6] items-center justify-center bg-slate-100"><ImageIcon className="h-8 w-8 text-slate-300" /></div>
                  )}
                  <div className="px-5 py-8 sm:px-10">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase text-[#ff5757]">
                      <span>{getBlogCategoryLabel(draft.category)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400">{estimatedReadingTime} min de lecture</span>
                    </div>
                    <h1 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-5xl">{draft.title || 'Titre de l’article'}</h1>
                    <p className="mt-5 text-base leading-7 text-slate-600">{draft.excerpt || 'Le résumé de votre article apparaîtra ici.'}</p>
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
