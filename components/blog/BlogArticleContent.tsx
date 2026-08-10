import type { BlogContentBlock } from '@/src/lib/blog';
import { Info, Quote, CheckCircle2 } from 'lucide-react';

function getHeadingId(block: BlogContentBlock): string | undefined {
  if (block.type !== 'heading' && block.type !== 'subheading') return undefined;
  return (block.text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BlogArticleContent({
  blocks,
  compact = false,
}: {
  blocks: BlogContentBlock[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-6' : 'space-y-8'}>
      {blocks.map(block => {
        if (block.type === 'heading') {
          return (
            <h2
              id={getHeadingId(block)}
              key={block.id}
              className="scroll-mt-28 pt-4 font-display text-2xl font-extrabold leading-snug text-[#242424] sm:text-3xl border-b border-slate-100 pb-3"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === 'subheading') {
          return (
            <h3
              id={getHeadingId(block)}
              key={block.id}
              className="scroll-mt-28 pt-2 font-display text-xl font-bold leading-tight text-[#353535] sm:text-2xl"
            >
              {block.text}
            </h3>
          );
        }

        if (block.type === 'bullets') {
          return (
            <div key={block.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6 space-y-3">
              {(block.items || []).map((item, index) => (
                <div key={`${block.id}-${index}`} className="flex items-start gap-3 text-base leading-relaxed text-slate-700">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#0284c7]" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={block.id}
              className="relative overflow-hidden rounded-2xl border-l-4 border-[#0284c7] bg-gradient-to-r from-rose-50/70 to-slate-50 p-6 text-lg font-semibold leading-relaxed text-[#242424] shadow-sm"
            >
              <Quote className="mb-2 h-6 w-6 text-[#0284c7] opacity-80" />
              <span dangerouslySetInnerHTML={{ __html: block.text || '' }} />
            </blockquote>
          );
        }

        if (block.type === 'callout') {
          return (
            <aside
              key={block.id}
              className="flex items-start gap-4 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-6 text-sm font-medium leading-relaxed text-slate-800 shadow-sm"
            >
              <Info className="mt-0.5 h-6 w-6 shrink-0 text-[#0284c7]" />
              <p className="text-base [&_a]:text-[#0284c7] [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-rose-700"
                dangerouslySetInnerHTML={{ __html: block.text || '' }}
              />
            </aside>
          );
        }

        if (block.type === 'image') {
          return (
            <figure key={block.id} className="space-y-3">
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 shadow-md">
                <img
                  src={block.imageUrl}
                  alt={block.imageAlt || ''}
                  className="aspect-[16/9] w-full bg-slate-100 object-cover"
                  loading="lazy"
                />
              </div>
              {block.caption && (
                <figcaption className="text-center text-xs font-semibold text-slate-500">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        return (
          <p
            key={block.id}
            className="whitespace-pre-line text-base sm:text-lg leading-relaxed text-slate-700 font-normal [&_a]:text-[#0284c7] [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-rose-700 [&_a]:transition-colors"
            dangerouslySetInnerHTML={{ __html: block.text || '' }}
          />
        );
      })}
    </div>
  );
}
