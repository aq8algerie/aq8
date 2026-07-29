import type { BlogContentBlock } from '@/src/lib/blog';
import { Info, Quote } from 'lucide-react';

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
    <div className={compact ? 'space-y-5' : 'space-y-7'}>
      {blocks.map(block => {
        if (block.type === 'heading') {
          return (
            <h2
              id={getHeadingId(block)}
              key={block.id}
              className="scroll-mt-28 pt-3 font-display text-2xl font-bold leading-tight text-[#242424] sm:text-3xl"
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
            <ul key={block.id} className="space-y-3">
              {(block.items || []).map((item, index) => (
                <li key={`${block.id}-${index}`} className="flex items-start gap-3 text-base leading-8 text-slate-700">
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5757]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={block.id}
              className="relative border-l-4 border-[#ff5757] bg-slate-50 px-6 py-5 text-lg font-semibold leading-8 text-[#353535]"
            >
              <Quote className="mb-3 h-5 w-5 text-[#ff5757]" />
              {block.text}
            </blockquote>
          );
        }

        if (block.type === 'callout') {
          return (
            <aside
              key={block.id}
              className="flex items-start gap-4 border border-rose-100 bg-rose-50/60 px-5 py-5 text-sm font-medium leading-7 text-slate-700"
            >
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5757]" />
              <p>{block.text}</p>
            </aside>
          );
        }

        if (block.type === 'image') {
          return (
            <figure key={block.id} className="space-y-2">
              <img
                src={block.imageUrl}
                alt={block.imageAlt || ''}
                className="aspect-[16/9] w-full bg-slate-100 object-cover"
                loading="lazy"
              />
              {block.caption && (
                <figcaption className="text-center text-xs font-medium text-slate-500">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        return (
          <p key={block.id} className="whitespace-pre-line text-base leading-8 text-slate-700">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

