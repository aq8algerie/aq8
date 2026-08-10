import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  Heading2,
  Image as ImageIcon,
  Info,
  List,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { Center } from '../../types';
import {
  BLOG_CATEGORIES,
  BLOG_PUBLICATION_TYPES,
  getBlogPublicationType,
  type BlogBlockType,
  type BlogContentBlock,
  type BlogPostDraft,
  type BlogPublicationType,
} from '../../lib/blog';

type PublicationCheck = {
  label: string;
  ok: boolean;
};

type SimpleBlogEditorProps = {
  draft: BlogPostDraft;
  centers: Center[];
  uploading: string;
  publicationChecks: PublicationCheck[];
  onTitleChange: (title: string) => void;
  onPublicationTypeChange: (type: BlogPublicationType) => void;
  onDraftChange: (key: keyof BlogPostDraft, value: BlogPostDraft[keyof BlogPostDraft]) => void;
  onUpdateBlock: (id: string, patch: Partial<BlogContentBlock>) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onRemoveBlock: (id: string) => void;
  onAddBlock: (type: BlogBlockType) => void;
  onCoverUpload: (file?: File) => Promise<void>;
  onBlockImageUpload: (blockId: string, file?: File) => Promise<void>;
};

const TYPE_ICONS = {
  article: BookOpen,
  promotion: Tag,
  news: Megaphone,
  event: CalendarDays,
} as const;

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

function toLocalDateTimeValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function SimpleBlogEditor({
  draft,
  centers,
  uploading,
  publicationChecks,
  onTitleChange,
  onPublicationTypeChange,
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
  const publication = getBlogPublicationType(draft.publicationType);
  const visibleCenters = centers.filter(center => {
    const status = String(center.status || '').toLowerCase();
    return !['archived', 'inactive', 'suspended'].includes(status);
  });

  const toggleCenter = (centerId: string) => {
    const next = draft.targetCenterIds.includes(centerId)
      ? draft.targetCenterIds.filter(id => id !== centerId)
      : [...draft.targetCenterIds, centerId];
    onDraftChange('targetCenterIds', next);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-6">
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Type de publication</span>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {BLOG_PUBLICATION_TYPES.map(type => {
              const Icon = TYPE_ICONS[type.id];
              const selected = draft.publicationType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onPublicationTypeChange(type.id)}
                  aria-pressed={selected}
                  className={'flex min-h-20 flex-col items-start justify-between rounded-md border p-3 text-left transition ' + (
                    selected
                      ? 'border-[#0284c7] bg-rose-50 text-[#242424]'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  )}
                >
                  <Icon className={'h-4 w-4 ' + (selected ? 'text-[#0284c7]' : 'text-slate-400')} />
                  <span className="text-xs font-bold">{type.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase text-slate-400">
              Titre
            </label>
            <textarea
              rows={2}
              value={draft.title}
              onChange={event => onTitleChange(event.target.value)}
              placeholder={
                draft.publicationType === 'promotion'
                  ? 'Ex. Offre découverte AQ8 à Ouled Fayet'
                  : draft.publicationType === 'event'
                    ? 'Ex. Journée portes ouvertes AQ8 Draria'
                    : draft.publicationType === 'news'
                      ? 'Ex. Un nouveau centre AQ8 ouvre ses portes'
                      : 'Ex. Comment préparer sa première séance AQ8'
              }
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
              placeholder="L’essentiel de la publication en deux ou trois phrases."
              className="w-full resize-none border-0 p-0 text-sm font-medium leading-7 text-slate-600 outline-none placeholder:text-slate-300"
            />
          </div>
        </section>

        {(draft.publicationType === 'promotion' || draft.publicationType === 'event') && (
          <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <h3 className="font-display text-base font-bold text-[#242424]">
                {draft.publicationType === 'event' ? 'Date et lieu' : 'Durée de l’offre'}
              </h3>
            </div>
            <label className="space-y-2 text-[10px] font-extrabold uppercase text-slate-400">
              Début {draft.publicationType === 'promotion' && <span className="normal-case">(facultatif)</span>}
              <input
                type="datetime-local"
                value={toLocalDateTimeValue(draft.startsAt)}
                onChange={event => onDraftChange('startsAt', event.target.value || null)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold normal-case text-slate-700 outline-none focus:border-[#0284c7]"
              />
            </label>
            <label className="space-y-2 text-[10px] font-extrabold uppercase text-slate-400">
              Fin
              <input
                type="datetime-local"
                value={toLocalDateTimeValue(draft.endsAt)}
                onChange={event => onDraftChange('endsAt', event.target.value || null)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold normal-case text-slate-700 outline-none focus:border-[#0284c7]"
              />
            </label>
            <label className="space-y-2 text-[10px] font-extrabold uppercase text-slate-400 sm:col-span-2">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Lieu</span>
              <input
                value={draft.location}
                onChange={event => onDraftChange('location', event.target.value)}
                placeholder={draft.publicationType === 'event' ? 'Ex. Centre AQ8 Draria' : 'Ex. Tous les centres AQ8'}
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-xs font-medium normal-case text-slate-700 outline-none focus:border-[#0284c7]"
              />
            </label>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4 px-1">
            <div>
              <h3 className="font-display text-base font-bold text-[#242424]">Contenu</h3>
              <span className="text-[10px] font-medium text-slate-400">{draft.content.length} section(s)</span>
            </div>
            <button
              type="button"
              onClick={() => onAddBlock('paragraph')}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#242424] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#0284c7]"
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
                      <img src={block.imageUrl} alt="" className="aspect-[16/8] w-full rounded-md bg-slate-100 object-cover" />
                    ) : (
                      <label className="flex aspect-[16/6] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 transition hover:border-[#0284c7]">
                        {uploading === block.id
                          ? <Loader2 className="h-5 w-5 animate-spin text-[#0284c7]" />
                          : <UploadCloud className="h-5 w-5 text-[#0284c7]" />}
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
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-[#0284c7]">
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
                    <input
                      value={block.caption || ''}
                      onChange={event => onUpdateBlock(block.id, {
                        caption: event.target.value,
                        imageAlt: block.imageAlt || event.target.value,
                      })}
                      placeholder="Légende facultative"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0284c7]"
                    />
                  </div>
                ) : (
                  <textarea
                    rows={block.type === 'paragraph' ? 6 : block.type === 'callout' ? 3 : 2}
                    value={block.text || ''}
                    onChange={event => onUpdateBlock(block.id, { text: event.target.value })}
                    placeholder={getBlockPlaceholder(block.type)}
                    className={'w-full resize-y border-0 p-0 leading-7 text-slate-700 outline-none placeholder:text-slate-300 ' + (
                      block.type === 'heading'
                        ? 'font-display text-xl font-bold'
                        : block.type === 'subheading'
                          ? 'font-display text-lg font-bold'
                          : block.type === 'quote'
                            ? 'text-base font-semibold italic'
                            : 'text-sm'
                    )}
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-[#0284c7]/40 hover:text-[#0284c7]"
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
            <img src={draft.coverImageUrl} alt="" className="aspect-[16/10] w-full rounded-md bg-slate-100 object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 transition hover:border-[#0284c7]"
            >
              {uploading === 'cover'
                ? <Loader2 className="h-5 w-5 animate-spin text-[#0284c7]" />
                : <ImageIcon className="h-5 w-5 text-[#0284c7]" />}
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
              className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0284c7]"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Remplacer
            </button>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-[10px] font-extrabold uppercase text-slate-400">Classement</label>
          <select
            value={draft.category}
            onChange={event => onDraftChange('category', event.target.value as BlogPostDraft['category'])}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#0284c7]"
          >
            {BLOG_CATEGORIES.map(category => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2.5">
            <span className="text-xs font-bold text-slate-700">Mettre à la une</span>
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={event => onDraftChange('featured', event.target.checked)}
              className="h-4 w-4 accent-[#0284c7]"
            />
          </label>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Centres concernés</label>
            {draft.targetCenterIds.length > 0 && (
              <button type="button" onClick={() => onDraftChange('targetCenterIds', [])} className="text-[9px] font-bold text-[#0284c7]">
                Tout le réseau
              </button>
            )}
          </div>
          {draft.targetCenterIds.length === 0 && (
            <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">Tout le réseau AQ8</p>
          )}
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {visibleCenters.map(center => (
              <label key={center.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={draft.targetCenterIds.includes(center.id)}
                  onChange={() => toggleCenter(center.id)}
                  className="h-3.5 w-3.5 accent-[#0284c7]"
                />
                <span className="min-w-0 truncate text-[10px] font-semibold text-slate-600">{center.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-[10px] font-extrabold uppercase text-slate-400">Bouton public</label>
          <input
            value={draft.ctaLabel}
            onChange={event => onDraftChange('ctaLabel', event.target.value)}
            placeholder={publication.defaultCtaLabel}
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-[#0284c7]"
          />
          <input
            value={draft.ctaUrl}
            onChange={event => onDraftChange('ctaUrl', event.target.value)}
            placeholder="/reservation"
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs font-medium outline-none focus:border-[#0284c7]"
          />
        </section>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-[10px] font-extrabold uppercase text-slate-400">Publication programmée</label>
          <input
            type="datetime-local"
            value={toLocalDateTimeValue(draft.scheduledAt)}
            onChange={event => onDraftChange('scheduledAt', event.target.value || null)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0284c7]"
          />
          <p className="text-[9px] leading-4 text-slate-400">
            Laissez vide pour publier immédiatement.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Prêt à publier</span>
            <span className="text-[10px] font-bold text-slate-500">{completedChecks}/{publicationChecks.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {publicationChecks.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={'flex h-4 w-4 items-center justify-center rounded-full ' + (
                  item.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-300'
                )}>
                  {item.ok ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                </span>
                <span className={'text-[10px] font-semibold ' + (item.ok ? 'text-slate-600' : 'text-slate-400')}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-[10px] font-extrabold uppercase text-emerald-700">Référencement automatique</h3>
            <p className="mt-1 text-[9px] leading-4 text-emerald-700/75">
              Google, le partage social et l’adresse publique sont optimisés lors de l’enregistrement.
            </p>
          </div>
        </section>

        {draft.publicationType === 'promotion' && !draft.endsAt && (
          <section className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[10px] font-semibold leading-5 text-amber-800">Ajoutez une date de fin avant publication.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
