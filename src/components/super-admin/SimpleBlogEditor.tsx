import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Heading2,
  Image as ImageIcon,
  List,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  BLOG_CATEGORIES,
  type BlogBlockType,
  type BlogContentBlock,
  type BlogPostDraft,
} from '../../lib/blog';

type PublicationCheck = {
  label: string;
  ok: boolean;
};

type SimpleBlogEditorProps = {
  draft: BlogPostDraft;
  uploading: string;
  publicationChecks: PublicationCheck[];
  onTitleChange: (title: string) => void;
  onDraftChange: (key: keyof BlogPostDraft, value: BlogPostDraft[keyof BlogPostDraft]) => void;
  onUpdateBlock: (id: string, patch: Partial<BlogContentBlock>) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onRemoveBlock: (id: string) => void;
  onAddBlock: (type: BlogBlockType) => void;
  onCoverUpload: (file?: File) => Promise<void>;
  onBlockImageUpload: (blockId: string, file?: File) => Promise<void>;
};

const SIMPLE_BLOCK_LABELS: Record<BlogBlockType, string> = {
  paragraph: 'Texte',
  heading: 'Titre de section',
  subheading: 'Sous-titre',
  bullets: 'Liste',
  quote: 'Citation',
  callout: 'Information importante',
  image: 'Image',
};

function getBlockPlaceholder(type: BlogBlockType): string {
  if (type === 'heading') return 'Ex. Avant votre première séance';
  if (type === 'subheading') return 'Ex. Les points à retenir';
  if (type === 'quote') return 'Ajoutez une citation ou une parole d’expert';
  if (type === 'callout') return 'Ajoutez une information importante';
  return 'Écrivez votre texte ici...';
}

export function SimpleBlogEditor({
  draft,
  uploading,
  publicationChecks,
  onTitleChange,
  onDraftChange,
  onUpdateBlock,
  onMoveBlock,
  onRemoveBlock,
  onAddBlock,
  onCoverUpload,
  onBlockImageUpload,
}: SimpleBlogEditorProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const completedChecks = publicationChecks.filter(item => item.ok).length;

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-6">
      <div className="space-y-4">
        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase text-slate-400">
              Titre
            </label>
            <textarea
              rows={2}
              value={draft.title}
              onChange={event => onTitleChange(event.target.value)}
              placeholder="Un titre clair et utile"
              className="w-full resize-none border-0 p-0 font-display text-2xl font-bold leading-tight text-[#242424] outline-none placeholder:text-slate-300 sm:text-3xl"
            />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-[10px] font-extrabold uppercase text-slate-400">
                Résumé
              </label>
              <span className="text-[9px] font-bold text-slate-400">{draft.excerpt.length}/420</span>
            </div>
            <textarea
              rows={3}
              value={draft.excerpt}
              onChange={event => onDraftChange('excerpt', event.target.value)}
              maxLength={420}
              placeholder="Résumez ce que le lecteur va apprendre."
              className="w-full resize-none border-0 p-0 text-sm font-medium leading-7 text-slate-600 outline-none placeholder:text-slate-300"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4 px-1">
            <div>
              <h3 className="font-display text-base font-bold text-[#242424]">Contenu de l’article</h3>
              <span className="text-[10px] font-medium text-slate-400">{draft.content.length} section(s)</span>
            </div>
            <button
              type="button"
              onClick={() => onAddBlock('paragraph')}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#242424] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#ff5757]"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter du texte
            </button>
          </div>

          {draft.content.map((block, index) => (
            <article key={block.id} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
                <select
                  value={block.type}
                  onChange={event => {
                    const type = event.target.value as BlogBlockType;
                    const textFromList = (block.items || []).filter(Boolean).join('\n');
                    onUpdateBlock(block.id, {
                      type,
                      ...(type === 'bullets' && !block.items?.length
                        ? { items: block.text ? [block.text] : [''] }
                        : {}),
                      ...(block.type === 'bullets' && type !== 'bullets' && !block.text
                        ? { text: textFromList }
                        : {}),
                    });
                  }}
                  aria-label="Type de contenu"
                  className="min-w-0 rounded border-0 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-600 outline-none"
                >
                  {Object.entries(SIMPLE_BLOCK_LABELS).map(([type, label]) => (
                    <option key={type} value={type}>{label}</option>
                  ))}
                </select>

                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => onMoveBlock(index, -1)}
                    disabled={index === 0}
                    title="Monter"
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-20"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveBlock(index, 1)}
                    disabled={index === draft.content.length - 1}
                    title="Descendre"
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-20"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBlock(block.id)}
                    title="Supprimer"
                    className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {block.type === 'bullets' ? (
                  <textarea
                    rows={Math.max(4, block.items?.length || 1)}
                    value={(block.items || []).join('\n')}
                    onChange={event => onUpdateBlock(block.id, { items: event.target.value.split('\n') })}
                    placeholder={'Premier point\nDeuxième point\nTroisième point'}
                    className="w-full resize-y border-0 p-0 text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-300"
                  />
                ) : block.type === 'image' ? (
                  <div className="space-y-3">
                    {block.imageUrl ? (
                      <img
                        src={block.imageUrl}
                        alt=""
                        className="aspect-[16/8] w-full rounded-md bg-slate-100 object-cover"
                      />
                    ) : (
                      <label className="flex aspect-[16/6] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 transition hover:border-[#ff5757]">
                        {uploading === block.id
                          ? <Loader2 className="h-5 w-5 animate-spin text-[#ff5757]" />
                          : <UploadCloud className="h-5 w-5 text-[#ff5757]" />}
                        <span className="mt-2 text-[10px] font-bold text-slate-600">Ajouter une image</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={event => void onBlockImageUpload(block.id, event.target.files?.[0])}
                        />
                      </label>
                    )}
                    {block.imageUrl && (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-[#ff5757]">
                        <UploadCloud className="h-3.5 w-3.5" />
                        Remplacer
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={event => void onBlockImageUpload(block.id, event.target.files?.[0])}
                        />
                      </label>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={block.imageAlt || ''}
                        onChange={event => onUpdateBlock(block.id, { imageAlt: event.target.value })}
                        placeholder="Description de l’image"
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#ff5757]"
                      />
                      <input
                        value={block.caption || ''}
                        onChange={event => onUpdateBlock(block.id, { caption: event.target.value })}
                        placeholder="Légende facultative"
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#ff5757]"
                      />
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={block.type === 'paragraph' ? 6 : block.type === 'callout' ? 3 : 2}
                    value={block.text || ''}
                    onChange={event => onUpdateBlock(block.id, { text: event.target.value })}
                    placeholder={getBlockPlaceholder(block.type)}
                    className={`w-full resize-y border-0 p-0 leading-7 text-slate-700 outline-none placeholder:text-slate-300 ${
                      block.type === 'heading'
                        ? 'font-display text-xl font-bold'
                        : block.type === 'subheading'
                          ? 'font-display text-lg font-bold'
                          : block.type === 'quote'
                            ? 'text-base font-semibold italic'
                            : 'text-sm'
                    }`}
                  />
                )}
              </div>
            </article>
          ))}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { type: 'paragraph' as const, label: 'Texte', icon: Plus },
              { type: 'heading' as const, label: 'Titre de section', icon: Heading2 },
              { type: 'bullets' as const, label: 'Liste', icon: List },
              { type: 'image' as const, label: 'Image', icon: ImageIcon },
            ].map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.type}
                  type="button"
                  onClick={() => onAddBlock(action.type)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-[#ff5757]/40 hover:text-[#ff5757]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="mb-3 block text-[10px] font-extrabold uppercase text-slate-400">
            Image principale
          </label>
          {draft.coverImageUrl ? (
            <img
              src={draft.coverImageUrl}
              alt=""
              className="aspect-[16/10] w-full rounded-md bg-slate-100 object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 transition hover:border-[#ff5757]"
            >
              {uploading === 'cover'
                ? <Loader2 className="h-5 w-5 animate-spin text-[#ff5757]" />
                : <ImageIcon className="h-5 w-5 text-[#ff5757]" />}
              <span className="mt-2 text-[10px] font-bold text-slate-600">Choisir une image</span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={event => void onCoverUpload(event.target.files?.[0])}
          />
          {draft.coverImageUrl && (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#ff5757]"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Remplacer
            </button>
          )}
          <input
            value={draft.coverImageAlt}
            onChange={event => onDraftChange('coverImageAlt', event.target.value)}
            placeholder="Description de l’image"
            className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-[10px] outline-none focus:border-[#ff5757]"
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-[10px] font-extrabold uppercase text-slate-400">
            Catégorie
          </label>
          <select
            value={draft.category}
            onChange={event => onDraftChange('category', event.target.value as BlogPostDraft['category'])}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#ff5757]"
          >
            {BLOG_CATEGORIES.map(category => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Prêt à publier</span>
            <span className="text-[10px] font-bold text-slate-500">
              {completedChecks}/{publicationChecks.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {publicationChecks.slice(0, 6).map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full ${
                  item.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-300'
                }`}>
                  {item.ok ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                </span>
                <span className={`text-[10px] font-semibold ${item.ok ? 'text-slate-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
