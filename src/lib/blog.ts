export const BLOG_CATEGORIES = [
  { id: 'aq8-ems', label: 'AQ8 EMS' },
  { id: 'wonder', label: 'Wonder' },
  { id: 'conseils', label: 'Conseils pratiques' },
  { id: 'bien-etre', label: 'Bien-être' },
  { id: 'actualites', label: 'Actualités AQ8' },
] as const;

export const BLOG_PUBLICATION_TYPES = [
  {
    id: 'article',
    label: 'Conseil',
    pluralLabel: 'Conseils',
    description: 'Un contenu utile et durable pour accompagner les clients.',
    defaultCtaLabel: 'Réserver une séance',
  },
  {
    id: 'promotion',
    label: 'Promotion',
    pluralLabel: 'Promotions',
    description: 'Une offre limitée avec une date de fin et un appel à l’action.',
    defaultCtaLabel: 'Profiter de l’offre',
  },
  {
    id: 'news',
    label: 'Information',
    pluralLabel: 'Informations',
    description: 'Une nouveauté importante concernant AQ8 ou ses centres.',
    defaultCtaLabel: 'En savoir plus',
  },
  {
    id: 'event',
    label: 'Événement',
    pluralLabel: 'Événements',
    description: 'Une ouverture, une journée découverte ou un rendez-vous réseau.',
    defaultCtaLabel: 'Réserver ma place',
  },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]['id'];
export type BlogPublicationType = (typeof BLOG_PUBLICATION_TYPES)[number]['id'];
export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';
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
  publicationType: BlogPublicationType;
  category: BlogCategory;
  tags: string[];
  targetCenterIds: string[];
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  authorRole: string;
  reviewerName: string;
  content: BlogContentBlock[];
  ctaLabel: string;
  ctaUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string;
  scheduledAt: string | null;
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
const VALID_PUBLICATION_TYPES = new Set<string>(BLOG_PUBLICATION_TYPES.map(type => type.id));
const VALID_STATUSES = new Set<BlogPostStatus>(['draft', 'scheduled', 'published', 'archived']);
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

function cleanDate(value: unknown): string | null {
  const text = cleanText(value, 40);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function truncateAtWord(value: string, maxLength: number): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  const candidate = text.slice(0, maxLength);
  const lastSpace = candidate.lastIndexOf(' ');
  const end = lastSpace > maxLength * 0.6 ? lastSpace : maxLength - 1;
  return candidate.slice(0, end).trim() + '…';
}

export function createBlogBlock(type: BlogBlockType = 'paragraph'): BlogContentBlock {
  return {
    id: 'block-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    type,
    ...(type === 'bullets' ? { items: [''] } : {}),
  };
}

export function getBlogPublicationType(value?: BlogPublicationType | null) {
  return BLOG_PUBLICATION_TYPES.find(item => item.id === value) || BLOG_PUBLICATION_TYPES[0];
}

export function createEmptyBlogDraft(publicationType: BlogPublicationType = 'article'): BlogPostDraft {
  const type = getBlogPublicationType(publicationType);
  return {
    title: '',
    slug: '',
    excerpt: '',
    publicationType,
    category: publicationType === 'news' || publicationType === 'event' ? 'actualites' : 'conseils',
    tags: [],
    targetCenterIds: [],
    coverImageUrl: '',
    coverImageAlt: '',
    authorName: 'Équipe AQ8 Algérie',
    authorRole: 'Rédaction AQ8 Algérie',
    reviewerName: '',
    content: [createBlogBlock('heading'), createBlogBlock('paragraph')],
    ctaLabel: type.defaultCtaLabel,
    ctaUrl: '/reservation',
    startsAt: null,
    endsAt: null,
    location: '',
    scheduledAt: null,
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

export function getBlogPublicationTypeLabel(value?: BlogPublicationType | null): string {
  return getBlogPublicationType(value).label;
}

export function normalizeBlogCtaUrl(value: unknown): string {
  const url = cleanText(value, 800);
  if (!url) return '/reservation';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : '/reservation';
  } catch {
    return '/reservation';
  }
}
export function getBlogBlockText(block: BlogContentBlock): string {
  if (block.type === 'bullets') return (block.items || []).join(' ');
  if (block.type === 'image') return ((block.imageAlt || '') + ' ' + (block.caption || '')).trim();
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

export function createAutomaticBlogExcerpt(
  draft: Pick<BlogPostDraft, 'excerpt' | 'content'>,
): string {
  if (draft.excerpt.trim()) return draft.excerpt.trim().slice(0, 420);
  const contentText = draft.content
    .filter(block => block.type === 'paragraph' || block.type === 'callout')
    .map(getBlogBlockText)
    .join(' ');
  return truncateAtWord(contentText, 220);
}

export function createAutomaticBlogSeo(
  draft: Pick<
    BlogPostDraft,
    'title' | 'excerpt' | 'content' | 'category' | 'publicationType' | 'location'
  >,
): { slug: string; seoTitle: string; seoDescription: string; tags: string[] } {
  const excerpt = createAutomaticBlogExcerpt(draft);
  const publication = getBlogPublicationType(draft.publicationType);
  const categoryLabel = getBlogCategoryLabel(draft.category);
  const titleSuffix = draft.title.toLowerCase().includes('aq8') ? '' : ' | AQ8 Algérie';
  const seoTitle = truncateAtWord(draft.title + titleSuffix, 65);
  const fallbackDescription = publication.label + ' AQ8 Algérie : ' + draft.title
    + '. Découvrez toutes les informations utiles et contactez le centre le plus proche.';
  const seoDescription = truncateAtWord(excerpt || fallbackDescription, 160);
  const words = slugifyBlogTitle(draft.title)
    .split('-')
    .filter(word => word.length >= 4 && !['avec', 'pour', 'dans', 'votre', 'cette'].includes(word));
  const tags = [...new Set([
    publication.label,
    categoryLabel,
    draft.location,
    ...words.slice(0, 4),
    'AQ8 Algérie',
  ].map(item => item.trim()).filter(Boolean))].slice(0, 8);

  return {
    slug: slugifyBlogTitle(draft.title),
    seoTitle,
    seoDescription,
    tags,
  };
}

export function getEffectiveBlogStatus(
  post: Pick<BlogPost, 'status' | 'scheduledAt'>,
  now = new Date(),
): BlogPostStatus {
  if (post.status !== 'scheduled') return post.status;
  const scheduledAt = post.scheduledAt ? new Date(post.scheduledAt) : null;
  return scheduledAt && !Number.isNaN(scheduledAt.getTime()) && scheduledAt <= now
    ? 'published'
    : 'scheduled';
}

export function isBlogPostPubliclyVisible(
  post: Pick<BlogPost, 'status' | 'scheduledAt' | 'publicationType' | 'endsAt'>,
  now = new Date(),
): boolean {
  if (getEffectiveBlogStatus(post, now) !== 'published') return false;
  if ((post.publicationType === 'promotion' || post.publicationType === 'event') && post.endsAt) {
    const endsAt = new Date(post.endsAt);
    if (!Number.isNaN(endsAt.getTime()) && endsAt < now) return false;
  }
  return true;
}

function normalizeContentBlock(value: unknown, index: number): BlogContentBlock | null {
  if (!value || typeof value !== 'object') return null;
  const block = value as Partial<BlogContentBlock>;
  const type = VALID_BLOCK_TYPES.has(block.type as BlogBlockType)
    ? block.type as BlogBlockType
    : 'paragraph';
  const id = cleanText(block.id, 100) || 'block-' + (index + 1);

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

export function normalizeStoredBlogPost(value: BlogPost): BlogPost {
  const publicationType = VALID_PUBLICATION_TYPES.has(value.publicationType)
    ? value.publicationType
    : 'article';
  return {
    ...value,
    publicationType,
    targetCenterIds: Array.isArray(value.targetCenterIds) ? value.targetCenterIds : [],
    ctaLabel: value.ctaLabel || getBlogPublicationType(publicationType).defaultCtaLabel,
    ctaUrl: normalizeBlogCtaUrl(value.ctaUrl),
    startsAt: value.startsAt || null,
    endsAt: value.endsAt || null,
    location: value.location || '',
    scheduledAt: value.scheduledAt || null,
  };
}

export function validateBlogPostDraft(value: unknown): BlogValidationResult {
  if (!value || typeof value !== 'object') {
    return { valid: false, error: 'Les données de la publication sont invalides.' };
  }

  const draft = value as Partial<BlogPostDraft>;
  const title = cleanText(draft.title, 140);
  const publicationType = VALID_PUBLICATION_TYPES.has(String(draft.publicationType))
    ? draft.publicationType as BlogPublicationType
    : 'article';
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
  const excerpt = createAutomaticBlogExcerpt({
    excerpt: cleanText(draft.excerpt, 420),
    content,
  } as BlogPostDraft);
  const location = cleanText(draft.location, 180);
  const automaticSeo = createAutomaticBlogSeo({
    title,
    excerpt,
    content,
    category,
    publicationType,
    location,
  } as BlogPostDraft);
  const slug = slugifyBlogTitle(cleanText(draft.slug, 110) || automaticSeo.slug);
  const scheduledAt = cleanDate(draft.scheduledAt);
  const startsAt = cleanDate(draft.startsAt);
  const endsAt = cleanDate(draft.endsAt);
  const targetCenterIds = Array.isArray(draft.targetCenterIds)
    ? [...new Set(draft.targetCenterIds.map(id => cleanText(id, 120)).filter(Boolean))].slice(0, 50)
    : [];

  if (!title) return { valid: false, error: 'Le titre de la publication est obligatoire.' };
  if (title.length < 8) return { valid: false, error: 'Le titre doit contenir au moins 8 caractères.' };
  if (!slug) return { valid: false, error: 'L’URL de la publication est invalide.' };
  if (endsAt && startsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { valid: false, error: 'La date de fin doit être postérieure à la date de début.' };
  }
  if (status === 'scheduled' && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
    return { valid: false, error: 'Choisissez une date de publication future.' };
  }
  if (
    (status === 'published' || status === 'scheduled')
    && endsAt
    && new Date(endsAt) <= (status === 'scheduled' && scheduledAt ? new Date(scheduledAt) : new Date())
  ) {
    return { valid: false, error: 'La date de fin doit être postérieure à la mise en ligne.' };
  }

  if (status === 'published' || status === 'scheduled') {
    if (excerpt.length < 80) {
      return { valid: false, error: 'Le résumé doit contenir au moins 80 caractères avant publication.' };
    }
    if (!cleanText(draft.coverImageUrl, 1200)) {
      return { valid: false, error: 'Une image principale est obligatoire avant publication.' };
    }
    if (content.length < 2) {
      return { valid: false, error: 'Ajoutez au moins deux sections de contenu avant publication.' };
    }
    if ((publicationType === 'promotion' || publicationType === 'event') && !endsAt) {
      return { valid: false, error: 'Indiquez une date de fin pour éviter une publication périmée.' };
    }
    if (publicationType === 'event' && !startsAt) {
      return { valid: false, error: 'Indiquez la date de début de l’événement.' };
    }
  }

  return {
    valid: true,
    data: {
      title,
      slug,
      excerpt,
      publicationType,
      category,
      tags: automaticSeo.tags,
      targetCenterIds,
      coverImageUrl: cleanText(draft.coverImageUrl, 1200),
      coverImageAlt: cleanText(draft.coverImageAlt, 180) || 'Illustration de ' + title,
      authorName: cleanText(draft.authorName, 120) || 'Équipe AQ8 Algérie',
      authorRole: cleanText(draft.authorRole, 120) || 'Rédaction AQ8 Algérie',
      reviewerName: cleanText(draft.reviewerName, 120),
      content,
      ctaLabel: cleanText(draft.ctaLabel, 80) || getBlogPublicationType(publicationType).defaultCtaLabel,
      ctaUrl: normalizeBlogCtaUrl(draft.ctaUrl),
      startsAt,
      endsAt,
      location,
      scheduledAt,
      seoTitle: automaticSeo.seoTitle,
      seoDescription: automaticSeo.seoDescription,
      status,
      featured: draft.featured === true,
      readingTimeMinutes: estimateBlogReadingTime(content),
      publishedAt: cleanDate(draft.publishedAt),
    },
  };
}
