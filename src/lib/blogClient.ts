import { auth } from './firebase';
import type { BlogPost, BlogPostDraft } from './blog';

type BlogApiResponse = {
  ok?: boolean;
  post?: BlogPost;
  posts?: BlogPost[];
  error?: string;
};

async function getCrmToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Session Super Admin introuvable. Reconnectez-vous au CRM.');
  }
  return user.getIdToken();
}

async function callBlogApi(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  query = '',
): Promise<BlogApiResponse> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`/api/blog-posts${query}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null) as BlogApiResponse | null;
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || `Opération éditoriale refusée (${response.status}).`);
  }
  return payload;
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const response = await fetch('/api/blog-posts', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await response.json().catch(() => null) as BlogApiResponse | null;
    return payload?.posts || [];
  } catch (err) {
    console.warn('[blogClient] listBlogPosts fallback error:', err);
    return [];
  }
}

export async function createBlogPost(post: BlogPostDraft): Promise<BlogPost> {
  const response = await callBlogApi('POST', { post });
  if (!response.post) throw new Error('Article créé mais réponse serveur incomplète.');
  return response.post;
}

export async function updateBlogPost(id: string, post: BlogPostDraft): Promise<BlogPost> {
  const response = await callBlogApi('PATCH', { id, post });
  if (!response.post) throw new Error('Article mis à jour mais réponse serveur incomplète.');
  return response.post;
}

export async function deleteBlogPost(id: string): Promise<void> {
  await callBlogApi('DELETE', undefined, `?id=${encodeURIComponent(id)}`);
}

const MAX_BLOG_IMAGE_BYTES = 6 * 1024 * 1024;
const BLOG_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadBlogImage(
  postId: string,
  file: File,
  usage: 'cover' | 'content',
): Promise<string> {
  if (!BLOG_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error('Formats acceptés : JPG, PNG ou WebP.');
  }
  if (file.size <= 0 || file.size > MAX_BLOG_IMAGE_BYTES) {
    throw new Error('L’image doit peser moins de 6 Mo.');
  }

  const token = await getCrmToken();
  const formData = new FormData();
  formData.set('postId', postId);
  formData.set('usage', usage);
  formData.set('file', file);

  const response = await fetch('/api/upload-blog-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    imageUrl?: string;
    error?: string;
  } | null;
  if (!response.ok || payload?.ok !== true || !payload.imageUrl) {
    throw new Error(payload?.error || `Téléversement refusé (${response.status}).`);
  }
  return payload.imageUrl;
}
