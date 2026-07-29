export const BLOG_CATEGORIES = [
  { id: 'aq8-ems', label: 'AQ8 EMS' },
  { id: 'wonder', label: 'Wonder' },
  { id: 'conseils', label: 'Conseils pratiques' },
  { id: 'bien-etre', label: 'Bien-être' },
  { id: 'actualites', label: 'Actualités AQ8' },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]['id'];
export type BlogPostStatus = 'draft' | 'published' | 'archived';
export type BlogBlockType =
  | 'paragraph'
  | 'heading'
  | 'subheading'
  | 'bullets'
  | 'quote'
  | 'callout'
  | 'image';

export type BlogContentBlock = {
  id: string;
  type: BlogBlockType;
  text?: string;
  items?: string[];
  imageUrl?: string;
  imageAlt?: string;
  caption?: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  authorRole: string;
  reviewerName: string;
  content: BlogContentBlock[];
  seoTitle: string;
  seoDescription: string;
  status: BlogPostStatus;
  featured: boolean;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type BlogPostDraft = Omit<
  BlogPost,
  'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'readingTimeMinutes'
> & {
  id?: string;
  publishedAt?: string | null;
};

export type BlogValidationResult =
  | { valid: true; data: BlogPostDraft & { readingTimeMinutes: number } }
  | { valid: false; error: string };

const VALID_CATEGORY_IDS = new Set<string>(BLOG_CATEGORIES.map(category => category.id));
const VALID_STATUSES = new Set<BlogPostStatus>(['draft', 'published', 'archived']);
const VALID_BLOCK_TYPES = new Set<BlogBlockType>([
  'paragraph',
  'heading',
  'subheading',
  'bullets',
  'quote',
  'callout',
  'image',
]);

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function createBlogBlock(type: BlogBlockType = 'paragraph'): BlogContentBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    ...(type === 'bullets' ? { items: [''] } : {}),
  };
}

export function createEmptyBlogDraft(): BlogPostDraft {
  return {
    title: '',
    slug: '',
    excerpt: '',
    category: 'conseils',
    tags: [],
    coverImageUrl: '',
    coverImageAlt: '',
    authorName: 'Équipe AQ8 Algérie',
    authorRole: 'Rédaction AQ8 Algérie',
    reviewerName: '',
    content: [createBlogBlock('heading'), createBlogBlock('paragraph')],
    seoTitle: '',
    seoDescription: '',
    status: 'draft',
    featured: false,
  };
}

export function slugifyBlogTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function getBlogCategoryLabel(category: BlogCategory): string {
  return BLOG_CATEGORIES.find(item => item.id === category)?.label || 'Conseils';
}

export function getBlogBlockText(block: BlogContentBlock): string {
  if (block.type === 'bullets') return (block.items || []).join(' ');
  if (block.type === 'image') return `${block.imageAlt || ''} ${block.caption || ''}`.trim();
  return block.text || '';
}

export function estimateBlogReadingTime(blocks: BlogContentBlock[]): number {
  const words = blocks
    .map(getBlogBlockText)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 210));
}

function normalizeContentBlock(value: unknown, index: number): BlogContentBlock | null {
  if (!value || typeof value !== 'object') return null;
  const block = value as Partial<BlogContentBlock>;
  const type = VALID_BLOCK_TYPES.has(block.type as BlogBlockType)
    ? block.type as BlogBlockType
    : 'paragraph';
  const id = cleanText(block.id, 100) || `block-${index + 1}`;

  if (type === 'image') {
    const imageUrl = cleanText(block.imageUrl, 1200);
    if (!imageUrl) return null;
    return {
      id,
      type,
      imageUrl,
      imageAlt: cleanText(block.imageAlt, 180),
      caption: cleanText(block.caption, 300),
    };
  }

  if (type === 'bullets') {
    const items = Array.isArray(block.items)
      ? block.items.map(item => cleanText(item, 500)).filter(Boolean).slice(0, 20)
      : [];
    if (items.length === 0) return null;
    return { id, type, items };
  }

  const text = cleanText(block.text, type === 'paragraph' ? 5000 : 1200);
  if (!text) return null;
  return { id, type, text };
}

export function validateBlogPostDraft(value: unknown): BlogValidationResult {
  if (!value || typeof value !== 'object') {
    return { valid: false, error: 'Les données de l’article sont invalides.' };
  }

  const draft = value as Partial<BlogPostDraft>;
  const title = cleanText(draft.title, 140);
  const slug = slugifyBlogTitle(cleanText(draft.slug, 110) || title);
  const excerpt = cleanText(draft.excerpt, 420);
  const category = VALID_CATEGORY_IDS.has(String(draft.category))
    ? draft.category as BlogCategory
    : 'conseils';
  const status = VALID_STATUSES.has(draft.status as BlogPostStatus)
    ? draft.status as BlogPostStatus
    : 'draft';
  const content = Array.isArray(draft.content)
    ? draft.content
        .map(normalizeContentBlock)
        .filter((block): block is BlogContentBlock => Boolean(block))
        .slice(0, 80)
    : [];
  const tags = Array.isArray(draft.tags)
    ? [...new Set(draft.tags.map(tag => cleanText(tag, 50)).filter(Boolean))].slice(0, 10)
    : [];

  if (!title) return { valid: false, error: 'Le titre de l’article est obligatoire.' };
  if (title.length < 8) return { valid: false, error: 'Le titre doit contenir au moins 8 caractères.' };
  if (!slug) return { valid: false, error: 'L’URL de l’article est invalide.' };

  if (status === 'published') {
    if (excerpt.length < 80) {
      return { valid: false, error: 'Le résumé doit contenir au moins 80 caractères avant publication.' };
    }
    if (!cleanText(draft.coverImageUrl, 1200)) {
      return { valid: false, error: 'Une image de couverture est obligatoire avant publication.' };
    }
    if (!cleanText(draft.coverImageAlt, 180)) {
      return { valid: false, error: 'Le texte alternatif de l’image est obligatoire avant publication.' };
    }
    if (!cleanText(draft.authorName, 120)) {
      return { valid: false, error: 'Le nom de l’auteur est obligatoire avant publication.' };
    }
    if (content.length < 2) {
      return { valid: false, error: 'Ajoutez au moins deux blocs de contenu avant publication.' };
    }
  }

  const normalized: BlogPostDraft & { readingTimeMinutes: number } = {
    title,
    slug,
    excerpt,
    category,
    tags,
    coverImageUrl: cleanText(draft.coverImageUrl, 1200),
    coverImageAlt: cleanText(draft.coverImageAlt, 180),
    authorName: cleanText(draft.authorName, 120),
    authorRole: cleanText(draft.authorRole, 120),
    reviewerName: cleanText(draft.reviewerName, 120),
    content,
    seoTitle: cleanText(draft.seoTitle, 70),
    seoDescription: cleanText(draft.seoDescription, 170),
    status,
    featured: draft.featured === true,
    readingTimeMinutes: estimateBlogReadingTime(content),
    publishedAt: cleanText(draft.publishedAt, 40) || null,
  };

  return { valid: true, data: normalized };
}

